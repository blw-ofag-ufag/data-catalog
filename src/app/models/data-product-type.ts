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
	 * NOTE: not every publisher serves every index. BLW serves all three; FSVO currently 404s on
	 * `dataServices.json` and `datasetSeries.json`. Consumers must degrade gracefully (404 → empty)
	 * so a missing index never breaks loading.
	 */
	segment: string;
	/** Product schema path in the metadata repo (`data/schemas/{...}.json`). */
	schemaPath: string;
	/** Reference fields that hold arrays of dataset IDs (rendered as links / picked via select). */
	referenceFields: string[];
	/**
	 * Whether the catalogue should fetch this type's `data/processed/{segment}.json` index.
	 *
	 * All three are true: BLW publishes dataService and datasetSeries indexes. FSVO still 404s on
	 * those two; loadIndex swallows the 404 (→ empty), so this costs one wasted request per
	 * publisher that does not serve them yet. Do NOT read this as "every publisher has the index".
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
