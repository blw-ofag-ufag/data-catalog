import {Params} from '@angular/router';
import {enumTypes} from '../models/schemas/dataset';

export type ActiveFilters = {[key: string]: {[key: string]: boolean}};

export function createActiveFiltersFromParams(params: Params): ActiveFilters {
	const activeFilters: ActiveFilters = {};

	for (const key in params) {
		const value = params[key];
		if (enumTypes.includes(key)) {
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
