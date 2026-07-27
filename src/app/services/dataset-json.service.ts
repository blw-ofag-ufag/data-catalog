import {Injectable} from '@angular/core';
import {DatasetSchema} from '../models/schemas/dataset';
import {DATA_PRODUCT_TYPE_REGISTRY, DEFAULT_DATA_PRODUCT_TYPE, DataProductType} from '../models/data-product-type';

@Injectable({
	providedIn: 'root'
})
export class DatasetJsonService {
	/**
	 * Fields the schema declares as `array` of `string`, but which the edit form binds to a single
	 * text input. An untouched control still holds the record's array, yet as soon as the user types
	 * the control value becomes a bare string — and that scalar was written straight to the record,
	 * violating the schema (issue #260 class; `prov:wasGeneratedBy: "Datenportal"` is a live example).
	 *
	 * Angular renders an array in a text input as `a,b,c`, so splitting on commas round-trips exactly
	 * what the user was shown and keeps multi-valued records (prov:wasDerivedFrom holds up to 5) intact.
	 */
	private static readonly ARRAY_OF_STRING_FIELDS = ['prov:wasDerivedFrom', 'prov:wasGeneratedBy', 'dcat:inSeries', 'dct:replaces'];

	/**
	 * Generate dataset JSON from form data
	 */
	generateDatasetJson(formData: any): DatasetSchema {
		// Generate identifier if not provided
		if (!formData['dct:identifier']) {
			formData['dct:identifier'] = this.generateUUID();
		}

		// Process distributions - ensure each has an identifier
		if (formData['dcat:distribution'] && Array.isArray(formData['dcat:distribution'])) {
			formData['dcat:distribution'].forEach((dist: any, index: number) => {
				if (!dist['dct:identifier']) {
					dist['dct:identifier'] = this.generateUUID();
				}
			});
		}

		// Restore the schema's array shape for fields the form edits as free text.
		const shaped = this.coerceArrayOfStringFields(formData);

		// Clean up empty values
		const cleanedData = this.removeEmptyValues(shaped);

		// Reorder to put identifier first
		return this.reorderIdentifierFirst(cleanedData);
	}

	private coerceArrayOfStringFields(formData: any): any {
		const shaped = {...formData};
		for (const key of DatasetJsonService.ARRAY_OF_STRING_FIELDS) {
			const value = shaped[key];
			if (typeof value === 'string') {
				shaped[key] = value
					.split(',')
					.map(entry => entry.trim())
					.filter(entry => entry !== '');
			}
		}
		return shaped;
	}

	/**
	 * Generate a UUID v4
	 */
	private generateUUID(): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	/**
	 * Remove empty values from the dataset
	 */
	private removeEmptyValues(obj: any): any {
		if (obj === null || obj === undefined) {
			return obj;
		}

		// Preserve Date values (e.g. from datepickers) as YYYY-MM-DD strings.
		// Without this, a Date passes the typeof === 'object' check below, gets
		// recursed into (it has no own enumerable keys) and is reduced to null,
		// silently dropping fields like dct:issued. Use local date parts rather
		// than toISOString() to avoid a timezone-induced off-by-one day shift.
		if (obj instanceof Date) {
			const y = obj.getFullYear();
			const m = String(obj.getMonth() + 1).padStart(2, '0');
			const d = String(obj.getDate()).padStart(2, '0');
			return `${y}-${m}-${d}`;
		}

		if (Array.isArray(obj)) {
			const filtered = obj.map(item => this.removeEmptyValues(item)).filter(item => item !== null && item !== undefined && item !== '');
			return filtered.length > 0 ? filtered : null;
		}

		if (typeof obj === 'object') {
			const cleaned: any = {};
			for (const [key, value] of Object.entries(obj)) {
				const cleanedValue = this.removeEmptyValues(value);
				if (cleanedValue !== null && cleanedValue !== undefined && cleanedValue !== '') {
					// For multilingual objects, only include if at least one language has content
					if (this.isMultilingualField(key)) {
						if (this.hasMultilingualContent(cleanedValue)) {
							cleaned[key] = cleanedValue;
						}
					} else {
						cleaned[key] = cleanedValue;
					}
				}
			}
			return Object.keys(cleaned).length > 0 ? cleaned : null;
		}

		return obj === '' ? null : obj;
	}

	/**
	 * Check if a field is multilingual (title, description)
	 */
	private isMultilingualField(key: string): boolean {
		return key.includes('title') || key.includes('description');
	}

	/**
	 * Check if multilingual object has at least one non-empty language
	 */
	private hasMultilingualContent(obj: any): boolean {
		if (typeof obj !== 'object' || obj === null) {
			return false;
		}
		return Object.values(obj).some(value => value && value !== '');
	}

	/**
	 * Reorder object properties to put identifier first
	 */
	private reorderIdentifierFirst(obj: any): any {
		if (!obj || typeof obj !== 'object') {
			return obj;
		}

		const newObj: any = {};

		// Put 'dct:identifier' first if it exists
		if (obj.hasOwnProperty('dct:identifier')) {
			newObj['dct:identifier'] = obj['dct:identifier'];
		}

		// Then copy the rest in a logical order
		const preferredOrder = [
			'schema:image',
			'dct:title',
			'dct:description',
			'dct:accessRights',
			'dct:publisher',
			'dcat:contactPoint',
			'dct:issued',
			'dcatap:availability',
			'dcat:keyword',
			'dct:accrualPeriodicity',
			'dct:modified',
			'dcat:version',
			'adms:versionNotes',
			// dataService fields
			'dcat:endpointURL',
			'dcat:endpointDescription',
			'dcat:servesDataset',
			'dct:conformsTo',
			// datasetSeries member datasets
			'dcat:dataset',
			'prov:qualifiedAttribution',
			'adms:status',
			'bv:classification',
			'bv:personalData',
			'bv:typeOfData',
			'bv:archivalValue',
			'bv:externalCatalogs',
			'dcat:theme',
			'dcat:landingPage',
			'dct:spatial',
			'dct:temporal',
			'dcatap:applicableLegislation',
			'prov:wasGeneratedBy',
			'bv:retentionPeriod',
			'dcat:catalog',
			'prov:wasDerivedFrom',
			'bv:geoIdentifier',
			'foaf:page',
			'schema:comment',
			'bv:abrogation',
			'bv:itSystem',
			'dcat:inSeries',
			'dct:replaces',
			'dcat:distribution'
		];

		// Add properties in preferred order
		for (const key of preferredOrder) {
			if (obj.hasOwnProperty(key) && key !== 'dct:identifier') {
				newObj[key] = obj[key];
			}
		}

		// Add any remaining properties
		for (const key in obj) {
			if (!newObj.hasOwnProperty(key)) {
				newObj[key] = obj[key];
			}
		}

		return newObj;
	}

	/**
	 * Generate the repo file path for a record, using the product type's folder segment
	 * (datasets / dataServices / datasetSeries) so non-dataset types are written to the right
	 * location (#221). Defaults to 'dataset' for backward compatibility.
	 */
	generateFilePath(datasetId: string, type: DataProductType = DEFAULT_DATA_PRODUCT_TYPE): string {
		return `data/raw/${DATA_PRODUCT_TYPE_REGISTRY[type].segment}/${datasetId}.json`;
	}

	/**
	 * Format JSON for display with proper indentation
	 */
	formatJsonForDisplay(data: any): string {
		return JSON.stringify(data, null, 2);
	}

	/**
	 * Create downloadable blob for JSON file
	 */
	createJsonBlob(data: any): Blob {
		const jsonString = this.formatJsonForDisplay(data);
		return new Blob([jsonString], {type: 'application/json'});
	}
}
