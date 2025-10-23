import {
	AccessRights,
	AccrualPeriocicites,
	CategorizationsDSG,
	ClassificationLevels,
	DataTypes,
	DatasetAvailabilities,
	DatasetThemes,
	Publishers,
	Statuses
} from '../models/schemas/dataset';
import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {BehaviorSubject, Observable, Subject, map, startWith, tap} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {MatListModule} from '@angular/material/list';
import {MatSelectModule} from '@angular/material/select';
import {DatasetService} from '../services/api/api.service';
import {TranslatePipe} from '@ngx-translate/core';
import {MatTooltip} from '@angular/material/tooltip';
import {MatButton} from '@angular/material/button';
import {ActivatedRoute} from '@angular/router';
import {ActiveFilters, createActiveFiltersFromParams} from '../models/ActiveFilters';
import {MultiDatasetService} from '../services/api/multi-dataset-service.service';

@Component({
	selector: 'index-filter-col',
	imports: [
		CommonModule,
		MatChipsModule,
		MatAutocompleteModule,
		MatIconModule,
		MatChipsModule,
		MatFormFieldModule,
		ReactiveFormsModule,
		MatListModule,
		MatSelectModule,
		TranslatePipe,
		MatTooltip,
		MatButton
	],
	templateUrl: './index-filter-col.component.html',
	styleUrl: './index-filter-col.component.scss'
})
export class IndexFilterColComponent implements OnInit, OnDestroy {
	private readonly _availableFilters: {[key: string]: readonly string[]} = {
		'dct:accessRights': AccessRights,
		'dct:publisher': Publishers,
		'dcatap:availability': DatasetAvailabilities,
		'dct:accrualPeriodicity': AccrualPeriocicites,
		'adms:status': Statuses,
		'bv:classification': ClassificationLevels,
		'bv:personalData': CategorizationsDSG,
		'bv:typeOfData': DataTypes,
		'dcat:theme': DatasetThemes
		// class: ['dataset']
	};
	private readonly _selectedFilters: ActiveFilters = {};
	private readonly destroy$ = new Subject<void>();
	// @Input() set availableFilters(filters: string[]) {
	// 	this._availableFilters = filters;
	// }

	separatorKeysCodes: number[] = [ENTER, COMMA];
	keywordControl = new FormControl('');
	filteredKeywords$: Observable<string[]>;
	// allKeywords$: Observable<string[]>;
	keywords: string[] = [];
	allKeywords: string[] = [];
	@Input() activatedFilters$!: BehaviorSubject<ActiveFilters>;
	activatedFilters: ActiveFilters = {};

	constructor(
		private readonly keywordService: MultiDatasetService,
		private readonly filterService: DatasetService,
		private readonly route: ActivatedRoute
	) {
		this.filteredKeywords$ = this.keywordControl.valueChanges.pipe(
			startWith(null),
			map((keyword: string | null) => (keyword ? this.filterKeywords(keyword) : this.allKeywords.slice()))
		);

		// Remove the subscription to filteredKeywords$ as it causes issues
		// The keywords are handled via add/remove/selected methods instead

		this.keywordService.keywords$.pipe(takeUntil(this.destroy$)).subscribe(keywords => (this.allKeywords = keywords));

		// this.activatedFilters$.subscribe(filters => this.activatedFilters = filters);
	}

	ngOnInit() {
		this.activatedFilters$
			.pipe(
				takeUntil(this.destroy$),
				tap(filters => {
					this.activatedFilters = {...filters};
				})
			)
			.subscribe();

		// Subscribe to filters from parent component
		this.activatedFilters$.pipe(takeUntil(this.destroy$)).subscribe(filters => {
			// Extract keywords from filters for UI display
			if (filters['dcat:keyword']) {
				this.keywords = Object.keys(filters['dcat:keyword']).filter(key => filters['dcat:keyword'][key]);
			} else {
				this.keywords = [];
			}
		});
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}

	get availableFilters(): string[] {
		return Object.keys(this._availableFilters);
	}

	filterChoices(_filterkey: string): readonly string[] {
		return this._availableFilters[_filterkey].filter(f => f !== '');
	}

	add(event: MatChipInputEvent): void {
		const value = (event.value || '').trim();

		// Add our keyword
		if (value && !this.keywords.includes(value)) {
			this.keywords.push(value);
			this.onCategoryChange('dcat:keyword', this.keywords);
		}

		// Clear the input value
		event.chipInput?.clear();

		this.keywordControl.setValue(null);
	}

	remove(keyword: string): void {
		const index = this.keywords.indexOf(keyword);

		if (index >= 0) {
			this.keywords.splice(index, 1);
			this.onCategoryChange('dcat:keyword', this.keywords);
		}
	}

	selected(event: MatAutocompleteSelectedEvent): void {
		const keyword = event.option.viewValue;
		if (!this.keywords.includes(keyword)) {
			this.keywords.push(keyword);
			this.onCategoryChange('dcat:keyword', this.keywords);
		}
		this.keywordControl.setValue(null);
	}

	private filterKeywords(value: string): string[] {
		const filterValue = value.toLowerCase();

		return this.allKeywords.filter(keyword => keyword.toLowerCase().includes(filterValue));
	}

	onCategoryChange(category: string, selectedOptions: string[]): void {
		if (selectedOptions.length === 0) {
			delete this.activatedFilters[category];
		} else {
			this.activatedFilters[category] = {};
		}

		for (const option of selectedOptions) {
			this.activatedFilters[category][option] = true;
		}

		this.filterService.setFilters(this.activatedFilters);
		this.activatedFilters$.next(this.activatedFilters);
	}

	getSelectedOptions(category: string): string[] {
		const selected = this.activatedFilters[category];
		return selected ? Object.keys(selected).filter(key => selected[key]) : [];
	}

	getTranslationKey(fieldKey: string): string {
		return `labels.${fieldKey}`;
	}

	getTranslationKeyEnum(fieldKey: string, valueKey: string): string {
		return `choices.dataset.${fieldKey}.${valueKey}`;
	}

	clearFilters() {
		this.keywords = [];
		this.activatedFilters = {};
		this.activatedFilters$.next({});
		this.filterService.setFilters({});
	}
}
