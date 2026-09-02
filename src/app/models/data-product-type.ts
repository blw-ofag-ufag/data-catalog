/**
 * Data-product type discriminator and per-type registry (issue #221).
 *
 * The catalog historically supported a single product type, `dataset`. The metadata repo now
 * publishes schemas for two more — `dataService` and `datasetSeries` — which must become
 * creatable/editable through the form and viewable in the catalogue. Rather than cloning the
 * dataset stack per type, a single discriminator is threaded through the existing pipeline and
 * per-type differences are looked up here.
 *
 * Everything defaults to `dataset` for back-compat: existing URLs, bookmarks and commit paths
 * keep working when no type is specified.
 */
export type DataProductType = 'dataset' | 'dataService' | 'datasetSeries';

export const DEFAULT_DATA_PRODUCT_TYPE: DataProductType = 'dataset';

export interface DataProductTypeConfig {
	/** The discriminator value. */
	type: DataProductType;
	/**
	 * Path segment used in the publisher repo: `data/processed/{segment}.json` (catalogue index)
	 * and `data/raw/{segment}/{id}.json` (single record).
	 *
	 * NOTE: on the production publishers only `datasets.json` exists; `dataServices.json` and
	 * `datasetSeries.json` still 404 (their pipeline hasn't landed — #221 §5). Only the ROLAND-TEST
	 * dev publisher serves all three today. Consumers must degrade gracefully (404 → empty) so the
	 * missing indexes never break loading.
	 */
	segment: string;
	/** Product schema path in the metadata repo (`data/schemas/{...}.json`). */
	schemaPath: string;
	/** Reference fields that hold arrays of dataset IDs (rendered as links / picked via select). */
	referenceFields: string[];
	/**
	 * Whether the catalogue should fetch this type's `data/processed/{segment}.json` index.
	 *
	 * All three are true so the ROLAND-TEST dev publisher (the only one serving dataService /
	 * datasetSeries indexes today) surfaces the new types. The production publishers still 404 on
	 * those two; loadIndex swallows the 404 (→ empty), so this costs a wasted request per publisher
	 * until the upstream pipeline lands. Do NOT read this as "the indexes exist".
	 */
	hasProcessedIndex: boolean;
}

export const DATA_PRODUCT_TYPES: DataProductType[] = ['dataset', 'dataService', 'datasetSeries'];

export const DATA_PRODUCT_TYPE_REGISTRY: Record<DataProductType, DataProductTypeConfig> = {
	dataset: {
		type: 'dataset',
		segment: 'datasets',
		schemaPath: 'data/schemas/dataset.json',
		referenceFields: ['prov:wasDerivedFrom', 'dcat:inSeries', 'dct:replaces'],
		hasProcessedIndex: true
	},
	dataService: {
		type: 'dataService',
		segment: 'dataServices',
		schemaPath: 'data/schemas/dataService.json',
		referenceFields: ['dcat:servesDataset'],
		hasProcessedIndex: true
	},
	datasetSeries: {
		type: 'datasetSeries',
		segment: 'datasetSeries',
		schemaPath: 'data/schemas/datasetSeries.json',
		referenceFields: ['dcat:dataset'],
		hasProcessedIndex: true
	}
};

/** Resolve a (possibly missing/invalid) type value to a known config, defaulting to `dataset`. */
export function resolveDataProductType(type: string | null | undefined): DataProductTypeConfig {
	if (type && (DATA_PRODUCT_TYPES as string[]).includes(type)) {
		return DATA_PRODUCT_TYPE_REGISTRY[type as DataProductType];
	}
	return DATA_PRODUCT_TYPE_REGISTRY[DEFAULT_DATA_PRODUCT_TYPE];
}
