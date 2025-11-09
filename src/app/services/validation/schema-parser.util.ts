import {Validators, ValidatorFn} from '@angular/forms';

export interface ParsedSchemaField {
	key: string;
	required: boolean;
	validators: ValidatorFn[];
	type: string;
	pattern?: string;
	minLength?: number;
	maxLength?: number;
	multilingualFields?: string[];
	customMessage?: string;
}

export interface ParsedValidationSchema {
	requiredFields: string[];
	recommendedFields: string[];
	fields: Map<string, ParsedSchemaField>;
}

/**
 * Utility class for parsing JSON schemas into validation configurations
 */
export class SchemaParserUtil {
	/**
	 * Parse a JSON schema into a validation schema
	 */
	static parseSchema(jsonSchema: any): ParsedValidationSchema {
		const requiredFields = jsonSchema.required || [];
		const recommendedFields = jsonSchema.recommended || [];
		const fields = new Map<string, ParsedSchemaField>();

		// Parse each property from the schema
		Object.entries(jsonSchema.properties || {}).forEach(([key, prop]: [string, any]) => {
			const isRequired = requiredFields.includes(key);
			const fieldData: ParsedSchemaField = {
				key,
				required: isRequired,
				validators: this.generateValidators(key, prop, isRequired),
				type: this.getFieldType(prop),
				pattern: prop.pattern,
				minLength: prop.minLength,
				maxLength: prop.maxLength
			};

			// Check for multilingual fields
			if (prop.type === 'object' && prop.properties) {
				const langKeys = Object.keys(prop.properties);
				if (langKeys.some(k => ['de', 'fr', 'it', 'en'].includes(k))) {
					fieldData.multilingualFields = langKeys;

					// Check if specific languages are required
					const requiredLangs = prop.required || [];
					if (requiredLangs.length > 0) {
						fieldData.customMessage = this.createMultilingualMessage(key, requiredLangs, prop);
						fieldData.validators.push(this.createMultilingualValidator(requiredLangs, prop));
					}
				}
			}

			fields.set(key, fieldData);
		});

		return {
			requiredFields,
			recommendedFields,
			fields
		};
	}

	/**
	 * Get the field type from schema property
	 */
	private static getFieldType(prop: any): string {
		if (prop.type === 'array') return 'array';
		if (prop.type === 'object') return 'object';
		if (prop.type === 'boolean') return 'boolean';
		if (prop.type === 'number' || prop.type === 'integer') return 'number';
		if (prop.format === 'date') return 'date';
		if (prop.format === 'uri' || prop.format === 'url') return 'url';
		if (prop.enum) return 'enum';
		return 'string';
	}

	/**
	 * Generate validators based on schema property definition
	 */
	private static generateValidators(key: string, prop: any, isRequired: boolean): ValidatorFn[] {
		const validators: ValidatorFn[] = [];

		if (isRequired) {
			validators.push(Validators.required);
		}

		// Email validation for contact point
		if (key === 'schema:email' || prop.format === 'email') {
			validators.push(Validators.email);
		}

		// URL validation
		if (prop.format === 'uri' || prop.format === 'url') {
			validators.push(Validators.pattern(/^https?:\/\/.+/));
		}

		// Pattern validation
		if (prop.pattern) {
			validators.push(Validators.pattern(prop.pattern));
		}

		// Min/max length validation
		if (prop.minLength) {
			validators.push(Validators.minLength(prop.minLength));
		}
		if (prop.maxLength) {
			validators.push(Validators.maxLength(prop.maxLength));
		}

		return validators;
	}

	/**
	 * Create multilingual validator for object properties
	 */
	private static createMultilingualValidator(requiredLangs: string[], prop: any): ValidatorFn {
		return (control: any): any => {
			if (!control.value) return null;

			const missingLanguages = requiredLangs.filter(lang => {
				const langValue = control.value[lang];
				if (!langValue) return true;

				// Check if there's a pattern requirement for this language
				const langProp = prop.properties?.[lang];
				if (langProp?.pattern) {
					const pattern = new RegExp(langProp.pattern);
					return !pattern.test(langValue);
				}

				return false;
			});

			if (missingLanguages.length > 0) {
				const firstLangProp = prop.properties?.[requiredLangs[0]];
				const patternInfo = firstLangProp?.pattern ? this.extractPatternInfo(firstLangProp.pattern) : '';

				return {
					multilingualRequired: {
						missingLanguages,
						requiredPattern: patternInfo
					}
				};
			}

			return null;
		};
	}

	/**
	 * Create human-readable message for multilingual validation
	 */
	private static createMultilingualMessage(fieldKey: string, requiredLangs: string[], prop: any): string {
		const langNames = requiredLangs.map(lang => lang.toUpperCase()).join(' and ');
		const firstLangProp = prop.properties?.[requiredLangs[0]];

		if (firstLangProp?.pattern) {
			const patternInfo = this.extractPatternInfo(firstLangProp.pattern);
			return `${fieldKey} must have ${langNames} text${patternInfo ? ` (${patternInfo})` : ''}`;
		}

		return `${fieldKey} must have ${langNames} text`;
	}

	/**
	 * Extract human-readable pattern information
	 */
	private static extractPatternInfo(pattern: string): string {
		// Common pattern interpretations
		if (pattern === '[a-zA-Z0-9_\\-\\s]{10,75}') {
			return '10-75 characters, alphanumeric and spaces only';
		}
		if (pattern.includes('{10,75}')) {
			return '10-75 characters';
		}
		return '';
	}
}