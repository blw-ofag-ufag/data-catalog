import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject, firstValueFrom, of} from 'rxjs';
import {IndexFilterColComponent} from './index-filter-col.component';
import {DatasetService} from '../services/api/api.service';
import {Keyword, KeywordService} from '../services/api/keyword.service';
import {ActiveFilters} from '../models/ActiveFilters';
import {DatasetMetadataService} from '../services/metadata/dataset-metadata.service';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

// Minimal schema-derived metadata: facetable enum fields carry an `enum` array.
const ENUM_OPTIONS: Record<string, string[]> = {
	'dct:accessRights': ['PUBLIC', 'NON_PUBLIC'],
	'dct:publisher': ['BLW-OFAG-UFAG-FOAG', 'BLV-OSAV-USAV-FSVO'],
	'dcat:theme': ['work', 'energy']
};

const KEYWORDS: Keyword[] = [
	{code: 'agri', labels: {de: 'Landwirtschaft', fr: 'agriculture', it: 'agricoltura', en: 'agriculture'}},
	{code: 'food', labels: {de: 'Essen', fr: 'nourriture', it: 'cibo', en: 'food'}},
	// #257: sorts before the others by label ("Ölsaaten") but last by code, and its umlaut also
	// breaks a naive code-unit sort.
	{code: 'zoilseeds', labels: {de: 'Ölsaaten', fr: 'oléagineux', it: 'semi oleosi', en: 'oilseeds'}}
];

describe('IndexFilterColComponent', () => {
	let component: IndexFilterColComponent;
	let fixture: ComponentFixture<IndexFilterColComponent>;

	const keywordsSubject = new BehaviorSubject<Keyword[]>(KEYWORDS);
	const keywordServiceStub = {
		keywords$: keywordsSubject.asObservable(),
		loadKeywords: jest.fn(() => keywordsSubject.asObservable()),
		getKeywordLabels: jest.fn((code: string) => KEYWORDS.find(k => k.code === code)?.labels ?? null)
	} as any;

	const datasetServiceStub = {
		setFilters: jest.fn()
	} as any;

	const routeStub = {
		queryParams: of({}),
		snapshot: {queryParams: {}}
	} as any;

	const metadataConfigStub = {
		fields: new Map(Object.entries(ENUM_OPTIONS).map(([key, options]) => [key, {key, enum: options}])),
		steps: [],
		requiredFields: []
	};
	const metadataServiceStub = {
		getMetadata: () => of(metadataConfigStub),
		// Catalogue (dataset) metadata channel the filter column now reads (#221).
		getCatalogueMetadata: () => of(metadataConfigStub),
		getEnumOptions: (key: string) => ENUM_OPTIONS[key] ?? []
	} as any;

	beforeEach(async () => {
		datasetServiceStub.setFilters.mockClear();

		await TestBed.configureTestingModule({
			imports: [IndexFilterColComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				{provide: KeywordService, useValue: keywordServiceStub},
				{provide: DatasetService, useValue: datasetServiceStub},
				{provide: ActivatedRoute, useValue: routeStub},
				{provide: DatasetMetadataService, useValue: metadataServiceStub}
			]
		}).compileComponents();

		fixture = TestBed.createComponent(IndexFilterColComponent);
		component = fixture.componentInstance;
		component.activatedFilters$ = new BehaviorSubject<ActiveFilters>({});
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('subscribes to keyword codes from the service', () => {
		fixture.detectChanges();
		expect(component.allKeywords).toEqual(expect.arrayContaining(KEYWORDS));
		expect(component.allKeywords.length).toBe(KEYWORDS.length);
	});

	// #257: the glossary arrives ordered by code; the facet must present it ordered by the label
	// the user actually reads, with locale-aware collation for umlauts.
	it('lists the keyword options alphabetically by localized label', async () => {
		fixture.detectChanges();
		expect(component.allKeywords.map(k => k.code)).toEqual(['food', 'agri', 'zoilseeds']);

		const options = await firstValueFrom(component.filteredKeywords$);
		expect(options.map(k => component.getKeywordObjectLabel(k))).toEqual(['Essen', 'Landwirtschaft', 'Ölsaaten']);
	});

	it('keeps filtered suggestions alphabetically ordered by label', () => {
		fixture.detectChanges();
		const suggestions = (component as any).filterKeywords('a').map((k: Keyword) => component.getKeywordObjectLabel(k));
		expect(suggestions).toEqual([...suggestions].sort((a: string, b: string) => a.localeCompare(b, 'de', {sensitivity: 'base'})));
	});

	it('exposes the available filter categories', () => {
		// Facets are derived from the schema metadata on init.
		fixture.detectChanges();
		expect(component.availableFilters).toContain('dct:publisher');
		expect(component.availableFilters).toContain('dcat:theme');
	});

	it('renders a select per available filter category', () => {
		fixture.detectChanges();
		const fields = fixture.nativeElement.querySelectorAll('mat-form-field');
		// keyword field + product-type facet (#221) + dimensions facet (#92) + one per available filter
		expect(fields.length).toBe(component.availableFilters.length + 3);
	});

	it('hydrates keyword chips from activated filters on init', () => {
		component.activatedFilters$ = new BehaviorSubject<ActiveFilters>({'dcat:keyword': {agri: true, food: false}});
		fixture.detectChanges();
		expect(component.keywords).toEqual(['agri']);
	});

	describe('onCategoryChange', () => {
		it('records selected options and pushes them through the services', () => {
			fixture.detectChanges();
			component.onCategoryChange('dct:publisher', ['PUB']);
			expect(component.getSelectedOptions('dct:publisher')).toEqual(['PUB']);
			expect(datasetServiceStub.setFilters).toHaveBeenCalled();
			expect(component.activatedFilters$.value['dct:publisher']).toEqual({PUB: true});
		});

		it('clears a category when no options remain', () => {
			fixture.detectChanges();
			component.onCategoryChange('dct:publisher', ['PUB']);
			component.onCategoryChange('dct:publisher', []);
			expect(component.getSelectedOptions('dct:publisher')).toEqual([]);
		});
	});

	describe('keyword add/remove', () => {
		it('add() resolves a label to a code and emits the filter change', () => {
			fixture.detectChanges();
			const clear = jest.fn();
			component.add({value: 'agriculture', chipInput: {clear}} as any);
			expect(component.keywords).toContain('agri');
			expect(component.activatedFilters$.value['dcat:keyword']).toEqual({agri: true});
			expect(clear).toHaveBeenCalled();
		});

		it('add() does not add a duplicate keyword code', () => {
			fixture.detectChanges();
			component.keywords = ['agri'];
			component.add({value: 'agri', chipInput: {clear: jest.fn()}} as any);
			expect(component.keywords).toEqual(['agri']);
		});

		it('selected() adds the chosen option code', () => {
			fixture.detectChanges();
			component.selected({option: {value: 'food'}} as any);
			expect(component.keywords).toContain('food');
		});

		it('remove() drops the keyword code', () => {
			fixture.detectChanges();
			component.keywords = ['agri', 'food'];
			component.remove('agri');
			expect(component.keywords).toEqual(['food']);
		});
	});

	describe('label helpers', () => {
		it('getKeywordLabel returns the localized label for a code', () => {
			expect(component.getKeywordLabel('agri')).toBe('Landwirtschaft');
		});

		it('getKeywordLabel falls back to the code when unknown', () => {
			expect(component.getKeywordLabel('unknown')).toBe('unknown');
		});

		it('getKeywordObjectLabel uses the current language', () => {
			expect(component.getKeywordObjectLabel(KEYWORDS[1])).toBe('Essen');
		});

		it('builds translation keys for fields and enum values', () => {
			expect(component.getTranslationKey('dct:publisher')).toBe('labels.dct:publisher');
			expect(component.getTranslationKeyEnum('dct:publisher', 'PUB')).toBe('choices.dataset.dct:publisher.PUB');
		});
	});

	it('clearFilters resets everything and notifies the services', () => {
		fixture.detectChanges();
		component.keywords = ['agri'];
		component.clearFilters();
		expect(component.keywords).toEqual([]);
		expect(component.activatedFilters$.value).toEqual({});
		expect(datasetServiceStub.setFilters).toHaveBeenCalledWith({});
	});
});

// #221 regression: filter facets are derived from the runtime-fetched dataset schema. When that
// fetch fails, ValidationSchemaFetcherService hands back an empty `{properties:{}}` fallback, which
// parses to zero enum fields. That must not wipe an already-derived facet set — otherwise the
// catalogue silently loses every filter (access rights, availability, status, theme, publisher).
describe('IndexFilterColComponent — empty schema fallback', () => {
	const goodConfig = {
		fields: new Map(Object.entries(ENUM_OPTIONS).map(([key, options]) => [key, {key, enum: options}])),
		steps: [],
		requiredFields: []
	};
	const emptyConfig = {fields: new Map(), steps: [], requiredFields: []};

	async function setupWith(catalogue$: BehaviorSubject<any>): Promise<ComponentFixture<IndexFilterColComponent>> {
		await TestBed.resetTestingModule()
			.configureTestingModule({
				imports: [IndexFilterColComponent, NoopAnimationsModule, provideTranslateTesting()],
				providers: [
					{provide: KeywordService, useValue: {keywords$: of([]), loadKeywords: jest.fn(() => of([])), getKeywordLabels: jest.fn()} as any},
					{provide: DatasetService, useValue: {setFilters: jest.fn()} as any},
					{provide: ActivatedRoute, useValue: {queryParams: of({}), snapshot: {queryParams: {}}} as any},
					{
						provide: DatasetMetadataService,
						useValue: {
							getMetadata: () => catalogue$.asObservable(),
							getCatalogueMetadata: () => catalogue$.asObservable(),
							getEnumOptions: (key: string) => ENUM_OPTIONS[key] ?? []
						} as any
					}
				]
			})
			.compileComponents();

		const f = TestBed.createComponent(IndexFilterColComponent);
		f.componentInstance.activatedFilters$ = new BehaviorSubject<ActiveFilters>({});
		return f;
	}

	it('keeps the last good facet set when an empty fallback schema arrives', async () => {
		const catalogue$ = new BehaviorSubject<any>(goodConfig);
		const f = await setupWith(catalogue$);
		f.detectChanges();

		expect(f.componentInstance.availableFilters).toHaveLength(3);

		// Schema refetch fails -> empty fallback emitted.
		catalogue$.next(emptyConfig);

		expect(f.componentInstance.availableFilters).toHaveLength(3);
		expect(f.componentInstance.filterChoices('dct:accessRights')).toEqual(['PUBLIC', 'NON_PUBLIC']);
	});

	it('still adopts a good schema when the first emission was empty (cold start, offline then online)', async () => {
		const catalogue$ = new BehaviorSubject<any>(emptyConfig);
		const f = await setupWith(catalogue$);
		f.detectChanges();

		expect(f.componentInstance.availableFilters).toHaveLength(0);

		catalogue$.next(goodConfig);

		expect(f.componentInstance.availableFilters).toHaveLength(3);
		expect(f.componentInstance.filterChoices('dcat:theme')).toEqual(['work', 'energy']);
	});
});
