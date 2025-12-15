import {Component, Input, OnDestroy, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AbstractControl, ControlValueAccessor, FormArray, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {ObButtonDirective} from '@oblique/oblique';
import {MultilingualTextFieldComponent} from '../multilingual-text-field/multilingual-text-field.component';

export interface MultilingualKeyword {
	de?: string;
	fr?: string;
	it?: string;
	en?: string;
}

export type KeywordsData = string[] | {[key: string]: MultilingualKeyword} | null;

@Component({
	selector: 'app-keywords-field',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		TranslatePipe,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		MatIconModule,
		ObButtonDirective,
		MultilingualTextFieldComponent
	],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => KeywordsFieldComponent),
			multi: true
		}
	],
	templateUrl: './keywords-field.component.html',
	styleUrl: './keywords-field.component.scss'
})
export class KeywordsFieldComponent implements ControlValueAccessor, OnDestroy {
	@Input() label = 'Keywords';
	@Input() placeholder = '';
	@Input() required = false;
	@Input() recommended = false;

	keywordsArray: FormArray;
	private readonly destroy$ = new Subject<void>();
	private onChange = (value: KeywordsData) => {};
	private onTouched = () => {};

	constructor(
		private readonly fb: FormBuilder,
		private readonly translateService: TranslateService
	) {
		this.keywordsArray = this.fb.array([]);

		// Subscribe to form changes
		this.keywordsArray.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
			this.emitValue();
		});
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	writeValue(value: KeywordsData): void {
		this.keywordsArray.clear();

		if (!value) {
			return;
		}

		// Handle legacy string[] format
		if (Array.isArray(value)) {
			value.forEach(keyword => {
				const key = this.sanitizeKey(keyword);
				const group = this.createKeywordGroup(key, {[this.translateService.currentLang || 'en']: keyword});
				this.keywordsArray.push(group);
			});
		}
		// Handle new multilingual format
		else if (typeof value === 'object') {
			Object.entries(value).forEach(([key, translations]) => {
				const group = this.createKeywordGroup(key, translations);
				this.keywordsArray.push(group);
			});
		}
	}

	registerOnChange(fn: (value: KeywordsData) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		if (isDisabled) {
			this.keywordsArray.disable();
		} else {
			this.keywordsArray.enable();
		}
	}

	addKeyword(): void {
		const newKey = ''; // Start with empty key, will be auto-generated from first translation
		this.keywordsArray.push(this.createKeywordGroup(newKey, {}));
		this.onTouched();
	}

	removeKeyword(index: number): void {
		this.keywordsArray.removeAt(index);
		this.emitValue();
		this.onTouched();
	}

	private createKeywordGroup(key: string, translations: MultilingualKeyword): FormGroup {
		const group = this.fb.group({
			key: [key], // Key is optional initially, will be auto-generated
			translations: [translations || {}]
		});

		// Listen to translation changes to auto-generate key if empty
		group
			.get('translations')
			?.valueChanges.pipe(takeUntil(this.destroy$))
			.subscribe(trans => {
				const currentKey = group.get('key')?.value;
				if (!currentKey && trans) {
					// Auto-generate key from first non-empty translation
					const firstTranslation = trans['de'] || trans['fr'] || trans['en'] || trans['it'];
					if (firstTranslation) {
						const autoKey = this.sanitizeKey(firstTranslation);
						group.get('key')?.setValue(autoKey, {emitEvent: false});
					}
				}
			});

		return group;
	}

	private sanitizeKey(key: string): string {
		// Convert to lowercase and replace spaces/special chars with underscores
		return key
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_|_$/g, '');
	}

	private emitValue(): void {
		if (this.keywordsArray.length === 0) {
			this.onChange(null);
			return;
		}

		const result: {[key: string]: MultilingualKeyword} = {};

		this.keywordsArray.controls.forEach(control => {
			const group = control as FormGroup;
			const key = group.get('key')?.value;
			const translations = group.get('translations')?.value;

			if (key && translations && Object.keys(translations).some(lang => translations[lang])) {
				result[key] = translations;
			}
		});

		this.onChange(Object.keys(result).length > 0 ? result : null);
	}

	trackByIndex(index: number): number {
		return index;
	}

	asFormGroup(control: AbstractControl): FormGroup {
		return control as FormGroup;
	}
}
