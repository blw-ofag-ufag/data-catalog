import {Params} from '@angular/router';
import {enumTypes} from '../models/enum-fields';

export type ActiveFilters = {[key: string]: {[key: string]: boolean}};

export function createActiveFiltersFromParams(params: Params): ActiveFilters {
	const activeFilters: ActiveFilters = {};

	for (const key in params) {
		const value = params[key];
		// `productType` is a synthetic facet (the data-product type, not a schema enum), so it isn't
		// in enumTypes — recognise it explicitly so the type filter round-trips through the URL (#221).
		if (enumTypes.includes(key) || key === 'productType') {
			const values = value.split(','); // Split comma-separated values
			activeFilters[key] = {};

			// Map the values to boolean and set on activeFilters[key]

			values.forEach((item: string | number) => {
				activeFilters[key][item] = true;
			});
		}
	}

	return activeFilters;
}
