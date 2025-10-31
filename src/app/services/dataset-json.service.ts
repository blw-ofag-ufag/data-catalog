import { Injectable } from '@angular/core';
import { DatasetSchema } from '../models/schemas/dataset';

@Injectable({
	providedIn: 'root'
})
export class DatasetJsonService {

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

		// Clean up empty values
		const cleanedData = this.removeEmptyValues(formData);

		// Reorder to put identifier first
		return this.reorderIdentifierFirst(cleanedData);
	}

	/**
	 * Generate a UUID v4
	 */
	private generateUUID(): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = Math.random() * 16 | 0;
			const v = c === 'x' ? r : (r & 0x3 | 0x8);
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

		if (Array.isArray(obj)) {
			const filtered = obj
				.map(item => this.removeEmptyValues(item))
				.filter(item => item !== null && item !== undefined && item !== '');
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
	 * Generate file path for dataset
	 */
	generateFilePath(datasetId: string): string {
		return `data/raw/datasets/${datasetId}.json`;
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
		return new Blob([jsonString], { type: 'application/json' });
	}
}
