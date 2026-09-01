import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, map} from 'rxjs';
import {DataProduct} from '../../models/schemas/dataset';
import {PublisherService} from './publisher.service';
import {KeywordService} from './keyword.service';
import {DATA_PRODUCT_TYPES, DATA_PRODUCT_TYPE_REGISTRY, DataProductType, resolveDataProductType} from '../../models/data-product-type';

@Injectable({
	providedIn: 'root'
	/**
	 * P4 POLYMORPHIC FEATURES:
	 * - Loads multiple product types (dataset, dataService, datasetSeries) via federation
	 * - Tags each item with productType discriminator at load time
	 * - Components detect type via (item as any).productType
	 * - Schema-aware validation per type via DataProductType registry
	 * - Type-aware sorting: null fields handled gracefully
	 * - Conditional rendering: components check product type before accessing type-specific fields
	 */
})
export class MultiDatasetService {
	datasets$: Observable<DataProduct[]>;
	selectedDataset$: Observable<DataProduct | null>;
	/**
	 * @deprecated Use KeywordService.keywords$ instead for full keyword objects with translations.
	 * This observable only provides keyword codes for backward compatibility.
	 */
	keywords$: Observable<string[]>;
	loading$: Observable<boolean>;
	private readonly _datasetsSubject = new BehaviorSubject<DataProduct[]>([]);
	private readonly _selectedDatasetSubject = new BehaviorSubject<DataProduct | null>(null);
	private readonly _loadingSubject = new BehaviorSubject<boolean>(false);
	// One processed-index source per (publisher × product type), each tagged with its type.
	private readonly indexSources: {url: string; type: DataProductType}[] = [];
	private readonly detailUrls: {[publisherId: string]: (datasetId: string, type: DataProductType) => string} = {};
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
		const publishers = publisherService.getPublishers();
		// Build a processed-index URL for every (publisher × product type) that actually has a
		// catalogue index produced upstream. Only 'dataset' does today; the registry's
		// hasProcessedIndex flag avoids fetching known-missing new-type indexes (#221 §5). Flip the
		// flag when the pipeline publishes them and the catalogue picks them up automatically.
		const indexedTypes = DATA_PRODUCT_TYPES.filter(type => DATA_PRODUCT_TYPE_REGISTRY[type].hasProcessedIndex);
		this.indexSources = publishers.flatMap(publisher => indexedTypes.map(type => ({url: publisher.getProcessedUrl(type), type})));
		this.detailUrls = publishers.reduce((acc: {[publisherId: string]: (id: string, type: DataProductType) => string}, publisher) => {
			acc[publisher.id] = (id: string, type: DataProductType) => publisher.getDetailUrl(id, type);
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
	 * Load the catalogue index once (idempotent). The detail page calls this so a container type's
	 * contained/served datasets can be resolved from the store even on a deep link / refresh, when
	 * the index route was never visited (#221).
	 */
	ensureIndexLoaded() {
		if (!this.indexLoaded) {
			this.loadIndex();
			this.indexLoaded = true;
		}
	}

	loadIndex() {
		// Fetch every (publisher × type) processed index, tag each item with its product type,
		// and combine. A missing per-type index (e.g. dataService before the pipeline produces it)
		// is expected and yields an empty list rather than an error.
		const fetchPromises = this.indexSources.map(({url, type}) =>
			fetch(url)
				.then(response => {
					if (!response.ok) {
						if (response.status !== 404) {
							console.error(`Failed to fetch index from ${url}: ${response.status}`);
						}
						return [] as any[];
					}
					return response.json();
				})
				.then((items: any[]) => (Array.isArray(items) ? items : []).map(item => ({...item, productType: type})))
				.catch(error => {
					console.error(`Error fetching index from ${url}:`, error);
					return [] as any[];
				})
		);

		Promise.all(fetchPromises)
			.then(results => {
				const combinedDatasets: DataProduct[] = results.flat().map(dataset => {
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
		const type = this.resolveType(klass);
		const urlFor = this.detailUrls[publisher];
		if (!urlFor) {
			console.error(`No detail URL builder for publisher '${publisher}'`);
			this._selectedDatasetSubject.next(null);
			return;
		}
		this._loadingSubject.next(true);
		fetch(urlFor(id, type))
			.then(response => response.json())
			.then(data => {
				// Note: keyword sorting is handled by display components to respect the current language.
				this._selectedDatasetSubject.next({...data, productType: type});
				this._loadingSubject.next(false);
			})
			.catch(error => {
				console.error(`Error fetching ${type} '${id}' from publisher '${publisher}':`, error);
				this._selectedDatasetSubject.next(null);
				this._loadingSubject.next(false);
			});
	}

	private resolveType(klass: string): DataProductType {
		return resolveDataProductType(klass).type;
	}
}
