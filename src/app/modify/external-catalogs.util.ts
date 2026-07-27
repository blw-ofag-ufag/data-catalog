/**
 * Normalisation for `bv:externalCatalogs` (issue #260).
 *
 * The schema declares an array of objects — `dcat:catalog` required, optional `dct:identifier`,
 * `additionalProperties: false`. The edit form used to write an array of bare catalog names
 * (`["I14Y", "opendata.swiss"]`), which violates the schema and renders as blank rows on the
 * detail page. Records written that way exist upstream, so loading must tolerate both shapes.
 */
export interface ExternalCatalogEntry {
	'dcat:catalog': string;
	'dct:identifier': string;
}

/**
 * Coerce a record's `bv:externalCatalogs` value into the schema shape.
 *
 * - object entries keep their `dct:identifier` (assigned by the external catalog at first
 *   publication — losing it would sever the record's link to the published dataset)
 * - legacy string entries become `{'dcat:catalog': <string>, 'dct:identifier': ''}`
 * - anything without a catalog name, and any non-array input, yields no entries
 */
export function normalizeExternalCatalogs(value: unknown): ExternalCatalogEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const entries: ExternalCatalogEntry[] = [];
	for (const entry of value) {
		if (typeof entry === 'string') {
			if (entry.trim() !== '') {
				entries.push({'dcat:catalog': entry, 'dct:identifier': ''});
			}
			continue;
		}
		if (entry && typeof entry === 'object') {
			const catalog = (entry as Record<string, unknown>)['dcat:catalog'];
			if (typeof catalog === 'string' && catalog.trim() !== '') {
				const identifier = (entry as Record<string, unknown>)['dct:identifier'];
				entries.push({'dcat:catalog': catalog, 'dct:identifier': typeof identifier === 'string' ? identifier : ''});
			}
		}
	}
	return entries;
}
