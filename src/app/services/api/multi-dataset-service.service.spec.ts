import {TestBed} from '@angular/core/testing';
import {MultiDatasetService} from './multi-dataset-service.service';
import {PublisherService} from './publisher.service';
import {mockFetchByUrl, mockFetchJson, restoreFetch} from '../../../../tests/helpers/fetch-mock';

/** Wait one macrotask so the fetch promise chains inside the service settle. */
function flush(): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, 0));
}

describe('MultiDatasetService', () => {
	let service: MultiDatasetService;
	let publisherService: PublisherService;

	beforeEach(() => {
		// jsdom has no global fetch; provide a stub so the fetch-mock helper can spy on it.
		(globalThis as any).fetch = jest.fn();
		TestBed.configureTestingModule({});
		publisherService = TestBed.inject(PublisherService);
		service = TestBed.inject(MultiDatasetService);
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		restoreFetch();
		delete (globalThis as any).fetch;
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('starts with empty datasets and no selected dataset', done => {
		service.datasets$.subscribe(datasets => {
			expect(datasets).toEqual([]);
			service.selectedDataset$.subscribe(selected => {
				expect(selected).toBeNull();
				done();
			});
		});
	});

	describe('loadIndex', () => {
		it('combines datasets from each publisher dataset index and tags them with productType', async () => {
			// Only dataset indexes are fetched today (new types have hasProcessedIndex: false).
			const datasetUrls = publisherService.getPublishers().map(p => p.getProcessedUrl());
			const fetchSpy = mockFetchByUrl(datasetUrls.map(url => ({match: url, payload: [{'dct:identifier': 'a'}, {'dct:identifier': 'b'}]})));

			service.loadIndex();
			await flush();

			for (const url of datasetUrls) {
				expect(fetchSpy).toHaveBeenCalledWith(url);
			}

			const datasets = await new Promise<any[]>(resolve => service.datasets$.subscribe(resolve));
			// 2 entries per publisher dataset index; new-type indexes contribute nothing (404).
			expect(datasets.length).toBe(datasetUrls.length * 2);
			expect(datasets.every(d => d['productType'] === 'dataset')).toBe(true);
		});

		it('sorts dcat:keyword arrays within each dataset alphabetically', async () => {
			mockFetchJson([{'dct:identifier': 'a', 'dcat:keyword': ['zebra', 'apple', 'mango']}]);

			service.loadIndex();
			await flush();

			const datasets = await new Promise<any[]>(resolve => service.datasets$.subscribe(resolve));
			expect(datasets[0]['dcat:keyword']).toEqual(['apple', 'mango', 'zebra']);
		});

		it('falls back to an empty list for a failing index URL without rejecting the whole load', async () => {
			mockFetchByUrl([]); // every URL returns 404 (ok:false)

			service.loadIndex();
			await flush();

			const datasets = await new Promise<any[]>(resolve => service.datasets$.subscribe(resolve));
			expect(datasets).toEqual([]);
		});
	});

	describe('loadDetail', () => {
		it('emits the fetched dataset on selectedDataset$ and clears loading', async () => {
			const publisher = publisherService.getPublishers()[0];
			const payload = {'dct:identifier': 'detail-1', 'dct:title': {de: 'Titel'}};
			mockFetchByUrl([{match: publisher.getDetailUrl('detail-1'), payload}]);

			service.loadDetail(publisher.id, 'dataset', 'detail-1');
			await flush();

			const selected = await new Promise<any>(resolve => service.selectedDataset$.subscribe(resolve));
			// The service tags the loaded record with its resolved product type.
			expect(selected).toEqual({...payload, productType: 'dataset'});

			const loading = await new Promise<boolean>(resolve => service.loading$.subscribe(resolve));
			expect(loading).toBe(false);
		});

		it('sets loading true synchronously while fetching', () => {
			const publisher = publisherService.getPublishers()[0];
			mockFetchJson({});
			let loading: boolean | undefined;
			service.loading$.subscribe(value => (loading = value));

			service.loadDetail(publisher.id, 'dataset', 'x');
			expect(loading).toBe(true);
		});

		it('emits null and stops loading when the detail fetch rejects', async () => {
			const publisher = publisherService.getPublishers()[0];
			jest.spyOn(globalThis, 'fetch' as never).mockRejectedValue(new Error('network') as never);

			service.loadDetail(publisher.id, 'dataset', 'boom');
			await flush();

			const selected = await new Promise<any>(resolve => service.selectedDataset$.subscribe(resolve));
			expect(selected).toBeNull();
			const loading = await new Promise<boolean>(resolve => service.loading$.subscribe(resolve));
			expect(loading).toBe(false);
		});
	});

	describe('onRouteChange', () => {
		it('loads the index only once across repeated null routes', async () => {
			const loadIndexSpy = jest.spyOn(service, 'loadIndex').mockImplementation(() => {});
			service.onRouteChange(null);
			service.onRouteChange(null);
			expect(loadIndexSpy).toHaveBeenCalledTimes(1);
		});

		it('delegates to loadDetail for a populated route', () => {
			const loadDetailSpy = jest.spyOn(service, 'loadDetail').mockImplementation(() => {});
			service.onRouteChange({publisher: 'P', klass: 'dataset', id: 'd1'});
			expect(loadDetailSpy).toHaveBeenCalledWith('P', 'dataset', 'd1');
		});
	});
});
