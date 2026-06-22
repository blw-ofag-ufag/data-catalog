import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, map} from 'rxjs';
import {DatasetSchema} from '../../models/schemas/dataset';
import {PublisherService} from './publisher.service';
import {KeywordService} from './keyword.service';

@Injectable({
	providedIn: 'root'
})
export class MultiDatasetService {
	datasets$: Observable<DatasetSchema[]>;
	selectedDataset$: Observable<DatasetSchema | null>;
	/**
	 * @deprecated Use KeywordService.keywords$ instead for full keyword objects with translations.
	 * This observable only provides keyword codes for backward compatibility.
	 */
	keywords$: Observable<string[]>;
	loading$: Observable<boolean>;
	private readonly _datasetsSubject = new BehaviorSubject<DatasetSchema[]>([]);
	private readonly _selectedDatasetSubject = new BehaviorSubject<DatasetSchema | null>(null);
	private readonly _loadingSubject = new BehaviorSubject<boolean>(false);
	private readonly indexUrls: string[] = [];
	private readonly detailUrls: {[publisherId: string]: (datasetId: string) => string} = {};
	private indexLoaded = false;

	constructor(
		private readonly publisherService: PublisherService,
		private readonly keywordService: KeywordService
	) {
		this.datasets$ = this._datasetsSubject.asObservable();
		this.selectedDataset$ = this._selectedDatasetSubject.asObservable();
		// Delegate keywords$ to KeywordService, mapping to just codes for backward compatibility
		this.keywords$ = this.keywordService.keywords$.pipe(map(keywords => keywords.map(k => k.code)));
		this.loading$ = this._loadingSubject.asObservable();
		this.indexUrls = publisherService.getPublishers().map(publisher => publisher.getProcessedUrl());
		this.detailUrls = publisherService.getPublishers().reduce((acc: {[publisherId: string]: (id: string) => string}, publisher) => {
			acc[publisher.id] = (id: string) => publisher.getDetailUrl(id);
			return acc;
		}, {});
	}

	onRouteChange(path: {publisher: string; klass: string; id: string} | null) {
		if (path) {
			// path.publisher = 'BLW-OFAG-UFAG-FOAG';
			this.loadDetail(path.publisher, path.klass, path.id);
		} else {
			this.ensureIndexLoaded();
		}
	}

	/**
	 * Loads the full dataset index once (idempotent). Used both on the index route
	 * and by detail-page components that need to resolve dataset references (e.g.
	 * titles for prov:wasDerivedFrom / dcat:inSeries / dct:replaces) when the page
	 * was deep-linked without first visiting the index.
	 */
	ensureIndexLoaded() {
		if (this.indexLoaded) {
			return;
		}
		this.indexLoaded = true;
		this.loadIndex();
	}

	loadIndex() {
		// fetch from all index urls and combine the result in _datasetSubject
		const fetchPromises = this.indexUrls.map(url =>
			fetch(url)
				.then(response => {
					if (!response.ok) {
						throw new Error(`Failed to fetch datasets from ${url}`);
					}
					return response.json();
				})
				.catch(error => {
					console.error(`Error fetching index from ${url}:`, error);
					return [];
				})
		);

		Promise.all(fetchPromises)
			.then(results => {
				const combinedDatasets: DatasetSchema[] = results.flat().map(dataset => {
					// Sort keywords within each dataset alphabetically
					if (dataset['dcat:keyword'] && Array.isArray(dataset['dcat:keyword'])) {
						dataset['dcat:keyword'] = [...dataset['dcat:keyword']].sort((a, b) => a.localeCompare(b));
					}
					return dataset;
				});
				this._datasetsSubject.next(combinedDatasets);
			})
			.catch(error => {
				console.error('Error fetching datasets from all sources:', error);
				this._datasetsSubject.next([]);
			});

		// Load keywords via KeywordService (which handles fetching and merging from all publishers)
		this.keywordService.loadKeywords().subscribe();
	}

	loadDetail(publisher: string, klass: string, id: string) {
		this._loadingSubject.next(true);
		fetch(this.detailUrls[publisher](id))
			.then(response => {
				response
					.json()
					.then(data => {
						// Note: Keywords sorting is now handled by display components
						// to respect the current language
						this._selectedDatasetSubject.next(data);
						this._loadingSubject.next(false);
					})
					.catch(error => {
						console.error(`Error fetching dataset from ${this.detailUrls[publisher](id)}:`, error);
						this._selectedDatasetSubject.next(null);
						this._loadingSubject.next(false);
					});
			})
			.catch(error => {
				console.error(`Error deserializing dataset from ${this.detailUrls[publisher](id)}:`, error);
				this._selectedDatasetSubject.next(null);
				this._loadingSubject.next(false);
			});
	}
}
