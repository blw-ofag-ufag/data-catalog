import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {provideNativeDateAdapter} from '@angular/material/core';
import {Distribution, DistributionFieldComponent} from './distribution-field.component';
import {ValidationSchemaService} from '../../../../services/validation/validation-schema.service';
import {TranslateService} from '@ngx-translate/core';
import {provideTranslateTesting} from '../../../../../../tests/helpers/translate-testing';
import {stubTranslateService, stubValidationSchemaService} from '../../../../../../tests/helpers/service-stubs';
import {expectCvaContract} from '../../../../../../tests/helpers/cva-harness';

describe('DistributionFieldComponent', () => {
	let component: DistributionFieldComponent;
	let fixture: ComponentFixture<DistributionFieldComponent>;

	const sampleDistribution = (): Distribution => ({
		'dct:identifier': 'dist-1',
		'dcat:accessURL': 'https://example.org/data.csv',
		'adms:status': 'published',
		'dct:format': 'CSV',
		'dct:modified': '2024-01-01',
		'dct:title': {de: 'Titel', fr: 'Titre'},
		'dct:description': {de: 'Beschreibung', fr: 'Description'}
	});

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DistributionFieldComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				provideNativeDateAdapter(),
				{provide: ValidationSchemaService, useValue: stubValidationSchemaService()},
				{provide: TranslateService, useValue: stubTranslateService()}
			]
		}).compileComponents();

		fixture = TestBed.createComponent(DistributionFieldComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('honors the ControlValueAccessor contract', () => {
		expectCvaContract(component);
	});

	describe('writeValue', () => {
		it('populates the FormArray from an array of distributions', () => {
			component.writeValue([sampleDistribution()]);
			expect(component.distributionsArray.length).toBe(1);
			const group = component.distributionsArray.at(0);
			expect(group.get('dct:identifier')!.value).toBe('dist-1');
			expect(group.get('dcat:accessURL')!.value).toBe('https://example.org/data.csv');
		});

		it('converts the dct:modified string into a Date', () => {
			component.writeValue([sampleDistribution()]);
			const modified = component.distributionsArray.at(0).get('dct:modified')!.value;
			expect(modified).toBeInstanceOf(Date);
		});

		it('clears the FormArray on null', () => {
			component.writeValue([sampleDistribution()]);
			component.writeValue(null);
			expect(component.distributionsArray.length).toBe(0);
		});
	});

	describe('add / remove', () => {
		it('addDistribution grows the array', () => {
			expect(component.distributionsArray.length).toBe(0);
			component.addDistribution();
			expect(component.distributionsArray.length).toBe(1);
		});

		it('removeDistribution shrinks the array', () => {
			component.addDistribution();
			component.addDistribution();
			component.removeDistribution(0);
			expect(component.distributionsArray.length).toBe(1);
		});

		it('addDistribution notifies touched', () => {
			const onTouched = jest.fn();
			component.registerOnTouched(onTouched);
			component.addDistribution();
			expect(onTouched).toHaveBeenCalled();
		});
	});

	describe('createDistributionGroup validators (current branch, no #225 fix)', () => {
		it('makes dct:identifier required', () => {
			component.addDistribution();
			const group = component.distributionsArray.at(0);
			expect(group.get('dct:identifier')!.hasError('required')).toBe(true);
		});

		it('makes dcat:accessURL required with a URL pattern', () => {
			component.addDistribution();
			const accessURL = component.distributionsArray.at(0).get('dcat:accessURL')!;
			expect(accessURL.hasError('required')).toBe(true);
			accessURL.setValue('not-a-url');
			expect(accessURL.hasError('pattern')).toBe(true);
			accessURL.setValue('https://valid.example');
			expect(accessURL.valid).toBe(true);
		});

		it('makes adms:status, dct:format, dct:title and dct:description required', () => {
			component.addDistribution();
			const group = component.distributionsArray.at(0);
			expect(group.get('adms:status')!.hasError('required')).toBe(true);
			expect(group.get('dct:format')!.hasError('required')).toBe(true);
			expect(group.get('dct:title')!.hasError('required')).toBe(true);
			expect(group.get('dct:description')!.hasError('required')).toBe(true);
		});

		it('leaves optional fields without a required validator', () => {
			component.addDistribution();
			const group = component.distributionsArray.at(0);
			expect(group.get('dcatap:availability')!.hasError('required')).toBe(false);
			expect(group.get('dct:license')!.hasError('required')).toBe(false);
			expect(group.get('schema:comment')!.hasError('required')).toBe(false);
		});
	});

	describe('registerOnChange', () => {
		it('emits the array value when a distribution is added', () => {
			const onChange = jest.fn();
			component.registerOnChange(onChange);
			component.addDistribution();
			expect(onChange).toHaveBeenCalled();
			const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
			expect(Array.isArray(lastArg)).toBe(true);
		});

		it('emits null when the array becomes empty', () => {
			component.addDistribution();
			const onChange = jest.fn();
			component.registerOnChange(onChange);
			component.removeDistribution(0);
			expect(onChange).toHaveBeenCalledWith(null);
		});
	});

	describe('setDisabledState', () => {
		it('toggles the FormArray', () => {
			component.setDisabledState(true);
			expect(component.distributionsArray.disabled).toBe(true);
			component.setDisabledState(false);
			expect(component.distributionsArray.enabled).toBe(true);
		});
	});

	describe('validate', () => {
		it('returns null when there are no distributions', () => {
			expect(component.validate({} as any)).toBeNull();
		});

		it('reports title/description errors for an invalid distribution', () => {
			component.addDistribution();
			const errors = component.validate({} as any);
			expect(errors).not.toBeNull();
			expect(errors!['distribution_0_title']).toBe(true);
			expect(errors!['distribution_0_description']).toBe(true);
		});
	});

	describe('isSubfieldRequired', () => {
		it('marks identifier, accessURL, status, format, title, description required', () => {
			expect(component.isSubfieldRequired('dct:identifier')).toBe(true);
			expect(component.isSubfieldRequired('dcat:accessURL')).toBe(true);
			expect(component.isSubfieldRequired('adms:status')).toBe(true);
			expect(component.isSubfieldRequired('dct:format')).toBe(true);
			expect(component.isSubfieldRequired('dct:title')).toBe(true);
			expect(component.isSubfieldRequired('dct:description')).toBe(true);
		});

		it('does not mark optional subfields required', () => {
			expect(component.isSubfieldRequired('dct:license')).toBe(false);
			expect(component.isSubfieldRequired('schema:comment')).toBe(false);
		});
	});

	describe('template', () => {
		it('renders the no-distributions message when empty', () => {
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.no-distributions-message')).not.toBeNull();
		});

		it('renders a distribution card after adding one', () => {
			component.addDistribution();
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelectorAll('.distribution-card').length).toBe(1);
		});

		it('still renders the dct:identifier input (current branch, no #225 fix)', () => {
			component.addDistribution();
			fixture.detectChanges();
			const identifierInput = fixture.nativeElement.querySelector('input[formControlName="dct:identifier"]');
			expect(identifierInput).not.toBeNull();
		});

		it('renders identifier/status/format/modified in the first row (current order)', () => {
			component.addDistribution();
			fixture.detectChanges();
			const firstRow = fixture.nativeElement.querySelector('.distribution-card .ob-card-body .ob-flex.ob-flex-wrap');
			expect(firstRow.querySelector('input[formControlName="dct:identifier"]')).not.toBeNull();
			expect(firstRow.querySelector('mat-select[formControlName="adms:status"]')).not.toBeNull();
			expect(firstRow.querySelector('input[formControlName="dct:format"]')).not.toBeNull();
			expect(firstRow.querySelector('input[formControlName="dct:modified"]')).not.toBeNull();
		});

		it('shows the required help block when required', () => {
			component.required = true;
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.field-help')).not.toBeNull();
		});
	});

	describe('status / availability / license options', () => {
		it('builds the status options from the translate service', () => {
			fixture.detectChanges();
			expect(component.statuses.length).toBeGreaterThan(0);
			expect(component.statuses.some(s => s.value === 'published')).toBe(true);
		});

		it('builds availability and license options', () => {
			fixture.detectChanges();
			expect(component.availabilities.some(a => a.value === 'AVAILABLE')).toBe(true);
			expect(component.licenses.some(l => l.value === 'cc-zero')).toBe(true);
		});
	});
});
