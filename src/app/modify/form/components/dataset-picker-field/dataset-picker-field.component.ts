import {Component, Input, OnDestroy, OnInit, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {Subject, takeUntil} from 'rxjs';
import {DataProduct} from '../../../../models/schemas/dataset';
import {MultiDatasetService} from '../../../../services/api/multi-dataset-service.service';
import {FormFieldTooltipComponent} from '../form-field-tooltip/form-field-tooltip.component';
import {FieldDebugOverlayComponent} from '../field-debug-overlay/field-debug-overlay.component';

/**
 * Reference-array picker for a container type's member datasets — datasetSeries `dcat:dataset` and
 * dataService `dcat:servesDataset` (#221). Renders the selected datasets as tiles plus an
 * "Add Dataset" tile (inline autocomplete over the catalogue), instead of a raw text input. The
 * form-control value is a plain `string[]` of dataset identifiers.
 */
@Component({
	selector: 'app-dataset-picker-field',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		TranslatePipe,
		MatFormFieldModule,
		MatInputModule,
		MatAutocompleteModule,
		MatIconModule,
		MatButtonModule,
		FormFieldTooltipComponent,
		FieldDebugOverlayComponent
	],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => DatasetPickerFieldComponent),
			multi: true
		}
	],
	templateUrl: './dataset-picker-field.component.html',
	styleUrl: './dataset-picker-field.component.scss'
})
export class DatasetPickerFieldComponent implements ControlValueAccessor, OnInit, OnDestroy {
	@Input() label = '';
	@Input() fieldName?: string;

	selectedIds: string[] = [];
	adding = false;
	readonly searchControl = new FormControl('');
	disabled = false;

	private allDatasets: DataProduct[] = [];
	private readonly destroy$ = new Subject<void>();
	private onChange: (value: string[]) => void = () => {};
	private onTouched: () => void = () => {};

	constructor(
		private readonly datasetService: MultiDatasetService,
		private readonly translate: TranslateService
	) {}

	ngOnInit(): void {
		// Warm the catalogue index so the picker has datasets to offer, even in create mode / on a
		// deep link where the index route was never visited.
		this.datasetService.ensureIndexLoaded();
		this.datasetService.datasets$.pipe(takeUntil(this.destroy$)).subscribe(datasets => (this.allDatasets = datasets ?? []));
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	// --- ControlValueAccessor ---
	writeValue(value: unknown): void {
		this.selectedIds = Array.isArray(value) ? (value as string[]).slice() : [];
	}
	registerOnChange(fn: (value: string[]) => void): void {
		this.onChange = fn;
	}
	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}
	setDisabledState(isDisabled: boolean): void {
		this.disabled = isDisabled;
	}

	selectedTiles(): {id: string; title: string}[] {
		return this.selectedIds.map(id => ({id, title: this.titleFor(id)}));
	}

	// Datasets available to add: catalogue items of type 'dataset' (containers hold datasets), not
	// already selected, filtered by the current search text (title or id).
	addableDatasets(): DataProduct[] {
		const query = (this.searchControl.value ?? '').toLowerCase();
		return this.allDatasets.filter(d => {
			const type = (d as unknown as {productType?: string}).productType;
			const id = d['dct:identifier'];
			if (!(type === 'dataset' || !type) || this.selectedIds.includes(id)) {
				return false;
			}
			if (!query) {
				return true;
			}
			return this.titleFor(id).toLowerCase().includes(query) || id.toLowerCase().includes(query);
		});
	}

	startAdding(): void {
		if (this.disabled) {
			return;
		}
		this.adding = true;
		this.searchControl.setValue('');
	}

	onOptionSelected(event: MatAutocompleteSelectedEvent): void {
		this.add(event.option.value as string);
	}

	add(id: string): void {
		if (id && !this.selectedIds.includes(id)) {
			this.selectedIds = [...this.selectedIds, id];
			this.onChange(this.selectedIds);
			this.onTouched();
		}
		this.adding = false;
		this.searchControl.setValue('');
	}

	remove(id: string): void {
		if (this.disabled) {
			return;
		}
		this.selectedIds = this.selectedIds.filter(existing => existing !== id);
		this.onChange(this.selectedIds);
		this.onTouched();
	}

	titleFor(id: string): string {
		const ds = this.allDatasets.find(d => d['dct:identifier'] === id);
		const title = ds?.['dct:title'];
		if (title && typeof title === 'object') {
			const lang = this.translate.currentLang || 'de';
			const t = title as Record<string, string>;
			return t[lang] || t['de'] || t['fr'] || t['it'] || t['en'] || id;
		}
		return typeof title === 'string' ? title : id;
	}
}
