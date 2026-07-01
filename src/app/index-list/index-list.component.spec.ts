import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router, provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {IndexListComponent} from './index-list.component';
import {DatasetService} from '../services/api/api.service';
import {KeywordService} from '../services/api/keyword.service';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

function makeDataset(overrides: any = {}): any {
	return {
		'dct:identifier': 'id-1',
		'dct:publisher': 'PUB',
		'dct:title': {de: 'Titel', en: 'Title'},
		'dct:issued': '2024-01-01',
		'dcat:keyword': ['kw1', 'kw2'],
		...overrides
	};
}

describe('IndexListComponent', () => {
	let component: IndexListComponent;
	let fixture: ComponentFixture<IndexListComponent>;

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
			imports: [IndexListComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				provideRouter([]),
				{provide: DatasetService, useValue: datasetServiceStub},
				{provide: KeywordService, useValue: keywordServiceStub},
				{provide: ActivatedRoute, useValue: routeStub}
			]
		}).compileComponents();

		fixture = TestBed.createComponent(IndexListComponent);
		component = fixture.componentInstance;
		component.datasets$ = of(datasets);
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('renders a table row per dataset', () => {
		fixture.detectChanges();
		const rows = fixture.nativeElement.querySelectorAll('tbody tr');
		expect(rows.length).toBe(2);
	});

	it('renders only the header for an empty dataset list', () => {
		component.datasets$ = of([]);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(0);
		expect(fixture.nativeElement.querySelectorAll('thead th').length).toBe(4);
	});

	describe('keywordFiltered', () => {
		it('builds params for a fresh keyword and forces the table view', () => {
			const result = component.keywordFiltered('kw1', makeDataset());
			expect(result['dcat:keyword']).toBe('kw1');
			expect(result['view']).toBe('table');
		});

		it('merges with existing keywords', () => {
			routeStub.snapshot.queryParams = {'dcat:keyword': 'existing'};
			const result = component.keywordFiltered('kw1', makeDataset());
			expect(result['dcat:keyword']).toBe('existing,kw1');
			routeStub.snapshot.queryParams = {};
		});
	});

	describe('getStewards', () => {
		it('reads dataSteward names from prov:qualifiedAttribution', () => {
			const ds = makeDataset({
				'prov:qualifiedAttribution': [
					{'dcat:hadRole': 'dataSteward', 'schema:name': 'Alice'},
					{'dcat:hadRole': 'publisher', 'schema:name': 'Ignored'}
				]
			});
			expect(component.getStewards(ds)).toEqual(['Alice']);
		});

		it('falls back to dataOwner when no attribution stewards', () => {
			const ds = makeDataset({dataOwner: 'Owner'});
			expect(component.getStewards(ds)).toEqual(['Owner']);
		});

		it('falls back to the contact point name', () => {
			const ds = makeDataset({'dcat:contactPoint': {'schema:name': 'Contact'}});
			expect(component.getStewards(ds)).toEqual(['Contact']);
		});

		it('returns an empty array when nothing matches', () => {
			expect(component.getStewards(makeDataset())).toEqual([]);
		});
	});

	it('openDataset navigates to details', async () => {
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
