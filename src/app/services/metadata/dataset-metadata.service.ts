import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {ValidationSchemaFetcherService, SchemaConfig} from '../validation/validation-schema-fetcher.service';
import {SchemaParserUtil} from '../validation/schema-parser.util';
import {seedEnumFieldsFromSchema} from '../../models/enum-fields';
import * as schemaConfigs from '../../codegen/schemas.json';
import * as formLayout from '../../codegen/form-layout.json';
import {DataProductType, DEFAULT_DATA_PRODUCT_TYPE, DATA_PRODUCT_TYPE_REGISTRY} from '../../models/data-product-type';

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
	private activeType: DataProductType = DEFAULT_DATA_PRODUCT_TYPE;

	constructor(private readonly schemaFetcher: ValidationSchemaFetcherService) {
		// Build dataset form metadata by default (back-compat); the modify form requests a
		// specific type via loadForType() when editing a non-dataset product (#221).
		this.loadForType(DEFAULT_DATA_PRODUCT_TYPE);
	}

	/**
	 * Build form metadata for a given product type from its runtime-fetched schema (single source
	 * of truth) merged with the per-type step layout. Defaults to 'dataset'.
	 */
	loadForType(type: DataProductType = DEFAULT_DATA_PRODUCT_TYPE): void {
		const config = this.schemaConfigForType(type);
		if (!config) {
			this.metadata$.next(null);
			return;
		}
		this.activeType = type;
		this.schemaFetcher.fetchSchema(config).subscribe({
			next: schema => this.metadata$.next(this.parseSchema(schema, type)),
			error: error => {
				// Leave metadata null so the form does not build; the schema load error is
				// surfaced to the user via ValidationSchemaService.
				console.error(`Failed to load ${type} schema for form metadata:`, error);
				this.metadata$.next(null);
			}
		});
	}

	getActiveType(): DataProductType {
		return this.activeType;
	}

	// Build a fetch config for the type's product schema, reusing the base config's repo/branch.
	private schemaConfigForType(type: DataProductType): SchemaConfig | null {
		const configs = (schemaConfigs as any).default as SchemaConfig[];
		const base = configs.find(c => c.id === 'base');
		if (!base) {
			console.error('No "base" schema configured; cannot build form metadata.');
			return null;
		}
		if (type === DEFAULT_DATA_PRODUCT_TYPE) {
			return base; // base config already points at the dataset schema
		}
		return {...base, id: type, name: type, path: DATA_PRODUCT_TYPE_REGISTRY[type].schemaPath};
	}

	// Step grouping/order come from the augmentation overlay (config/form-layout.yaml →
	// codegen/form-layout.json), per product type. Field types/enums/validation come from the schema.
	private stepsForType(type: DataProductType): StepConfiguration[] {
		const layout = ((formLayout as any).default ?? formLayout) as Record<string, {steps: StepConfiguration[]}>;
		return (layout[type]?.steps ?? layout[DEFAULT_DATA_PRODUCT_TYPE].steps) as StepConfiguration[];
	}

	private parseSchema(schema: any, type: DataProductType): DatasetMetadataConfig {
		const steps = this.stepsForType(type);
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
				validators: SchemaParserUtil.generateValidators(key, prop, requiredFields.includes(key)),
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
			const step = steps.find(s => s.fields.includes(key));
			if (step) {
				fieldMetadata.step = step.id;
				fieldMetadata.group = step.key;
			}

			fields.set(key, fieldMetadata);
		});

		return {
			fields,
			steps,
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
