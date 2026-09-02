import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {BehaviorSubject} from 'rxjs';
import {DatasetPickerFieldComponent} from './dataset-picker-field.component';
import {MultiDatasetService} from '../../../../services/api/multi-dataset-service.service';
import {provideTranslateTesting} from '../../../../../../tests/helpers/translate-testing';
import {expectCvaContract} from '../../../../../../tests/helpers/cva-harness';

describe('DatasetPickerFieldComponent', () => {
	let component: DatasetPickerFieldComponent;
	let fixture: ComponentFixture<DatasetPickerFieldComponent>;
	let datasets$: BehaviorSubject<any[]>;
	let ensureIndexLoaded: jest.Mock;

	const CATALOGUE = [
		{'dct:identifier': 'ds-001', 'dct:title': {de: 'Alpha', fr: 'Alpha', it: 'Alpha', en: 'Alpha'}, productType: 'dataset'},
		{'dct:identifier': 'ds-002', 'dct:title': {de: 'Beta', fr: 'Beta', it: 'Beta', en: 'Beta'}, productType: 'dataset'},
		{'dct:identifier': 'svc-1', 'dct:title': {de: 'Service', fr: 'Service', it: 'Service', en: 'Service'}, productType: 'dataService'}
	];

	beforeEach(async () => {
		datasets$ = new BehaviorSubject<any[]>(CATALOGUE);
		ensureIndexLoaded = jest.fn();

		await TestBed.configureTestingModule({
			imports: [DatasetPickerFieldComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [{provide: MultiDatasetService, useValue: {datasets$, ensureIndexLoaded}}]
		}).compileComponents();

		fixture = TestBed.createComponent(DatasetPickerFieldComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create and warm the catalogue index', () => {
		expect(component).toBeTruthy();
		expect(ensureIndexLoaded).toHaveBeenCalled();
	});

	it('honors the ControlValueAccessor contract', () => {
		expectCvaContract(component);
	});

	it('writeValue resolves selected ids to titled tiles', () => {
		component.writeValue(['ds-001']);
		expect(component.selectedTiles()).toEqual([{id: 'ds-001', title: 'Alpha'}]);
	});

	it('add() appends an id and propagates via onChange', () => {
		const changes: string[][] = [];
		component.registerOnChange(v => changes.push(v));
		component.writeValue(['ds-001']);
		component.startAdding();
		component.add('ds-002');
		expect(component.selectedIds).toEqual(['ds-001', 'ds-002']);
		expect(changes.at(-1)).toEqual(['ds-001', 'ds-002']);
		expect(component.adding).toBe(false);
	});

	it('remove() drops an id and propagates via onChange', () => {
		const changes: string[][] = [];
		component.writeValue(['ds-001', 'ds-002']);
		component.registerOnChange(v => changes.push(v));
		component.remove('ds-001');
		expect(component.selectedIds).toEqual(['ds-002']);
		expect(changes.at(-1)).toEqual(['ds-002']);
	});

	it('addableDatasets excludes selected ids and non-dataset products', () => {
		component.writeValue(['ds-001']);
		const ids = component.addableDatasets().map(d => d['dct:identifier']);
		expect(ids).toEqual(['ds-002']); // ds-001 selected, svc-1 is a dataService
	});

	it('addableDatasets filters by the search text (title or id)', () => {
		component.writeValue([]);
		component.searchControl.setValue('beta');
		expect(component.addableDatasets().map(d => d['dct:identifier'])).toEqual(['ds-002']);
	});
});
