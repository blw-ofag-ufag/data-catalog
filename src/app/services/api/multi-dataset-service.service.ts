import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {DatasetSchema} from '../../models/schemas/dataset';
import {PublisherService} from './publisher.service';

@Injectable({
	providedIn: 'root'
})
export class MultiDatasetService {
	datasets$: Observable<DatasetSchema[]>;
	selectedDataset$: Observable<DatasetSchema | null>;
	keywords$: Observable<string[]>;
	loading$: Observable<boolean>;
	private readonly _datasetsSubject = new BehaviorSubject<DatasetSchema[]>([]);
	private readonly _keywordsSubject = new BehaviorSubject<string[]>([]);
	private readonly _selectedDatasetSubject = new BehaviorSubject<DatasetSchema | null>(null);
	private readonly _loadingSubject = new BehaviorSubject<boolean>(false);
	private readonly indexUrls: string[] = [];
	private readonly keywordsUrls: string[] = [];
	private readonly detailUrls: {[publisherId: string]: (datasetId: string) => string} = {};
	private indexLoaded = false;

	constructor(private readonly publisherService: PublisherService) {
		this.datasets$ = this._datasetsSubject.asObservable();
		this.selectedDataset$ = this._selectedDatasetSubject.asObservable();
		this.keywords$ = this._keywordsSubject.asObservable();
		this.loading$ = this._loadingSubject.asObservable();
		this.indexUrls = publisherService.getPublishers().map(publisher => publisher.getProcessedUrl());
		this.keywordsUrls = publisherService.getPublishers().map(publisher => publisher.getKeywordUrl());
		this.detailUrls = publisherService.getPublishers().reduce((acc: {[publisherId: string]: (id: string) => string}, publisher) => {
			acc[publisher.id] = publisher.getDetailUrl;
			return acc;
		}, {});
	}

	onRouteChange(path: {publisher: string; klass: string; id: string} | null) {
		if (path) {
			// path.publisher = 'BLW-OFAG-UFAG-FOAG';
			this.loadDetail(path.publisher, path.klass, path.id);
		} else {
			if (!this.indexLoaded) {
				this.loadIndex();
				this.indexLoaded = true;
			}
		}
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
				const combinedDatasets: DatasetSchema[] = results.flat();
				this._datasetsSubject.next(combinedDatasets);
			})
			.catch(error => {
				console.error('Error fetching datasets from all sources:', error);
				this._datasetsSubject.next([]);
			});

		const fetchKeywordsPromises = this.keywordsUrls.map(url =>
			fetch(url)
				.then(response => {
					if (!response.ok) {
						throw new Error(`Failed to fetch keywords from ${url}`);
					}
					return response.json();
				})
				.catch(error => {
					console.error(`Error fetching keywords from ${url}:`, error);
					return [];
				})
		);

		Promise.all(fetchKeywordsPromises)
			.then(results => {
				const combinedKeywords: string[] = Array.from(new Set(results.flatMap(entry => entry['dcat:keyword'])));
				this._keywordsSubject.next(combinedKeywords);
			})
			.catch(error => {
				console.error('Error fetching keywords from all sources:', error);
				this._keywordsSubject.next([]);
			});
	}

	loadDetail(publisher: string, klass: string, id: string) {
		this._loadingSubject.next(true);
		fetch(this.detailUrls[publisher](id))
			.then(response => {
				response
					.json()
					.then(data => {
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
