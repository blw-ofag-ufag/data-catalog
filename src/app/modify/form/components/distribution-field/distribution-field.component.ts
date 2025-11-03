import {Component, Input, OnDestroy, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, FormArray, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {ObButtonDirective} from '@oblique/oblique';

export interface Distribution {
	'dct:identifier': string;
	'dcat:accessURL': string;
	'adms:status': string;
	'dcatap:availability'?: string;
	'dct:format': string;
	'dct:modified': string | null;
	'dcat:downloadURL'?: string;
	'dct:title'?: string;
	'dct:description'?: string;
	'dct:conformsTo'?: string;
	'dct:license'?: string;
	'schema:comment'?: string;
}

@Component({
	selector: 'app-distribution-field',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		TranslatePipe,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		MatButtonModule,
		MatIconModule,
		MatDatepickerModule,
		MatNativeDateModule,
		ObButtonDirective
	],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => DistributionFieldComponent),
			multi: true
		}
	],
	templateUrl: './distribution-field.component.html',
	styleUrl: './distribution-field.component.scss'
})
export class DistributionFieldComponent implements ControlValueAccessor, OnDestroy {
	@Input() label = 'Distributions';
	@Input() required = false;

	distributionsArray: FormArray;
	private readonly destroy$ = new Subject<void>();
	private onChange = (value: Distribution[] | null) => {};
	private onTouched = () => {};

	readonly statuses = [
		{value: '', label: 'Select Status'},
		{value: 'workInProgress', label: 'Work in Progress'},
		{value: 'validated', label: 'Validated'},
		{value: 'published', label: 'Published'},
		{value: 'deleted', label: 'Deleted'},
		{value: 'archived', label: 'Archived'}
	];

	readonly availabilities = [
		{value: '', label: 'Select Availability'},
		{value: 'AVAILABLE', label: 'Available'},
		{value: 'EXPERIMENTAL', label: 'Experimental'},
		{value: 'STABLE', label: 'Stable'},
		{value: 'TEMPORARY', label: 'Temporary'}
	];

	readonly licenses = [
		{value: '', label: 'Select License'},
		{value: 'terms_open', label: 'Open use'},
		{value: 'terms_by', label: 'Open use. Must provide the source'},
		{value: 'terms_ask', label: 'Open use. Use for commercial purposes requires permission'},
		{value: 'terms_by_ask', label: 'Open use. Must provide source. Commercial use requires permission'},
		{value: 'cc-zero', label: 'CC0'},
		{value: 'cc-by/4.0', label: 'CC BY 4.0'},
		{value: 'cc-by-sa/4.0', label: 'CC BY-SA 4.0'}
	];

	constructor(private readonly fb: FormBuilder) {
		this.distributionsArray = this.fb.array([]);

		// Subscribe to form changes
		this.distributionsArray.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
			this.onChange(value.length > 0 ? value : null);
		});
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	writeValue(value: Distribution[] | null): void {
		this.distributionsArray.clear();
		if (value && Array.isArray(value)) {
			value.forEach(distribution => {
				this.distributionsArray.push(this.createDistributionGroup(distribution));
			});
		}
	}

	registerOnChange(fn: (value: Distribution[] | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		if (isDisabled) {
			this.distributionsArray.disable();
		} else {
			this.distributionsArray.enable();
		}
	}

	addDistribution(): void {
		this.distributionsArray.push(this.createDistributionGroup());
		this.onTouched();
	}

	removeDistribution(index: number): void {
		this.distributionsArray.removeAt(index);
		this.onTouched();
	}

	private createDistributionGroup(distribution?: Distribution): FormGroup {
		return this.fb.group({
			'dct:identifier': [distribution?.['dct:identifier'] || '', Validators.required],
			'dcat:accessURL': [distribution?.['dcat:accessURL'] || '', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
			'adms:status': [distribution?.['adms:status'] || '', Validators.required],
			'dcatap:availability': [distribution?.['dcatap:availability'] || ''],
			'dct:format': [distribution?.['dct:format'] || '', Validators.required],
			'dct:modified': [distribution?.['dct:modified'] || null],
			'dcat:downloadURL': [distribution?.['dcat:downloadURL'] || '', Validators.pattern(/^https?:\/\/.+/)],
			'dct:title': [distribution?.['dct:title'] || ''],
			'dct:description': [distribution?.['dct:description'] || ''],
			'dct:conformsTo': [distribution?.['dct:conformsTo'] || ''],
			'dct:license': [distribution?.['dct:license'] || ''],
			'schema:comment': [distribution?.['schema:comment'] || '']
		});
	}

	onBlur(): void {
		this.onTouched();
	}
}
