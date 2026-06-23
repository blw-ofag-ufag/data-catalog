import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ValidationAlertComponent, ValidationGroup} from './validation-alert.component';
import {provideTranslateTesting} from '../../../../../tests/helpers/translate-testing';

describe('ValidationAlertComponent', () => {
	let component: ValidationAlertComponent;
	let fixture: ComponentFixture<ValidationAlertComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ValidationAlertComponent, NoopAnimationsModule, provideTranslateTesting()]
		}).compileComponents();

		fixture = TestBed.createComponent(ValidationAlertComponent);
		component = fixture.componentInstance;
	});

	const group = (overrides: Partial<ValidationGroup> = {}): ValidationGroup => ({
		name: 'Base Requirements',
		color: '#ff9800',
		alertType: 'warning',
		errors: ['Field A is required'],
		...overrides
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('does not render an alert when there is no validation group', () => {
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('ob-alert')).toBeNull();
	});

	it('does not render an alert when there are no errors', () => {
		component.validationGroup = group({errors: []});
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('ob-alert')).toBeNull();
	});

	it('renders the alert, name, error count and each error item when errors exist', () => {
		component.validationGroup = group({errors: ['Field A is required', 'Field B is invalid']});
		fixture.detectChanges();
		const host: HTMLElement = fixture.nativeElement;
		expect(host.querySelector('ob-alert')).not.toBeNull();
		expect(host.querySelector('.validation-header strong')?.textContent).toContain('Base Requirements');
		expect(host.querySelector('.error-count')?.textContent).toContain('2');
		const items = host.querySelectorAll('.validation-error-item');
		expect(items.length).toBe(2);
		expect(items[0].textContent).toContain('Field A is required');
		expect(items[1].textContent).toContain('Field B is invalid');
	});

	describe('getValidationDescription', () => {
		it('returns the I14Y description key', () => {
			component.validationGroup = group({name: 'I14Y Requirements'});
			expect(component.getValidationDescription()).toBe('validation.i14y.description');
		});

		it('returns the ODS description key', () => {
			component.validationGroup = group({name: 'Open Data Swiss Requirements'});
			expect(component.getValidationDescription()).toBe('validation.ods.description');
		});

		it('returns the base description key', () => {
			component.validationGroup = group({name: 'Base Requirements'});
			expect(component.getValidationDescription()).toBe('validation.base.description');
		});

		it('falls back to the generic description for unknown names', () => {
			component.validationGroup = group({name: 'Something Else'});
			expect(component.getValidationDescription()).toBe('validation.generic.description');
		});

		it('returns an empty string when there is no group', () => {
			expect(component.getValidationDescription()).toBe('');
		});
	});

	describe('getValidationCssClass', () => {
		it('slugifies the group name', () => {
			component.validationGroup = group({name: 'I14Y Requirements'});
			expect(component.getValidationCssClass()).toBe('validation-alert-i14y-requirements');
		});

		it('returns an empty string when there is no group', () => {
			expect(component.getValidationCssClass()).toBe('');
		});
	});
});
