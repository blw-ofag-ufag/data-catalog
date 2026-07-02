import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {PublisherService} from './publisher.service';

export interface Dimension {
	code: string;
	labels: {
		de: string;
		fr: string;
		it: string;
		en: string;
	};
}

/**
 * Loads the distribution-dimension glossary (`data/schemas/dimensions.json`) from every publisher
 * repository. Mirrors {@link KeywordService}: dimensions are stored on a distribution as an array of
 * codes (`bv:dimensions`) and resolved to translated labels here (issue #92).
 */
@Injectable({
	providedIn: 'root'
})
export class DimensionService {
	private readonly dimensionsSubject = new BehaviorSubject<Dimension[]>([]);
	public dimensions$ = this.dimensionsSubject.asObservable();
	private readonly dimensionUrls: string[] = [];
	private loaded = false;

	constructor(private readonly publisherService: PublisherService) {
		this.dimensionUrls = publisherService.getPublishers().map(publisher => publisher.getDimensionUrl());
	}

	/**
	 * Load dimensions from all publisher repositories
	 */
	loadDimensions(): Observable<Dimension[]> {
		if (this.loaded && this.dimensionsSubject.value.length > 0) {
			return this.dimensions$;
		}

		const fetchPromises = this.dimensionUrls.map(url =>
			fetch(url)
				.then(response => {
					if (!response.ok) {
						throw new Error(`Failed to fetch dimensions from ${url}`);
					}
					return response.json();
				})
				.catch(error => {
					console.error(`Error fetching dimensions from ${url}:`, error);
					return {};
				})
		);

		return new Observable(subscriber => {
			Promise.all(fetchPromises)
				.then(results => {
					const allDimensions = new Map<string, Dimension>();

					results.forEach(dimensions => {
						if (!dimensions || typeof dimensions !== 'object' || Array.isArray(dimensions)) {
							return;
						}

						// Handle multilingual format: { "key": { "de": "...", "en": "...", ... } }
						Object.entries(dimensions).forEach(([key, translations]: [string, any]) => {
							if (typeof translations !== 'object' || translations === null) {
								return;
							}
							allDimensions.set(key, {
								code: key,
								labels: {
									de: translations.de || key,
									fr: translations.fr || key,
									it: translations.it || key,
									en: translations.en || key
								}
							});
						});
					});

					const sortedDimensions = Array.from(allDimensions.values()).sort((a, b) => a.code.localeCompare(b.code));

					this.dimensionsSubject.next(sortedDimensions);
					this.loaded = true;
					subscriber.next(sortedDimensions);
					subscriber.complete();
				})
				.catch(error => {
					console.error('Error loading dimensions:', error);
					subscriber.next([]);
					subscriber.complete();
				});
		});
	}

	/**
	 * Get current dimensions
	 */
	getDimensions(): Dimension[] {
		return this.dimensionsSubject.value;
	}

	/**
	 * Get dimension labels for a specific code
	 */
	getDimensionLabels(code: string): Dimension['labels'] | null {
		const dimension = this.dimensionsSubject.value.find(d => d.code === code);
		return dimension ? dimension.labels : null;
	}

	/**
	 * Resolve a dimension code to its label in the given language, with sensible fallbacks.
	 */
	getDimensionLabel(code: string, lang: string): string {
		const labels = this.getDimensionLabels(code);
		if (!labels) {
			return code;
		}
		return labels[lang as keyof Dimension['labels']] || labels.de || labels.en || code;
	}

	/**
	 * Get dimension codes for enum compatibility
	 */
	getDimensionCodes(): string[] {
		return this.dimensionsSubject.value.map(dimension => dimension.code);
	}
}
