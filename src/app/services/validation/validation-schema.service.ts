import {Injectable} from '@angular/core';
import {AbstractControl, ValidatorFn} from '@angular/forms';
import {TranslateService} from '@ngx-translate/core';
import {ParsedValidationSchema, SchemaParserUtil} from './schema-parser.util';

// Import the JSON schemas
import * as baseDatasetSchema from '../../models/schemas/validation/base-dataset.json';
import * as i14yDatasetSchema from '../../models/schemas/validation/i14y-dataset.json';
import * as odsDatasetSchema from '../../models/schemas/validation/ods-dataset.json';

export type ValidationSchemaType = 'base' | 'i14y' | 'ods';

export interface ValidationRule {
	required: boolean;
	validators: ValidatorFn[];
	pattern?: string;
	minLength?: number;
	maxLength?: number;
	customMessage?: string;
}

export interface FieldValidationGroup {
	[fieldKey: string]: ValidationRule;
}

export interface ValidationSchema {
	id: ValidationSchemaType;
	name: string;
	color: string;
	alertType: 'info' | 'warning' | 'error';
	fields: FieldValidationGroup;
	parsedSchema: ParsedValidationSchema;
}

@Injectable({
	providedIn: 'root'
})
export class ValidationSchemaService {
	private readonly schemas: Map<ValidationSchemaType, ValidationSchema> = new Map();

	constructor(private readonly translateService: TranslateService) {
		this.initializeSchemas();
	}

	/**
	 * Get validation schema by type
	 */
	getSchema(type: ValidationSchemaType): ValidationSchema | undefined {
		return this.schemas.get(type);
	}

	/**
	 * Get all available schemas
	 */
	getAllSchemas(): ValidationSchema[] {
		return Array.from(this.schemas.values());
	}

	/**
	 * Get validation rules for a specific field in a schema
	 */
	getFieldValidation(schemaType: ValidationSchemaType, fieldKey: string): ValidationRule | undefined {
		const schema = this.schemas.get(schemaType);
		return schema?.fields[fieldKey];
	}

	/**
	 * Get combined validators for a field across multiple active schemas
	 */
	getCombinedValidators(fieldKey: string, activeSchemas: ValidationSchemaType[]): ValidatorFn[] {
		const allValidators: ValidatorFn[] = [];

		activeSchemas.forEach(schemaType => {
			const fieldValidation = this.getFieldValidation(schemaType, fieldKey);
			if (fieldValidation) {
				allValidators.push(...fieldValidation.validators);
			}
		});

		return allValidators;
	}

	/**
	 * Check if field is required in any of the active schemas
	 */
	isFieldRequired(fieldKey: string, activeSchemas: ValidationSchemaType[]): boolean {
		return activeSchemas.some(schemaType => {
			const fieldValidation = this.getFieldValidation(schemaType, fieldKey);
			return fieldValidation?.required || false;
		});
	}

	/**
	 * Get validation errors for a specific schema
	 */
	getSchemaValidationErrors(schemaType: ValidationSchemaType, formValue: unknown): string[] {
		const schema = this.schemas.get(schemaType);
		if (!schema) return [];

		const errors: string[] = [];

		Object.entries(schema.fields).forEach(([fieldKey, validation]) => {
			if (validation.required) {
				const fieldValue = this.getNestedFieldValue(formValue, fieldKey);
				if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
					const fieldName = this.getTranslatedFieldName(fieldKey);
					errors.push(validation.customMessage || `${fieldName} is required for ${schema.name}`);
				}
			}
		});

		return errors;
	}

	/**
	 * Get filtered validation errors for a schema (excluding fields already covered by base schema)
	 */
	getFilteredSchemaValidationErrors(schemaType: ValidationSchemaType, formValue: unknown): string[] {
		if (schemaType === 'base') {
			// For base schema, show all errors
			return this.getSchemaValidationErrors(schemaType, formValue);
		}

		const schema = this.schemas.get(schemaType);
		const baseSchema = this.schemas.get('base');
		if (!schema || !baseSchema) return [];

		const errors: string[] = [];

		// For additional schemas (i14y, ods), show errors for fields that:
		// 1. Are required in this schema but not required in base schema, OR
		// 2. Have additional validation beyond base requirements
		Object.entries(schema.fields).forEach(([fieldKey, validation]) => {
			const baseValidation = baseSchema.fields[fieldKey];
			const isRequiredInBase = baseValidation?.required || false;
			const isRequiredInSchema = validation.required;

			// Check if this field is newly required or has additional validation
			const isNewlyRequired = isRequiredInSchema && !isRequiredInBase;
			const hasAdditionalValidation = validation.validators.length > 1 || validation.customMessage;

			if (isNewlyRequired || hasAdditionalValidation) {
				// Check for required field validation
				if (isRequiredInSchema) {
					const fieldValue = this.getNestedFieldValue(formValue, fieldKey);
					if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
						const fieldName = this.getTranslatedFieldName(fieldKey);
						errors.push(validation.customMessage || `${fieldName} is required for ${schema.name}`);
					}
				}

				// Check for additional validation errors (like multilingual validation)
				if (hasAdditionalValidation) {
					validation.validators.forEach(validator => {
						const fieldControl = {value: this.getNestedFieldValue(formValue, fieldKey)};
						const validationResult = validator(fieldControl as AbstractControl);
						if (validationResult) {
							const errorMessage = validation.customMessage ||
								this.getValidationErrorMessage(fieldKey, validationResult, schema.name);
							if (errorMessage && !errors.includes(errorMessage)) {
								errors.push(errorMessage);
							}
						}
					});
				}
			}
		});

		return errors;
	}

	private initializeSchemas(): void {
		// Parse base schema from JSON
		const baseParsed = SchemaParserUtil.parseSchema(baseDatasetSchema);
		this.schemas.set('base', {
			id: 'base',
			name: 'Base Requirements',
			color: '#ff9800',
			alertType: 'warning',
			fields: this.convertParsedSchemaToFields(baseParsed),
			parsedSchema: baseParsed
		});

		// Parse I14Y schema from JSON
		const i14yParsed = SchemaParserUtil.parseSchema(i14yDatasetSchema);
		this.schemas.set('i14y', {
			id: 'i14y',
			name: 'I14Y Requirements',
			color: '#0066cc',
			alertType: 'info',
			fields: this.convertParsedSchemaToFields(i14yParsed),
			parsedSchema: i14yParsed
		});

		// Parse ODS schema from JSON
		const odsParsed = SchemaParserUtil.parseSchema(odsDatasetSchema);
		this.schemas.set('ods', {
			id: 'ods',
			name: 'Open Data Swiss Requirements',
			color: '#e91e63',
			alertType: 'warning',
			fields: this.convertParsedSchemaToFields(odsParsed),
			parsedSchema: odsParsed
		});
	}

	/**
	 * Convert parsed schema fields to ValidationRule format
	 */
	private convertParsedSchemaToFields(parsedSchema: ParsedValidationSchema): FieldValidationGroup {
		const fields: FieldValidationGroup = {};

		parsedSchema.fields.forEach((fieldData, fieldKey) => {
			fields[fieldKey] = {
				required: fieldData.required,
				validators: fieldData.validators,
				pattern: fieldData.pattern,
				minLength: fieldData.minLength,
				maxLength: fieldData.maxLength,
				customMessage: fieldData.customMessage
			};
		});

		return fields;
	}

	/**
	 * Get translated field name
	 */
	private getTranslatedFieldName(fieldKey: string): string {
		const translationKey = `labels.${fieldKey}`;
		const translated = this.translateService.instant(translationKey);
		// If translation is not found, return the field key without the prefix
		return translated === translationKey ? fieldKey.replace(/^[^:]+:/, '') : translated;
	}

	/**
	 * Get human-readable error message from validation result
	 */
	private getValidationErrorMessage(fieldKey: string, validationResult: unknown, schemaName: string): string {
		const fieldName = this.getTranslatedFieldName(fieldKey);
		const result = validationResult as Record<string, unknown>;

		if (result['multilingualRequired']) {
			const error = result['multilingualRequired'] as {missingLanguages: string[]; requiredPattern?: string};
			const langText = error.missingLanguages.map((lang: string) => lang.toUpperCase()).join(', ');
			const patternText = error.requiredPattern ? ` (${error.requiredPattern})` : '';
			return `${fieldName} must have text in ${langText}${patternText}`;
		}

		if (result['required']) {
			return `${fieldName} is required for ${schemaName}`;
		}

		if (result['pattern']) {
			return `${fieldName} format is invalid for ${schemaName}`;
		}

		return `${fieldName} has validation errors for ${schemaName}`;
	}

	/**
	 * Get nested field value from form object
	 */
	private getNestedFieldValue(obj: unknown, path: string): unknown {
		return path.split('.').reduce((current, key) => (current as Record<string, unknown>)?.[key], obj);
	}
}