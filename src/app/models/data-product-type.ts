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
	 * NOTE: only `datasets` exists in the metadata repo today; the processed indexes for the new
	 * types are produced by the publisher's pipeline and do not exist yet (#221 §5). The segment
	 * names below are the expected values — adjust here once the pipeline lands. Consumers must
	 * degrade gracefully (404 → empty) so missing indexes never break loading.
	 */
	segment: string;
	/** Product schema path in the metadata repo (`data/schemas/{...}.json`). */
	schemaPath: string;
	/** Reference fields that hold arrays of dataset IDs (rendered as links / picked via select). */
	referenceFields: string[];
	/** i18n key prefix for this type's enum choices (`choices.{type}.*`). */
	i18nPrefix: string;
	/**
	 * Whether the publisher pipeline produces a `data/processed/{segment}.json` catalogue index for
	 * this type yet. Only `dataset` does today; flip to true once the new-type indexes are published
	 * so the catalogue starts loading them (avoids fetching known-missing indexes in the meantime).
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
		i18nPrefix: 'choices.dataset',
		hasProcessedIndex: true
	},
	dataService: {
		type: 'dataService',
		segment: 'dataServices',
		schemaPath: 'data/schemas/dataService.json',
		referenceFields: ['dcat:servesDataset'],
		i18nPrefix: 'choices.dataService',
		hasProcessedIndex: true
	},
	datasetSeries: {
		type: 'datasetSeries',
		segment: 'datasetSeries',
		schemaPath: 'data/schemas/datasetSeries.json',
		referenceFields: ['dcat:dataset'],
		i18nPrefix: 'choices.datasetSeries',
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
