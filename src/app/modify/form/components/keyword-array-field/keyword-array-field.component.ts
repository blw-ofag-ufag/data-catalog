import {Component, Input, OnDestroy, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule} from '@angular/forms';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {Subject, map, startWith, takeUntil} from 'rxjs';
import {TranslatePipe} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {MatIconModule} from '@angular/material/icon';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';

@Component({
	selector: 'app-keyword-array-field',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, TranslatePipe, MatFormFieldModule, MatInputModule, MatChipsModule, MatIconModule, MatAutocompleteModule],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => KeywordArrayFieldComponent),
			multi: true
		}
	],
	templateUrl: './keyword-array-field.component.html',
	styleUrl: './keyword-array-field.component.scss'
})
export class KeywordArrayFieldComponent implements ControlValueAccessor, OnDestroy {
	@Input() label = '';
	@Input() placeholder = '';
	@Input() suggestions: string[] = [];

	separatorKeysCodes: number[] = [ENTER, COMMA];
	inputControl = new FormControl('');
	filteredSuggestions$ = this.inputControl.valueChanges.pipe(
		startWith(''),
		map((value: string | null) => this.filterSuggestions(value || ''))
	);

	values: string[] = [];
	private readonly destroy$ = new Subject<void>();
	private onChange = (value: string[] | null) => {};
	private onTouched = () => {};

	constructor() {
		// Subscribe to input changes for autocomplete
		this.filteredSuggestions$.pipe(takeUntil(this.destroy$)).subscribe();
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	writeValue(value: string[] | null): void {
		this.values = value || [];
	}

	registerOnChange(fn: (value: string[] | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		if (isDisabled) {
			this.inputControl.disable();
		} else {
			this.inputControl.enable();
		}
	}

	onBlur(): void {
		this.onTouched();
	}

	addKeyword(event: MatChipInputEvent): void {
		const value = (event.value || '').trim();
		if (value && !this.values.includes(value)) {
			this.values.push(value);
			this.onChange(this.values);
		}
		event.chipInput.clear();
		this.inputControl.setValue('');
	}

	removeKeyword(keyword: string): void {
		const index = this.values.indexOf(keyword);
		if (index >= 0) {
			this.values.splice(index, 1);
			this.onChange(this.values);
		}
	}

	selectSuggestion(event: MatAutocompleteSelectedEvent): void {
		const value = event.option.viewValue.trim();
		if (value && !this.values.includes(value)) {
			this.values.push(value);
			this.onChange(this.values);
		}
		this.inputControl.setValue('');
	}

	private filterSuggestions(value: string): string[] {
		const filterValue = value.toLowerCase();
		return this.suggestions
			.filter(suggestion => suggestion.toLowerCase().includes(filterValue))
			.filter(suggestion => !this.values.includes(suggestion))
			.slice(0, 10); // Limit to 10 suggestions
	}
}
