import {NO_ERRORS_SCHEMA} from '@angular/core';
import {AsyncPipe, DatePipe} from '@angular/common';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router, RouterLink, provideRouter} from '@angular/router';
import {MatCard, MatCardContent, MatCardHeader, MatCardImage, MatCardSubtitle, MatCardTitle} from '@angular/material/card';
import {MatChip} from '@angular/material/chips';
import {TranslatePipe} from '@ngx-translate/core';
import {of} from 'rxjs';
import {IndexCardsComponent} from './index-cards.component';
import {OrgPipe} from '../org.pipe';
import {TranslateFieldPipe} from '../translate-field.pipe';
import {DatasetService} from '../services/api/api.service';
import {KeywordService} from '../services/api/keyword.service';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

function makeDataset(overrides: any = {}): any {
	return {
		'dct:identifier': 'id-1',
		'dct:publisher': 'PUB',
		'dct:title': {de: 'Titel', en: 'Title'},
		'dct:description': {de: 'Beschr', en: 'Desc'},
		'dct:issued': '2024-01-01',
		'dcat:keyword': ['kw1', 'kw2'],
		...overrides
	};
}

describe('IndexCardsComponent', () => {
	let component: IndexCardsComponent;
	let fixture: ComponentFixture<IndexCardsComponent>;

	const datasets = [makeDataset({'dct:identifier': 'id-1'}), makeDataset({'dct:identifier': 'id-2'})];

	const datasetServiceStub = {
		getLocalizedKeywords: jest.fn((d: any) => (d['dcat:keyword'] as string[]) ?? [])
	} as any;

	const keywordServiceStub = {
		getKeywordLabels: jest.fn().mockReturnValue(null)
	} as any;

	const routeStub = {
		snapshot: {queryParams: {}}
	} as any;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [IndexCardsComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				provideRouter([]),
				{provide: DatasetService, useValue: datasetServiceStub},
				{provide: KeywordService, useValue: keywordServiceStub},
				{provide: ActivatedRoute, useValue: routeStub}
			]
		})
			// Drop NgOptimizedImage: its strict width validation rejects the template's width="100%".
			.overrideComponent(IndexCardsComponent, {
				set: {
					imports: [
						MatCard,
						MatCardHeader,
						MatCardContent,
						MatCardTitle,
						MatCardSubtitle,
						MatCardImage,
						AsyncPipe,
						DatePipe,
						MatChip,
						OrgPipe,
						RouterLink,
						TranslatePipe,
						TranslateFieldPipe
					],
					schemas: [NO_ERRORS_SCHEMA]
				}
			})
			.compileComponents();

		fixture = TestBed.createComponent(IndexCardsComponent);
		component = fixture.componentInstance;
		component.datasets$ = of(datasets);
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('renders a card per dataset from the input stream', () => {
		fixture.detectChanges();
		const cards = fixture.nativeElement.querySelectorAll('mat-card');
		expect(cards.length).toBe(2);
	});

	it('renders an empty grid for an empty dataset list', () => {
		component.datasets$ = of([]);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelectorAll('mat-card').length).toBe(0);
	});

	describe('keywordFiltered', () => {
		it('builds query params for a fresh keyword', () => {
			const result = component.keywordFiltered('kw1', makeDataset());
			expect(result['dcat:keyword']).toBe('kw1');
		});

		it('merges with existing keyword params without duplicating', () => {
			routeStub.snapshot.queryParams = {'dcat:keyword': 'existing'};
			const result = component.keywordFiltered('kw1', makeDataset());
			expect(result['dcat:keyword']).toBe('existing,kw1');
			routeStub.snapshot.queryParams = {};
		});

		it('does not append a keyword already present', () => {
			routeStub.snapshot.queryParams = {'dcat:keyword': 'kw1'};
			const result = component.keywordFiltered('kw1', makeDataset());
			expect(result['dcat:keyword']).toBe('kw1');
			routeStub.snapshot.queryParams = {};
		});
	});

	describe('#216 type and publisher chips', () => {
		afterEach(() => {
			routeStub.snapshot.queryParams = {};
		});

		it('builds filter params for a fresh click', () => {
			expect(component.typeFiltered('dataService')).toEqual({productType: 'dataService', page: 1});
			expect(component.typeFiltered()).toEqual({productType: 'dataset', page: 1});
			expect(component.publisherFiltered('PUB')).toEqual({'dct:publisher': 'PUB', page: 1});
		});

		it('preserves filters the user already applied', () => {
			routeStub.snapshot.queryParams = {'dcat:keyword': 'kw1', search: 'milk'};
			const result = component.typeFiltered('dataset');
			expect(result['dcat:keyword']).toBe('kw1');
			expect(result['search']).toBe('milk');
			expect(result['productType']).toBe('dataset');
		});

		it('adds the type to an existing productType filter instead of replacing it', () => {
			routeStub.snapshot.queryParams = {productType: 'dataService'};
			expect(component.typeFiltered('dataset')['productType']).toBe('dataService,dataset');
		});

		it('does not duplicate a type that is already filtered', () => {
			routeStub.snapshot.queryParams = {productType: 'dataset'};
			expect(component.typeFiltered('dataset')['productType']).toBe('dataset');
		});

		it('adds the publisher to an existing publisher filter', () => {
			routeStub.snapshot.queryParams = {'dct:publisher': 'A'};
			expect(component.publisherFiltered('B')['dct:publisher']).toBe('A,B');
		});

		it('resets pagination, because the result set changes', () => {
			routeStub.snapshot.queryParams = {page: 4};
			expect(component.typeFiltered('dataset')['page']).toBe(1);
		});
	});

	describe('keyword expansion', () => {
		it('toggles expansion state for a dataset id', () => {
			const event = {preventDefault: jest.fn(), stopPropagation: jest.fn()} as any;
			expect(component.isExpanded('id-1')).toBe(false);
			component.toggleKeywordExpansion('id-1', event);
			expect(component.isExpanded('id-1')).toBe(true);
			component.toggleKeywordExpansion('id-1', event);
			expect(component.isExpanded('id-1')).toBe(false);
			expect(event.preventDefault).toHaveBeenCalled();
			expect(event.stopPropagation).toHaveBeenCalled();
		});

		it('getChipContainerClass reflects expansion', () => {
			expect(component.getChipContainerClass('id-1')).toBe('chip-container collapsed');
			component.toggleKeywordExpansion('id-1', {preventDefault: jest.fn(), stopPropagation: jest.fn()} as any);
			expect(component.getChipContainerClass('id-1')).toBe('chip-container expanded');
		});
	});

	describe('visible / hidden keyword split', () => {
		it('splits a long keyword list into visible and hidden', () => {
			const longKeywords = Array.from({length: 20}, (_, i) => `keyword-number-${i}`);
			datasetServiceStub.getLocalizedKeywords.mockReturnValueOnce(longKeywords);
			const visible = component.getVisibleKeywords(makeDataset({'dct:identifier': 'big'}), 'big');
			expect(visible.length).toBeGreaterThan(0);
			expect(visible.length).toBeLessThan(longKeywords.length);
			expect(component.hasHiddenKeywords(makeDataset({'dct:identifier': 'big'}), 'big')).toBe(true);
		});

		it('reports no hidden keywords for an empty list', () => {
			datasetServiceStub.getLocalizedKeywords.mockReturnValueOnce([]);
			expect(component.hasHiddenKeywords(makeDataset(), 'empty')).toBe(false);
		});
	});

	it('openDataset navigates to details with publisher and dataset params', async () => {
		const router = TestBed.inject(Router);
		const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
		await component.openDataset('PUB', 'id-1');
		expect(navigate).toHaveBeenCalledWith(['details'], {
			queryParams: {publisher: 'PUB', dataset: 'id-1', type: 'dataset'},
			queryParamsHandling: 'replace'
		});
	});

	it('onChipClick suppresses default navigation', () => {
		const event = {preventDefault: jest.fn(), stopPropagation: jest.fn()} as any;
		component.onChipClick(event);
		expect(event.preventDefault).toHaveBeenCalled();
		expect(event.stopPropagation).toHaveBeenCalled();
	});
});
