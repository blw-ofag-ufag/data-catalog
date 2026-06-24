import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {Validators} from '@angular/forms';

import {ValidationSchemaFetcherService, SchemaConfig} from '../validation/validation-schema-fetcher.service';
import {seedEnumFieldsFromSchema} from '../../models/enum-fields';
import * as schemaConfigs from '../../codegen/schemas.json';

// Shared empty options array so template bindings get a stable reference.
const EMPTY_OPTIONS: string[] = [];

export interface FieldMetadata {
	key: string;
	required: boolean;
	recommended: boolean;
	type: string;
	label: string;
	description?: string;
	step?: number;
	group?: string;
	displayInDetails?: boolean;
	displayOrder?: number;
	validators?: any[];
	enum?: string[];
	format?: string;
	multilingualFields?: string[]; // For fields like dct:title that have de/fr/it/en
}

export interface StepConfiguration {
	id: number;
	key: string;
	label: string;
	fields: string[];
}

export interface DatasetMetadataConfig {
	fields: Map<string, FieldMetadata>;
	steps: StepConfiguration[];
	requiredFields: string[];
}

@Injectable({
	providedIn: 'root'
})
export class DatasetMetadataService {
	private readonly metadata$ = new BehaviorSubject<DatasetMetadataConfig | null>(null);
	private readonly stepConfig: StepConfiguration[] = [
		{
			id: 1,
			key: 'basic',
			label: 'modify.auth.form.sections.basic',
			fields: ['dct:title', 'dct:description', 'dcat:keyword', 'dcat:theme']
		},
		{
			id: 2,
			key: 'access',
			label: 'modify.auth.form.sections.access',
			fields: ['dct:accessRights', 'bv:classification', 'bv:personalData', 'adms:status']
		},
		{
			id: 3,
			key: 'publisher',
			label: 'modify.auth.form.sections.publisher',
			fields: ['dct:publisher', 'dcat:contactPoint']
		},
		{
			id: 4,
			key: 'metadata',
			label: 'modify.auth.form.sections.metadata',
			fields: ['dct:issued', 'dct:modified', 'dcat:version', 'dct:accrualPeriodicity', 'bv:typeOfData', 'bv:archivalValue']
		},
		{
			id: 5,
			key: 'governance',
			label: 'modify.auth.form.sections.governance',
			fields: ['prov:qualifiedAttribution']
		},
		{
			id: 6,
			key: 'external',
			label: 'modify.auth.form.sections.external',
			fields: ['bv:externalCatalogs', 'dcat:landingPage']
		},
		{
			id: 7,
			key: 'coverage',
			label: 'modify.auth.form.sections.coverage',
			fields: ['dct:spatial', 'dct:temporal', 'dcatap:applicableLegislation']
		},
		{
			id: 8,
			key: 'additional',
			label: 'modify.auth.form.sections.additional',
			fields: ['schema:comment', 'bv:geoIdentifier', 'schema:image', 'bv:abrogation', 'prov:wasDerivedFrom', 'dcat:inSeries', 'dct:replaces']
		},
		{
			id: 9,
			key: 'distributions',
			label: 'modify.auth.form.sections.distributions',
			fields: ['dcat:distribution']
		}
	];

	constructor(private readonly schemaFetcher: ValidationSchemaFetcherService) {
		this.initializeMetadata();
	}

	private initializeMetadata(): void {
		// Build form metadata from the runtime-fetched base schema (single source of
		// truth), rather than a static local copy. The fetcher caches per config id,
		// so this shares the same request as ValidationSchemaService.
		const configs = (schemaConfigs as any).default as SchemaConfig[];
		const baseConfig = configs.find(c => c.id === 'base');
		if (!baseConfig) {
			console.error('No "base" schema configured; cannot build form metadata.');
			this.metadata$.next(null);
			return;
		}

		this.schemaFetcher.fetchSchema(baseConfig).subscribe({
			next: schema => this.metadata$.next(this.parseSchema(schema)),
			error: error => {
				// Leave metadata null so the form does not build; the schema load
				// error is surfaced to the user via ValidationSchemaService.
				console.error('Failed to load base schema for form metadata:', error);
				this.metadata$.next(null);
			}
		});
	}

	private parseSchema(schema: any): DatasetMetadataConfig {
		// Re-derive enum-field classification (enumTypes/enumArrayFields) from the
		// authoritative runtime schema.
		seedEnumFieldsFromSchema(schema);

		const fields = new Map<string, FieldMetadata>();
		const requiredFields = schema.required || [];
		const recommendedFields = schema.recommended || [];

		// Parse each property from the schema
		Object.entries(schema.properties || {}).forEach(([key, prop]: [string, any]) => {
			// Enum option lists come from the schema. Scalar enums live on `enum`;
			// array enums (e.g. dcat:theme) live on `items.enum`.
			const optionList: string[] | undefined = prop.enum || prop.items?.enum;
			const fieldMetadata: FieldMetadata = {
				key,
				required: requiredFields.includes(key),
				recommended: recommendedFields.includes(key),
				type: this.getFieldType(prop),
				label: `labels.${key}`,
				description: prop.description,
				validators: this.generateValidators(key, prop, requiredFields.includes(key)),
				enum: optionList?.filter((e: string) => e !== ''), // Filter out empty string from enums
				format: prop.format
			};

			// Check for multilingual fields
			if (prop.type === 'object' && prop.properties) {
				const langKeys = Object.keys(prop.properties);
				if (langKeys.some(k => ['de', 'fr', 'it', 'en'].includes(k))) {
					fieldMetadata.multilingualFields = langKeys;
				}
			}

			// Determine which fields should be displayed in details page
			fieldMetadata.displayInDetails = this.shouldDisplayInDetails(key);

			// Assign to step
			const step = this.findStepForField(key);
			if (step) {
				fieldMetadata.step = step.id;
				fieldMetadata.group = step.key;
			}

			fields.set(key, fieldMetadata);
		});

		return {
			fields,
			steps: this.stepConfig,
			requiredFields
		};
	}

	private getFieldType(prop: any): string {
		if (prop.type === 'array') return 'array';
		if (prop.type === 'object') return 'object';
		if (prop.type === 'boolean') return 'boolean';
		if (prop.type === 'number' || prop.type === 'integer') return 'number';
		if (prop.format === 'date') return 'date';
		if (prop.format === 'uri' || prop.format === 'url') return 'url';
		if (prop.enum) return 'enum';
		return 'string';
	}

	// TODO(08-schema): this duplicates SchemaParserUtil's validator generation used by
	// ValidationSchemaService. Both now parse the same runtime schema. Consolidate by
	// deferring form-field validators to ValidationSchemaService once the form-build /
	// validation interplay (modify.component.applySchemaValidation) is safe to simplify.
	private generateValidators(key: string, prop: any, isRequired: boolean): any[] {
		const validators: any[] = [];

		// For multilingual fields, don't apply validators here - they'll be handled by the component
		if (prop.type === 'object' && prop.properties &&
		    Object.keys(prop.properties).some(k => ['de', 'fr', 'it', 'en'].includes(k))) {
			// Skip validators for multilingual fields - handled by MultilingualTextFieldComponent
			if (isRequired) {
				validators.push(Validators.required);
			}
			return validators;
		}

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

		// Min/max length if specified
		if (prop.minLength) {
			validators.push(Validators.minLength(prop.minLength));
		}
		if (prop.maxLength) {
			validators.push(Validators.maxLength(prop.maxLength));
		}

		// Pattern if specified
		if (prop.pattern) {
			validators.push(Validators.pattern(prop.pattern));
		}

		return validators;
	}

	private shouldDisplayInDetails(key: string): boolean {
		// These fields are typically not shown in the details metadata section
		const excludedFromDetails = [
			'schema:image',
			'dct:identifier',
			'dct:title',
			'dct:description',
			'dct:publisher',
			'prov:qualifiedAttribution',
			'dcat:distribution',
			'schemaViolations',
			'schemaViolationMessages',
			'bv:externalCatalogs'
		];

		return !excludedFromDetails.some(excluded => key.startsWith(excluded));
	}

	private findStepForField(key: string): StepConfiguration | undefined {
		return this.stepConfig.find(step => step.fields.includes(key));
	}

	// Public methods
	getMetadata(): Observable<DatasetMetadataConfig | null> {
		return this.metadata$.asObservable();
	}

	getFieldMetadata(key: string): Observable<FieldMetadata | undefined> {
		return this.metadata$.pipe(map(config => config?.fields.get(key)));
	}

	getStepFields(stepId: number): Observable<FieldMetadata[]> {
		return this.metadata$.pipe(
			map(config => {
				if (!config) return [];
				const step = config.steps.find(s => s.id === stepId);
				if (!step) return [];

				return step.fields.map(fieldKey => config.fields.get(fieldKey)).filter((field): field is FieldMetadata => field !== undefined);
			})
		);
	}

	getRequiredFields(): Observable<string[]> {
		return this.metadata$.pipe(map(config => config?.requiredFields || []));
	}

	isFieldRequired(key: string): Observable<boolean> {
		return this.metadata$.pipe(map(config => config?.requiredFields.includes(key) || false));
	}

	isFieldRecommended(key: string): Observable<boolean> {
		return this.metadata$.pipe(
			map(config => {
				const field = config?.fields.get(key);
				return field?.recommended || false;
			})
		);
	}

	getSteps(): Observable<StepConfiguration[]> {
		return this.metadata$.pipe(map(config => config?.steps || []));
	}

	// Get validators for a specific field
	getFieldValidators(key: string): any[] {
		const config = this.metadata$.value;
		if (!config) return [];

		const field = config.fields.get(key);
		return field?.validators || [];
	}

	// Get the schema-derived enum option list for a field (empty-string filtered).
	// Returns a stable [] when the field has no options or metadata is not loaded yet.
	getEnumOptions(key: string): string[] {
		const field = this.metadata$.value?.fields.get(key);
		return field?.enum ?? EMPTY_OPTIONS;
	}

	// Get all field metadata for form generation
	getAllFields(): Observable<FieldMetadata[]> {
		return this.metadata$.pipe(
			map(config => {
				if (!config) return [];
				return Array.from(config.fields.values());
			})
		);
	}

	// Get the current metadata config value synchronously
	getMetadataValue(): DatasetMetadataConfig | null {
		return this.metadata$.value;
	}

	// Get fields for details page display
	getDetailsFields(): Observable<FieldMetadata[]> {
		return this.metadata$.pipe(
			map(config => {
				if (!config) return [];
				return Array.from(config.fields.values())
					.filter(field => field.displayInDetails)
					.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
			})
		);
	}
}
