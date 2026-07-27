import {TestBed} from '@angular/core/testing';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {BehaviorSubject, of} from 'rxjs';
import {DatasetService} from './api.service';
import {MultiDatasetService} from './multi-dataset-service.service';
import {KeywordService} from './keyword.service';
import {stubKeywordService, stubTranslateService} from '../../../../tests/helpers/service-stubs';

describe('DatasetService (api.service)', () => {
	let service: DatasetService;
	let multiDataset: any;
	let keywordService: any;
	let router: {navigate: jest.Mock};

	const datasets$ = new BehaviorSubject<any[]>([]);
	const selectedDataset$ = new BehaviorSubject<any>(null);
	const loading$ = new BehaviorSubject<boolean>(false);

	beforeEach(() => {
		datasets$.next([]);
		selectedDataset$.next(null);
		loading$.next(false);

		multiDataset = {
			datasets$,
			selectedDataset$,
			loading$,
			onRouteChange: jest.fn(),
			loadDetail: jest.fn()
		};
		keywordService = stubKeywordService();
		router = {navigate: jest.fn().mockResolvedValue(true)};

		const activatedRoute = {
			snapshot: {queryParams: {}},
			queryParams: of({})
		};

		TestBed.configureTestingModule({
			providers: [
				DatasetService,
				{provide: HttpClient, useValue: {get: jest.fn()}},
				{provide: ActivatedRoute, useValue: activatedRoute},
				{provide: Router, useValue: router},
				{provide: TranslateService, useValue: stubTranslateService()},
				{provide: MultiDatasetService, useValue: multiDataset},
				{provide: KeywordService, useValue: keywordService}
			]
		});

		service = TestBed.inject(DatasetService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('triggers an index load (null route) during construction', () => {
		expect(multiDataset.onRouteChange).toHaveBeenCalledWith(null);
	});

	describe('delegation to MultiDatasetService', () => {
		it('getDatasetById returns the selectedDataset$ stream', done => {
			selectedDataset$.next({'dct:identifier': 'sel'});
			service.getDatasetById('sel').subscribe(value => {
				expect(value).toEqual({'dct:identifier': 'sel'});
				done();
			});
		});

		it('getLoadingState returns the loading$ stream', done => {
			loading$.next(true);
			service.getLoadingState().subscribe(value => {
				expect(value).toBe(true);
				done();
			});
		});

		it('loadDatasetById delegates to multiDatasetService.loadDetail', () => {
			service.loadDatasetById('PUB', 'id-9');
			expect(multiDataset.loadDetail).toHaveBeenCalledWith('PUB', 'dataset', 'id-9');
		});
	});

	describe('getKeywordsArray', () => {
		it('returns the keyword array as-is', () => {
			expect(service.getKeywordsArray({'dcat:keyword': ['a', 'b']} as any)).toEqual(['a', 'b']);
		});

		it('returns an empty array when keywords are missing', () => {
			expect(service.getKeywordsArray({} as any)).toEqual([]);
		});

		it('returns an empty array when keywords are not an array', () => {
			expect(service.getKeywordsArray({'dcat:keyword': 'oops'} as any)).toEqual([]);
		});
	});

	describe('getLocalizedKeywords', () => {
		it('translates codes via KeywordService for the current language', () => {
			keywordService.getKeywordLabels.mockImplementation((code: string) =>
				code === 'agri' ? {de: 'Landwirtschaft', fr: 'Agriculture', it: 'Agricoltura', en: 'Agriculture'} : null
			);

			expect(service.getLocalizedKeywords({'dcat:keyword': ['agri']} as any, 'de')).toEqual(['Landwirtschaft']);
		});

		it('falls back to the code when no labels are known', () => {
			keywordService.getKeywordLabels.mockReturnValue(null);
			expect(service.getLocalizedKeywords({'dcat:keyword': ['unknown']} as any, 'de')).toEqual(['unknown']);
		});

		it('returns sorted, localized keywords', () => {
			keywordService.getKeywordLabels.mockImplementation((code: string) => ({
				de: code === 'b' ? 'Alpha' : 'Beta',
				fr: code,
				it: code,
				en: code
			}));
			expect(service.getLocalizedKeywords({'dcat:keyword': ['a', 'b']} as any, 'de')).toEqual(['Alpha', 'Beta']);
		});

		it('returns an empty array when there are no keywords', () => {
			expect(service.getLocalizedKeywords({} as any, 'de')).toEqual([]);
		});
	});

	describe('search', () => {
		it('updates the searchTerm$ stream and the URL', done => {
			service.search('wheat');
			service.searchTerm$.subscribe(term => {
				expect(term).toBe('wheat');
				done();
			});
			expect(router.navigate).toHaveBeenCalled();
		});
	});

	describe('setFilters (URL sync)', () => {
		function lastNavQueryParams(): Record<string, unknown> {
			const calls = router.navigate.mock.calls;
			return calls[calls.length - 1][1].queryParams;
		}

		it('nulls the synthetic productType facet when it is not active, so a deselected/absent klass filter is cleared from the URL (#221 pagination bug)', async () => {
			await service.setFilters({});
			expect(lastNavQueryParams()).toHaveProperty('productType', null);
		});

		it('writes the productType value when the klass facet is active', async () => {
			await service.setFilters({productType: {dataService: true}});
			expect(lastNavQueryParams()['productType']).toBe('dataService');
		});
	});
});
