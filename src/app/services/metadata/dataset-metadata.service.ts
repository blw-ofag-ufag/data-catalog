import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';

import {SchemaConfig, ValidationSchemaFetcherService} from '../validation/validation-schema-fetcher.service';
import {SchemaParserUtil} from '../validation/schema-parser.util';
import {seedEnumFieldsFromSchema} from '../../models/enum-fields';
import * as schemaConfigs from '../../codegen/schemas.json';
import * as formLayout from '../../codegen/form-layout.json';
import {DATA_PRODUCT_TYPE_REGISTRY, DEFAULT_DATA_PRODUCT_TYPE, DataProductType} from '../../models/data-product-type';

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
	// Stable catalogue (dataset) metadata for index/filter consumers. Built once for 'dataset' and
	// never overwritten when the modify form loads a non-dataset type, so the catalogue keeps the full
	// dataset filter set even after editing a dataService/datasetSeries (#221 filter regression).
	private readonly catalogueMetadata$ = new BehaviorSubject<DatasetMetadataConfig | null>(null);
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
			next: schema => {
				const isCatalogueType = type === DEFAULT_DATA_PRODUCT_TYPE;
				const parsed = this.parseSchema(schema, type, isCatalogueType);
				this.metadata$.next(parsed);
				// Keep the catalogue channel pinned to dataset so a non-dataset form load can't
				// shrink the index filters (#221).
				if (isCatalogueType) {
					this.catalogueMetadata$.next(parsed);
				}
			},
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

	// Per-type metadata cache for read-only consumers (e.g. the detail page), built without mutating
	// the shared metadata$ singleton or the global enum classification (#221).
	private readonly typeMetadataCache = new Map<DataProductType, DatasetMetadataConfig>();

	/**
	 * Get the field metadata for a specific product type without affecting the form singleton or the
	 * catalogue's global enum dispatch. Used by the detail page so dataService/datasetSeries records
	 * render their own fields. Cached per type (the underlying schema fetch is also cached).
	 */
	getMetadataForType(type: DataProductType): Observable<DatasetMetadataConfig | null> {
		const cached = this.typeMetadataCache.get(type);
		if (cached) {
			return of(cached);
		}
		const config = this.schemaConfigForType(type);
		if (!config) {
			return of(null);
		}
		return this.schemaFetcher.fetchSchema(config).pipe(
			map(schema => {
				const parsed = this.parseSchema(schema, type, false);
				this.typeMetadataCache.set(type, parsed);
				return parsed;
			})
		);
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
		return layout[type]?.steps ?? layout[DEFAULT_DATA_PRODUCT_TYPE].steps;
	}

	private parseSchema(schema: any, type: DataProductType, seedGlobalEnums = false): DatasetMetadataConfig {
		const steps = this.stepsForType(type);
		// Re-derive the *global* enum-field classification (enumTypes/enumArrayFields, used app-wide for
		// catalogue facets and detail render-dispatch) only from the catalogue/dataset schema. Building
		// per-type metadata (form or detail) must NOT reseed it, or it would point at a non-dataset
		// type's enums and break the index filters/dispatch (#221).
		if (seedGlobalEnums) {
			seedEnumFieldsFromSchema(schema);
		}

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

	// Stable dataset metadata for catalogue consumers (index filters), independent of the form's
	// active product type so a non-dataset form load can't shrink the catalogue filters (#221).
	getCatalogueMetadata(): Observable<DatasetMetadataConfig | null> {
		return this.catalogueMetadata$.asObservable();
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
