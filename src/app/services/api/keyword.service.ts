import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {PublisherService} from './publisher.service';

export interface Keyword {
	code: string;
	labels: {
		de: string;
		fr: string;
		it: string;
		en: string;
	};
}

@Injectable({
	providedIn: 'root'
})
export class KeywordService {
	private readonly keywordsSubject = new BehaviorSubject<Keyword[]>([]);
	public keywords$ = this.keywordsSubject.asObservable();
	private readonly keywordUrls: string[] = [];
	private loaded = false;

	constructor(private readonly publisherService: PublisherService) {
		this.keywordUrls = publisherService.getPublishers().map(publisher => publisher.getKeywordUrl());
	}

	/**
	 * Load keywords from all publisher repositories
	 */
	loadKeywords(): Observable<Keyword[]> {
		if (this.loaded && this.keywordsSubject.value.length > 0) {
			return this.keywords$;
		}

		const fetchPromises = this.keywordUrls.map(url =>
			fetch(url)
				.then(response => {
					if (!response.ok) {
						throw new Error(`Failed to fetch keywords from ${url}`);
					}
					return response.json();
				})
				.catch(error => {
					console.error(`Error fetching keywords from ${url}:`, error);
					return {'dcat:keyword': {}};
				})
		);

		return new Observable(subscriber => {
			Promise.all(fetchPromises)
				.then(results => {
					const allKeywords = new Map<string, Keyword>();

					results.forEach(entry => {
						const keywords = entry['dcat:keyword'];
						if (!keywords || typeof keywords !== 'object' || Array.isArray(keywords)) {
							return;
						}

						// Handle multilingual format: { "key": { "de": "...", "en": "...", ... } }
						Object.entries(keywords).forEach(([key, translations]: [string, any]) => {
							if (typeof translations !== 'object' || translations === null) {
								return;
							}
							allKeywords.set(key, {
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

					const sortedKeywords = Array.from(allKeywords.values()).sort((a, b) => a.code.localeCompare(b.code));

					this.keywordsSubject.next(sortedKeywords);
					this.loaded = true;
					subscriber.next(sortedKeywords);
					subscriber.complete();
				})
				.catch(error => {
					console.error('Error loading keywords:', error);
					subscriber.next([]);
					subscriber.complete();
				});
		});
	}

	/**
	 * Get current keywords
	 */
	getKeywords(): Keyword[] {
		return this.keywordsSubject.value;
	}

	/**
	 * Get keyword labels for a specific code
	 */
	getKeywordLabels(code: string): Keyword['labels'] | null {
		const keyword = this.keywordsSubject.value.find(k => k.code === code);
		return keyword ? keyword.labels : null;
	}

	/**
	 * Get keyword codes for enum compatibility
	 */
	getKeywordCodes(): string[] {
		return this.keywordsSubject.value.map(keyword => keyword.code);
	}
}
