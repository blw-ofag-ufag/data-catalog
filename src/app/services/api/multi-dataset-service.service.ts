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
	private readonly _datasetsSubject = new BehaviorSubject<DatasetSchema[]>([]);
	private readonly _selectedDatasetSubject = new BehaviorSubject<DatasetSchema | null>(null);
	private readonly indexUrls: string[] = [];
	private readonly detailUrls: {[publisherId: string]: (datasetId: string) => string} = {};
	private indexLoaded = false;

	constructor(private readonly publisherService: PublisherService) {
		this.datasets$ = this._datasetsSubject.asObservable();
		this.selectedDataset$ = this._selectedDatasetSubject.asObservable();
		this.indexUrls = publisherService.getPublishers().map(publisher => publisher.getProcessedUrl());
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
	}

	loadDetail(publisher: string, klass: string, id: string) {
		console.log("publisher", publisher);
		console.log("klass", klass);
		console.log("id", id);
		console.log("detailUrls", this.detailUrls[publisher]);
		// // (window as any).fetchfunction = this.detailUrls[publisher];
		// alert(this.detailUrls[publisher]);
		fetch((this.detailUrls[publisher])(id))
			.then(response => {
				response
					.json()
					.then(data => {
						this._selectedDatasetSubject.next(data);
					})
					.catch(error => {
						console.error(`Error fetching dataset from ${this.detailUrls[publisher](id)}:`, error);
						this._selectedDatasetSubject.next(null);
					});
			})
			.catch(error => {
				console.error(`Error deserializing dataset from ${this.detailUrls[publisher](id)}:`, error);
				this._selectedDatasetSubject.next(null);
			});
	}
}
