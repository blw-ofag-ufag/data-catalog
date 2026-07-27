import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router, provideRouter} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';
import {IndexSwitchComponent} from './index-switch.component';
import {DatasetService} from '../services/api/api.service';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

describe('IndexSwitchComponent', () => {
	let component: IndexSwitchComponent;
	let fixture: ComponentFixture<IndexSwitchComponent>;

	const queryParams = new BehaviorSubject<any>({});
	const datasetServiceStub = {
		searchTerm$: of(''),
		sort$: of('title'),
		page$: of({pageIndex: 0, pageSize: 6, length: 0}),
		filteredLength$: of(0),
		setFilters: jest.fn().mockResolvedValue(undefined),
		search: jest.fn(),
		setSort: jest.fn(),
		onPageChange: jest.fn(),
		setPageSize: jest.fn()
	} as any;

	const routeStub = {
		queryParams: queryParams.asObservable(),
		snapshot: {queryParams: {}}
	} as any;

	beforeEach(async () => {
		jest.clearAllMocks();
		queryParams.next({});

		await TestBed.configureTestingModule({
			imports: [IndexSwitchComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [provideRouter([]), {provide: DatasetService, useValue: datasetServiceStub}, {provide: ActivatedRoute, useValue: routeStub}]
		})
			// Oblique directives and the filter/outlet children are not the unit under test;
			// render an empty template and exercise the component logic directly.
			.overrideComponent(IndexSwitchComponent, {set: {imports: [], template: '', schemas: [NO_ERRORS_SCHEMA]}})
			.compileComponents();

		fixture = TestBed.createComponent(IndexSwitchComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('defaults to the tile view', () => {
		expect(component.view).toBe('tile');
	});

	describe('ngOnInit reacts to query params', () => {
		it('reads the view and pushes parsed filters to the service', () => {
			queryParams.next({view: 'table', 'dct:publisher': 'PUB'});
			fixture.detectChanges();
			expect(component.view).toBe('table');
			expect(datasetServiceStub.setFilters).toHaveBeenCalled();
			expect(component.activatedFilters$.value['dct:publisher']).toEqual({PUB: true});
		});

		it('honours the showFilters param', () => {
			queryParams.next({showFilters: 'true'});
			fixture.detectChanges();
			expect(component.showFilters).toBe(true);
		});
	});

	describe('view switching', () => {
		it('switchTo navigates with the view query param merged', async () => {
			const router = TestBed.inject(Router);
			const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
			await component.switchTo('table');
			expect(navigate).toHaveBeenCalledWith([], {queryParams: {view: 'table'}, queryParamsHandling: 'merge'});
		});

		it('toggleShowFilters flips the flag and updates the URL', async () => {
			const router = TestBed.inject(Router);
			const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
			component.showFilters = false;
			await component.toggleShowFilters();
			expect(component.showFilters).toBe(true);
			expect(navigate).toHaveBeenCalledWith([], {queryParams: {showFilters: 'true'}, queryParamsHandling: 'merge'});
		});
	});

	describe('search', () => {
		it('forwards the input value to the service', () => {
			component.search({target: {value: 'wheat'}} as any);
			expect(datasetServiceStub.search).toHaveBeenCalledWith('wheat');
		});

		it('clearSearch sends an empty query', () => {
			component.clearSearch();
			expect(datasetServiceStub.search).toHaveBeenCalledWith('');
		});
	});

	describe('sorting', () => {
		it('setSorting delegates to the service', () => {
			component.setSorting('new');
			expect(datasetServiceStub.setSort).toHaveBeenCalledWith('new');
		});

		it('onSortChangeByType applies a non-empty value', () => {
			component.onSortChangeByType('owner');
			expect(datasetServiceStub.setSort).toHaveBeenCalledWith('owner');
		});

		it('onSortChangeByType ignores a falsy value', () => {
			component.onSortChangeByType('' as any);
			expect(datasetServiceStub.setSort).not.toHaveBeenCalled();
		});

		it('getSortLabel returns the default label for title/null', () => {
			expect(component.getSortLabel('title')).toBe('ui.defaultSelect');
			expect(component.getSortLabel(null)).toBe('ui.defaultSelect');
		});

		it('getSortLabel returns the sort label for other criteria', () => {
			expect(component.getSortLabel('new')).toBe('ui.sort');
		});
	});

	describe('getFilterCount', () => {
		it('returns null when there are no filters', () => {
			expect(component.getFilterCount(null)).toBeNull();
			expect(component.getFilterCount({})).toBeNull();
		});

		it('returns the number of active filter categories', () => {
			expect(component.getFilterCount({'dct:publisher': {PUB: true}, 'dcat:theme': {T: true}})).toBe(2);
		});
	});

	it('openNewDatasetTab navigates to the modify route in new mode', () => {
		const router = TestBed.inject(Router);
		const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
		component.openNewDatasetTab();
		expect(navigate).toHaveBeenCalledWith(['/modify'], {queryParams: {mode: 'new'}});
	});
});
