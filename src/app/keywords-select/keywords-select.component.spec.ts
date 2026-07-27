import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {KeywordsSelectComponent} from './keywords-select.component';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

describe('KeywordsSelectComponent', () => {
	let component: KeywordsSelectComponent;
	let fixture: ComponentFixture<KeywordsSelectComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [KeywordsSelectComponent, NoopAnimationsModule, provideTranslateTesting()]
		}).compileComponents();

		fixture = TestBed.createComponent(KeywordsSelectComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('renders a chip per value', () => {
		component.value = ['alpha', 'beta'];
		fixture.detectChanges();
		const chips = fixture.nativeElement.querySelectorAll('mat-chip-row');
		expect(chips.length).toBe(2);
		expect(fixture.nativeElement.textContent).toContain('alpha');
		expect(fixture.nativeElement.textContent).toContain('beta');
	});

	describe('add', () => {
		it('adds a new keyword and emits the updated list', () => {
			const emitted: string[][] = [];
			component.selectionChange.subscribe(v => emitted.push(v));
			const clear = jest.fn();

			component.add({value: 'newkw', chipInput: {clear}} as any);

			expect(component.value).toContain('newkw');
			expect(emitted[0]).toEqual(['newkw']);
			expect(clear).toHaveBeenCalled();
		});

		it('ignores blank input', () => {
			const onChange = jest.fn();
			component.selectionChange.subscribe(onChange);
			component.add({value: '   ', chipInput: {clear: jest.fn()}} as any);
			expect(component.value).toEqual([]);
			expect(onChange).not.toHaveBeenCalled();
		});

		it('does not add a duplicate keyword', () => {
			component.value = ['dup'];
			const onChange = jest.fn();
			component.selectionChange.subscribe(onChange);
			component.add({value: 'dup', chipInput: {clear: jest.fn()}} as any);
			expect(component.value).toEqual(['dup']);
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('remove', () => {
		it('removes an existing keyword and emits', () => {
			component.value = ['a', 'b'];
			const emitted: string[][] = [];
			component.selectionChange.subscribe(v => emitted.push(v));

			component.remove('a');

			expect(component.value).toEqual(['b']);
			expect(emitted[0]).toEqual(['b']);
		});

		it('does nothing when the keyword is absent', () => {
			component.value = ['a'];
			const onChange = jest.fn();
			component.selectionChange.subscribe(onChange);
			component.remove('missing');
			expect(component.value).toEqual(['a']);
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('selected', () => {
		it('adds the selected option view value and emits', () => {
			const emitted: string[][] = [];
			component.selectionChange.subscribe(v => emitted.push(v));

			component.selected({option: {viewValue: 'picked'}} as any);

			expect(component.value).toEqual(['picked']);
			expect(emitted[0]).toEqual(['picked']);
		});

		it('does not add a duplicate from selection', () => {
			component.value = ['picked'];
			const onChange = jest.fn();
			component.selectionChange.subscribe(onChange);
			component.selected({option: {viewValue: 'picked'}} as any);
			expect(component.value).toEqual(['picked']);
			expect(onChange).not.toHaveBeenCalled();
		});
	});
});
