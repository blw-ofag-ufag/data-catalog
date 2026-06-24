/**
 * Enum-field classification, derived from the runtime-fetched schema.
 *
 * Replaces the hand-maintained `enumTypes` / `enumArrayFields` constants that used
 * to live in `dataset.ts`. These lists drive detail-view render dispatch
 * (EnumComponent vs FreeListItemComponent) and URL-filter parsing, so they must be
 * available synchronously app-wide (including in the pure `ActiveFilters` helper and
 * during early routing). We therefore expose live module bindings seeded from the
 * base schema once it loads (see DatasetMetadataService), with defaults equal to the
 * previous static values so behaviour is identical before the schema arrives.
 *
 * `dcat:keyword` is a special case: it is a coded vocabulary (free strings referencing
 * keyword codes), not a schema `enum`, but it is faceted and rendered like an enum
 * array. It is therefore always included in the array-enum set explicitly.
 */

const ALWAYS_ARRAY_ENUM = ['dcat:keyword'];

// Facetable fields (scalar enums + array facets). Used for URL filter parsing and
// detail-view enum dispatch. Default mirrors the previous static `enumTypes`.
export let enumTypes: string[] = [
	'dct:accessRights',
	'dct:publisher',
	'dcatap:availability',
	'dct:accrualPeriodicity',
	'adms:status',
	'bv:classification',
	'bv:personalData',
	'bv:typeOfData',
	'dcat:keyword',
	'dcat:theme'
];

// Enum fields that hold arrays (rendered as chip/free lists). Default mirrors the
// previous static `enumArrayFields`.
export let enumArrayFields: string[] = ['dcat:theme', 'dcat:keyword'];

/**
 * Re-derive the enum-field classification from a JSON schema's properties.
 * - scalar `enum`                  => facetable enum field
 * - `array` with `items.enum`      => array-enum facet
 * - `dcat:keyword`                 => array-enum facet (special-cased)
 */
export function seedEnumFieldsFromSchema(schema: any): void {
	const props = (schema && schema.properties) || {};
	const keys = Object.keys(props);

	const scalarEnum = keys.filter(k => Array.isArray(props[k]?.enum));
	const arrayEnum = keys.filter(k => {
		const items = props[k]?.items;
		return items && Array.isArray(items.enum);
	});

	const arrayFacets = Array.from(new Set([...arrayEnum, ...ALWAYS_ARRAY_ENUM]));

	enumArrayFields = arrayFacets;
	enumTypes = [...scalarEnum, ...arrayFacets];
}
