import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';
import {IndexFilterColComponent} from './index-filter-col.component';
import {DatasetService} from '../services/api/api.service';
import {KeywordService, Keyword} from '../services/api/keyword.service';
import {ActiveFilters} from '../models/ActiveFilters';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

const KEYWORDS: Keyword[] = [
	{code: 'agri', labels: {de: 'Landwirtschaft', fr: 'agriculture', it: 'agricoltura', en: 'agriculture'}},
	{code: 'food', labels: {de: 'Essen', fr: 'nourriture', it: 'cibo', en: 'food'}}
];

describe('IndexFilterColComponent', () => {
	let component: IndexFilterColComponent;
	let fixture: ComponentFixture<IndexFilterColComponent>;

	const keywordsSubject = new BehaviorSubject<Keyword[]>(KEYWORDS);
	const keywordServiceStub = {
		keywords$: keywordsSubject.asObservable(),
		getKeywordLabels: jest.fn((code: string) => KEYWORDS.find(k => k.code === code)?.labels ?? null)
	} as any;

	const datasetServiceStub = {
		setFilters: jest.fn()
	} as any;

	const routeStub = {
		queryParams: of({}),
		snapshot: {queryParams: {}}
	} as any;

	beforeEach(async () => {
		datasetServiceStub.setFilters.mockClear();

		await TestBed.configureTestingModule({
			imports: [IndexFilterColComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				{provide: KeywordService, useValue: keywordServiceStub},
				{provide: DatasetService, useValue: datasetServiceStub},
				{provide: ActivatedRoute, useValue: routeStub}
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
		expect(component.allKeywords).toEqual(KEYWORDS);
	});

	it('exposes the available filter categories', () => {
		expect(component.availableFilters).toContain('dct:publisher');
		expect(component.availableFilters).toContain('dcat:theme');
	});

	it('renders a select per available filter category', () => {
		fixture.detectChanges();
		const fields = fixture.nativeElement.querySelectorAll('mat-form-field');
		// one keyword field + one per available filter
		expect(fields.length).toBe(component.availableFilters.length + 1);
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
