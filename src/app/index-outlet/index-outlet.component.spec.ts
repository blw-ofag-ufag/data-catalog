import {NO_ERRORS_SCHEMA, SimpleChange} from '@angular/core';
import {AsyncPipe} from '@angular/common';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {TranslatePipe} from '@ngx-translate/core';
import {BehaviorSubject, of} from 'rxjs';
import {IndexOutletComponent} from './index-outlet.component';
import {DatasetService} from '../services/api/api.service';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

describe('IndexOutletComponent', () => {
	let component: IndexOutletComponent;
	let fixture: ComponentFixture<IndexOutletComponent>;

	const page$ = new BehaviorSubject<PageEvent>({pageIndex: 0, pageSize: 6, length: 0});
	const datasetServiceStub = {
		page$,
		filteredLength$: of(2),
		onPageChange: jest.fn(),
		setPageSize: jest.fn()
	} as any;

	beforeEach(async () => {
		datasetServiceStub.onPageChange.mockClear();
		datasetServiceStub.setPageSize.mockClear();
		page$.next({pageIndex: 0, pageSize: 6, length: 0});

		await TestBed.configureTestingModule({
			imports: [IndexOutletComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [{provide: DatasetService, useValue: datasetServiceStub}]
		})
			// The card/list children pull in their own router & service deps; render them shallowly.
			.overrideComponent(IndexOutletComponent, {
				set: {imports: [MatPaginator, AsyncPipe, TranslatePipe], schemas: [NO_ERRORS_SCHEMA]}
			})
			.compileComponents();

		fixture = TestBed.createComponent(IndexOutletComponent);
		component = fixture.componentInstance;
		component.dataset$ = of([{'dct:identifier': 'a'}, {'dct:identifier': 'b'}] as any);
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('renders the tile (cards) child in tile view', () => {
		component.view = 'tile';
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('index-cards')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('index-list')).toBeNull();
	});

	it('renders the table (list) child in table view', () => {
		component.view = 'table';
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('index-list')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('index-cards')).toBeNull();
	});

	it('shows the no-results message when the list is empty', () => {
		component.view = 'tile';
		component.dataset$ = of([] as any);
		fixture.detectChanges();
		const msg = fixture.nativeElement.querySelector('.no-results-message');
		expect(msg).not.toBeNull();
		expect(fixture.nativeElement.querySelector('index-cards')).toBeNull();
	});

	it('forwards paginator events to the service', () => {
		const event: PageEvent = {pageIndex: 1, pageSize: 9, length: 20};
		component.onPageChange(event);
		expect(datasetServiceStub.onPageChange).toHaveBeenCalledWith(event);
	});

	describe('ngOnChanges view-specific page size', () => {
		function changeView(view: 'table' | 'tile') {
			component.view = view;
			component.ngOnChanges({view: new SimpleChange(undefined, view, true)});
		}

		it('applies the tile default page size (6)', () => {
			changeView('tile');
			expect(datasetServiceStub.setPageSize).toHaveBeenCalledWith(6);
		});

		it('applies the table default page size (10)', () => {
			changeView('table');
			expect(datasetServiceStub.setPageSize).toHaveBeenCalledWith(10);
		});

		it('keeps a custom page size set by the user', () => {
			page$.next({pageIndex: 0, pageSize: 25, length: 0});
			changeView('table');
			expect(datasetServiceStub.setPageSize).not.toHaveBeenCalled();
		});
	});
});
