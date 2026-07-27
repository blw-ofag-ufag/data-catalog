import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AffiliatedPersonsFieldComponent, AffiliatedPerson} from './affiliated-persons-field.component';
import {ValidationSchemaService} from '../../../../services/validation/validation-schema.service';
import {provideTranslateTesting} from '../../../../../../tests/helpers/translate-testing';
import {stubValidationSchemaService} from '../../../../../../tests/helpers/service-stubs';
import {expectCvaContract} from '../../../../../../tests/helpers/cva-harness';

describe('AffiliatedPersonsFieldComponent', () => {
	let component: AffiliatedPersonsFieldComponent;
	let fixture: ComponentFixture<AffiliatedPersonsFieldComponent>;

	const owner = (): AffiliatedPerson => ({'prov:agent': 'agent-1', 'dcat:hadRole': 'dataOwner'});
	const steward = (): AffiliatedPerson => ({'prov:agent': 'agent-2', 'dcat:hadRole': 'dataSteward'});

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AffiliatedPersonsFieldComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [{provide: ValidationSchemaService, useValue: stubValidationSchemaService()}]
		}).compileComponents();

		fixture = TestBed.createComponent(AffiliatedPersonsFieldComponent);
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
		it('populates the FormArray', () => {
			component.writeValue([owner(), steward()]);
			expect(component.personsArray.length).toBe(2);
			expect(component.personsArray.at(0).get('prov:agent')!.value).toBe('agent-1');
			expect(component.personsArray.at(1).get('dcat:hadRole')!.value).toBe('dataSteward');
		});

		it('clears the FormArray on null', () => {
			component.writeValue([owner()]);
			component.writeValue(null);
			expect(component.personsArray.length).toBe(0);
		});
	});

	describe('add / remove', () => {
		it('addPerson grows the array', () => {
			component.addPerson();
			expect(component.personsArray.length).toBe(1);
		});

		it('removePerson shrinks the array', () => {
			component.addPerson();
			component.addPerson();
			component.removePerson(0);
			expect(component.personsArray.length).toBe(1);
		});

		it('addPerson notifies touched', () => {
			const onTouched = jest.fn();
			component.registerOnTouched(onTouched);
			component.addPerson();
			expect(onTouched).toHaveBeenCalled();
		});
	});

	describe('createPersonGroup validators', () => {
		it('makes prov:agent and dcat:hadRole required', () => {
			component.addPerson();
			const group = component.personsArray.at(0);
			expect(group.get('prov:agent')!.hasError('required')).toBe(true);
			expect(group.get('dcat:hadRole')!.hasError('required')).toBe(true);
		});

		it('validates schema:email format', () => {
			component.addPerson();
			const email = component.personsArray.at(0).get('schema:email')!;
			email.setValue('not-an-email');
			expect(email.hasError('email')).toBe(true);
			email.setValue('a@b.com');
			expect(email.hasError('email')).toBe(false);
		});

		it('leaves schema:name optional', () => {
			component.addPerson();
			expect(component.personsArray.at(0).get('schema:name')!.hasError('required')).toBe(false);
		});
	});

	describe('registerOnChange', () => {
		it('emits the array value when a person is added', () => {
			const onChange = jest.fn();
			component.registerOnChange(onChange);
			component.addPerson();
			expect(onChange).toHaveBeenCalled();
		});

		it('emits null when the array becomes empty', () => {
			component.addPerson();
			const onChange = jest.fn();
			component.registerOnChange(onChange);
			component.removePerson(0);
			expect(onChange).toHaveBeenCalledWith(null);
		});
	});

	describe('setDisabledState', () => {
		it('toggles the FormArray', () => {
			component.setDisabledState(true);
			expect(component.personsArray.disabled).toBe(true);
			component.setDisabledState(false);
			expect(component.personsArray.enabled).toBe(true);
		});
	});

	describe('validate', () => {
		it('returns required when empty and required input is set', () => {
			component.required = true;
			expect(component.validate({} as any)).toEqual(expect.objectContaining({required: true}));
		});

		it('returns null when empty and not required', () => {
			expect(component.validate({} as any)).toBeNull();
		});

		it('flags missing Data Owner and Data Steward', () => {
			component.writeValue([{'prov:agent': 'x', 'dcat:hadRole': 'dataCustodian'}]);
			const errors = component.validate({} as any);
			expect(errors!['dataOwnerCount']).toBeDefined();
			expect(errors!['dataStewardCount']).toBeDefined();
		});

		it('flags more than one Data Owner', () => {
			component.writeValue([owner(), owner(), steward()]);
			const errors = component.validate({} as any);
			expect(errors!['dataOwnerCount'].actual).toBe(2);
		});

		it('returns null when exactly one owner and one steward present', () => {
			component.writeValue([owner(), steward()]);
			expect(component.validate({} as any)).toBeNull();
		});
	});

	describe('role error getters', () => {
		it('reports hasRoleErrors when roles are wrong', () => {
			component.writeValue([{'prov:agent': 'x', 'dcat:hadRole': 'dataCustodian'}]);
			expect(component.hasRoleErrors).toBe(true);
			expect(component.dataOwnerError).toBe('A Data Owner is required');
			expect(component.dataStewardError).toBe('At least one Data Steward is required');
		});

		it('clears errors when roles are correct', () => {
			component.writeValue([owner(), steward()]);
			expect(component.hasRoleErrors).toBe(false);
			expect(component.dataOwnerError).toBeNull();
			expect(component.dataStewardError).toBeNull();
		});
	});

	describe('isSubfieldRequired', () => {
		it('marks prov:agent and dcat:hadRole required', () => {
			expect(component.isSubfieldRequired('prov:agent')).toBe(true);
			expect(component.isSubfieldRequired('dcat:hadRole')).toBe(true);
		});

		it('does not mark name/email required', () => {
			expect(component.isSubfieldRequired('schema:name')).toBe(false);
			expect(component.isSubfieldRequired('schema:email')).toBe(false);
		});
	});

	describe('template', () => {
		it('renders the no-persons message when empty', () => {
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.no-persons-message')).not.toBeNull();
		});

		it('renders a person card after adding one', () => {
			component.addPerson();
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelectorAll('.person-card').length).toBe(1);
		});

		it('renders prov:agent and role inputs in a card', () => {
			component.addPerson();
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('input[formControlName="prov:agent"]')).not.toBeNull();
			expect(fixture.nativeElement.querySelector('mat-select[formControlName="dcat:hadRole"]')).not.toBeNull();
		});
	});
});
