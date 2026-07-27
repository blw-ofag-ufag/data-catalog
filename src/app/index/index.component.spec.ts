import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of} from 'rxjs';
import {IndexComponent} from './index.component';
import {DatasetService} from '../services/api/api.service';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

describe('IndexComponent', () => {
	let component: IndexComponent;
	let fixture: ComponentFixture<IndexComponent>;

	const schemas$ = of([{'dct:identifier': 'a'}, {'dct:identifier': 'b'}]);
	const datasetServiceStub = {schemas$} as any;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [IndexComponent],
			imports: [NoopAnimationsModule, provideTranslateTesting()],
			providers: [{provide: DatasetService, useValue: datasetServiceStub}],
			// Child components (landing-header, index-switch) are rendered shallowly.
			schemas: [NO_ERRORS_SCHEMA]
		}).compileComponents();

		fixture = TestBed.createComponent(IndexComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('exposes the dataset service schemas$ stream', () => {
		expect(component.datasets$).toBe(schemas$);
	});

	it('renders the landing-header and index-switch children', () => {
		fixture.detectChanges();
		const host: HTMLElement = fixture.nativeElement;
		expect(host.querySelector('landing-header')).not.toBeNull();
		expect(host.querySelector('index-switch')).not.toBeNull();
	});
});
