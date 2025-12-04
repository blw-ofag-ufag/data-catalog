import {Injectable} from '@angular/core';
import {FormlyFieldConfig} from '@ngx-formly/core';
import {FormlyJsonschema} from '@ngx-formly/core/json-schema';
import {ValidationSchemaService, ValidationSchemaType} from '../validation/validation-schema.service';
import {DatasetMetadataService} from '../metadata/dataset-metadata.service';
import {
	AccessRights,
	AccrualPeriocicites,
	CategorizationsDSG,
	ClassificationLevels,
	DataTypes,
	DatasetAvailabilities,
	DatasetThemes,
	Publishers,
	Statuses
} from '../../models/schemas/dataset';

@Injectable({
	providedIn: 'root'
})
export class SchemaToFormlyService {
	// Fields to always ignore (auto-generated)
	private readonly ignoredFields = ['dct:identifier'];

	// Field type mappings
	private readonly fieldTypeMap: Record<string, string> = {
		'dct:title': 'multilingual',
		'dct:description': 'multilingual',
		'dcat:keyword': 'keyword-array',
		'dcat:theme': 'theme-select',
		'dct:accessRights': 'enum-select',
		'bv:classification': 'enum-select',
		'bv:personalData': 'enum-select',
		'bv:availability': 'enum-select',
		'dct:publisher': 'enum-select',
		'dcat:distribution': 'distribution',
		'bv:affiliatedPersons': 'affiliated-persons',
		'dct:issued': 'date',
		'dct:modified': 'date',
		'dct:temporal': 'date-range',
		'adms:status': 'enum-select',
		'dct:accrualPeriodicity': 'enum-select',
		'bv:dataType': 'enum-select'
	};

	// Enum options mapping
	private readonly enumOptionsMap: Record<string, any[]> = {
		'dct:publisher': Publishers,
		'dct:accessRights': AccessRights,
		'adms:status': Statuses,
		'bv:classification': ClassificationLevels,
		'bv:personalData': CategorizationsDSG,
		'bv:availability': DatasetAvailabilities,
		'dcat:theme': DatasetThemes,
		'dct:accrualPeriodicity': AccrualPeriocicites,
		'bv:dataType': DataTypes
	};

	// Translation paths for enum fields
	private readonly translationPathMap: Record<string, string> = {
		'dct:accessRights': 'choices.dataset.dct:accessRights',
		'bv:classification': 'choices.dataset.bv:classification',
		'bv:personalData': 'choices.dataset.bv:personalData',
		'bv:availability': 'choices.dataset.bv:availability',
		'dct:publisher': 'choices.dataset.dct:publisher',
		'adms:status': 'choices.dataset.adms:status',
		'dct:accrualPeriodicity': 'choices.dataset.dct:accrualPeriodicity',
		'bv:dataType': 'choices.dataset.bv:dataType'
	};

	constructor(
		private readonly validationSchemaService: ValidationSchemaService,
		private readonly metadataService: DatasetMetadataService
	) {}

	/**
	 * Get Formly field configurations organized by stepper steps
	 */
	async getStepperFieldConfigs(): Promise<StepperFieldConfig[]> {
		const metadata = await this.metadataService.getMetadata().toPromise();
		if (!metadata) {
			return this.getDefaultStepperConfig();
		}

		const steps: StepperFieldConfig[] = [];

		// Organize fields by sections based on metadata
		const sections = this.organizeBySections(metadata);

		sections.forEach(section => {
			const fields: FormlyFieldConfig[] = [];

			section.fields.forEach(fieldKey => {
				// Skip ignored fields
				if (this.ignoredFields.includes(fieldKey)) {
					return;
				}

				const fieldConfig = this.createFieldConfig(fieldKey, metadata[fieldKey]);
				if (fieldConfig) {
					fields.push(fieldConfig);
				}
			});

			if (fields.length > 0) {
				steps.push({
					label: section.label,
					fields: fields
				});
			}
		});

		return steps;
	}

	/**
	 * Create field configuration for a single field
	 */
	private createFieldConfig(fieldKey: string, fieldMetadata: any): FormlyFieldConfig | null {
		const fieldType = this.fieldTypeMap[fieldKey] || 'text';

		const config: FormlyFieldConfig = {
			key: fieldKey,
			type: fieldType,
			props: {
				label: `labels.${fieldKey}`,
				placeholder: `modify.auth.form.placeholders.${fieldKey.split(':')[1]}`,
				required: false,
				recommended: false
			}
		};

		// Apply field-specific configurations
		this.applyFieldSpecificConfig(fieldKey, config);

		// Apply validation from schema
		this.applySchemaValidation(fieldKey, config);

		return config;
	}

	/**
	 * Apply field-specific configurations
	 */
	private applyFieldSpecificConfig(fieldKey: string, config: FormlyFieldConfig): void {
		switch (fieldKey) {
			case 'dct:title':
				config.props = {
					...config.props,
					requiredLanguages: ['de', 'fr']
					// Pattern, minLength, maxLength come from schema
				};
				config.validators = {
					validation: ['multilingual-required']
				};
				break;

			case 'dct:description':
				config.props = {
					...config.props,
					requiredLanguages: ['de', 'fr'],
					textarea: true
					// maxLength comes from schema
				};
				config.validators = {
					validation: ['multilingual-required']
				};
				break;

			case 'dct:accessRights':
			case 'bv:classification':
			case 'bv:personalData':
			case 'bv:availability':
			case 'dct:publisher':
			case 'adms:status':
			case 'dct:accrualPeriodicity':
			case 'bv:dataType':
				config.props = {
					...config.props,
					options: this.enumOptionsMap[fieldKey] || [],
					translationPath: this.translationPathMap[fieldKey]
				};
				break;

			case 'dct:issued':
			case 'dct:modified':
				config.props = {
					...config.props,
					maxDate: new Date() // Can't be in the future
				};
				break;

			case 'dct:conformsTo':
				// This field has dynamic requirements based on external catalogs
				config.expressions = {
					'props.required': (field) => {
						const model = field.model;
						return model?.['bv:externalCatalogs']?.includes('I14Y') ||
							model?.['bv:externalCatalogs']?.includes('opendata.swiss');
					},
					'props.description': (field) => {
						const model = field.model;
						if (model?.['bv:externalCatalogs']?.includes('I14Y')) {
							return 'This field is required for I14Y compliance';
						}
						if (model?.['bv:externalCatalogs']?.includes('opendata.swiss')) {
							return 'This field is required for OpenData.swiss compliance';
						}
						return null;
					}
				};
				break;
		}
	}

	/**
	 * Apply validation from schemas
	 */
	private applySchemaValidation(fieldKey: string, config: FormlyFieldConfig): void {
		const baseSchema = this.validationSchemaService.getSchema('base');
		if (!baseSchema) return;

		const fieldValidation = baseSchema.fields[fieldKey];
		if (!fieldValidation) return;

		// Set required/recommended based on base schema
		config.props.required = fieldValidation.required;

		// Add validators if present
		if (fieldValidation.pattern) {
			config.props.pattern = fieldValidation.pattern;
		}
		if (fieldValidation.minLength) {
			config.props.minLength = fieldValidation.minLength;
		}
		if (fieldValidation.maxLength) {
			config.props.maxLength = fieldValidation.maxLength;
		}
	}

	/**
	 * Apply dynamic validation for a specific schema type
	 */
	applyDynamicSchemaValidation(fields: FormlyFieldConfig[], schemaType: ValidationSchemaType): void {
		const schema = this.validationSchemaService.getSchema(schemaType);
		if (!schema) return;

		fields.forEach(field => {
			if (!field.key || this.ignoredFields.includes(field.key)) return;

			const fieldValidation = schema.fields[field.key];
			if (!fieldValidation) return;

			// Update field requirements based on schema
			if (fieldValidation.required) {
				field.props = {
					...field.props,
					required: true
				};
			}

			// Add additional validators
			if (fieldValidation.pattern && !field.props.pattern) {
				field.props.pattern = fieldValidation.pattern;
			}
			if (fieldValidation.minLength && !field.props.minLength) {
				field.props.minLength = fieldValidation.minLength;
			}
			if (fieldValidation.maxLength && !field.props.maxLength) {
				field.props.maxLength = fieldValidation.maxLength;
			}
		});
	}

	/**
	 * Remove dynamic validation for a specific schema type
	 */
	removeDynamicSchemaValidation(fields: FormlyFieldConfig[], schemaType: ValidationSchemaType): void {
		const baseSchema = this.validationSchemaService.getSchema('base');
		if (!baseSchema) return;

		fields.forEach(field => {
			if (!field.key || this.ignoredFields.includes(field.key)) return;

			// Reset to base schema requirements
			const baseValidation = baseSchema.fields[field.key];
			if (baseValidation) {
				field.props = {
					...field.props,
					required: baseValidation.required
				};
			} else {
				field.props = {
					...field.props,
					required: false
				};
			}
		});
	}

	/**
	 * Organize fields by sections
	 */
	private organizeBySections(metadata: any): SectionConfig[] {
		// Default section organization
		return [
			{
				label: 'modify.auth.form.sections.basic',
				fields: ['dct:title', 'dct:description', 'dcat:keyword', 'dcat:theme']
			},
			{
				label: 'modify.auth.form.sections.access',
				fields: ['dct:accessRights', 'bv:classification', 'bv:personalData', 'bv:availability']
			},
			{
				label: 'modify.auth.form.sections.publisher',
				fields: ['dct:publisher', 'bv:affiliatedPersons', 'dcat:contactPoint']
			},
			{
				label: 'modify.auth.form.sections.temporal',
				fields: ['dct:issued', 'dct:modified', 'dct:temporal', 'dct:accrualPeriodicity']
			},
			{
				label: 'modify.auth.form.sections.distribution',
				fields: ['dcat:distribution']
			},
			{
				label: 'modify.auth.form.sections.metadata',
				fields: ['adms:status', 'dct:conformsTo', 'bv:dataType', 'bv:externalCatalogs']
			}
		];
	}

	/**
	 * Get default stepper configuration
	 */
	private getDefaultStepperConfig(): StepperFieldConfig[] {
		return [
			{
				label: 'modify.auth.form.sections.basic',
				fields: [
					this.createFieldConfig('dct:title', {}),
					this.createFieldConfig('dct:description', {})
				].filter(f => f !== null) as FormlyFieldConfig[]
			}
		];
	}
}

interface StepperFieldConfig {
	label: string;
	fields: FormlyFieldConfig[];
}

interface SectionConfig {
	label: string;
	fields: string[];
}