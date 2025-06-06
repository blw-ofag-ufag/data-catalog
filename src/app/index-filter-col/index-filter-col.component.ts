import {MatCheckbox} from '@angular/material/checkbox';
import {
	AccessRights,
	AccrualPeriocicites,
	CategorizationsDSG,
	ClassificationLevels,
	DatasetAvailabilities,
	DatasetThemes,
	DataTypes,
	Publishers,
	Statuses
} from '../models/schemas/dataset';
import {Component, Input, OnInit} from '@angular/core';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Observable, map, startWith, BehaviorSubject, tap} from 'rxjs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {MatListModule} from '@angular/material/list';
import {MatSelectModule} from '@angular/material/select';
import { DatasetService} from '../services/api/api.service';
import {TranslatePipe} from '@ngx-translate/core';
import {TranslateFieldPipe} from '../translate-field.pipe';
import { MatTooltip } from "@angular/material/tooltip";
import { MatButton, MatIconButton } from "@angular/material/button";
import { ActivatedRoute } from "@angular/router";
import { ActiveFilters, createActiveFiltersFromParams } from "../models/ActiveFilters";

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
		TranslateFieldPipe,
		MatTooltip,
		MatIconButton,
		MatButton
	],
	templateUrl: './index-filter-col.component.html',
	styleUrl: './index-filter-col.component.scss'
})
export class IndexFilterColComponent implements OnInit {
	private readonly _availableFilters: {[key: string]: readonly string[]} = {
		'dct:accessRights': AccessRights,
		'dct:publisher': Publishers,
		'dcatap:availability': DatasetAvailabilities,
		'dct:accrualPeriodicity': AccrualPeriocicites,
		'adms:status': Statuses,
		'bv:classification': ClassificationLevels,
		'bv:personalData': CategorizationsDSG,
		'bv:typeOfData': DataTypes,
		'dcat:theme': DatasetThemes,
		class: ['', 'dataset', 'service', 'distribution']
	};
	private _selectedFilters: ActiveFilters = {};
	// @Input() set availableFilters(filters: string[]) {
	// 	this._availableFilters = filters;
	// }

	separatorKeysCodes: number[] = [ENTER, COMMA];
	keywordControl = new FormControl('');
	filteredKeywords$: Observable<string[]>;
	// allKeywords$: Observable<string[]>;
	keywords: string[] = [];
	allKeywords: string[] = ['Apple', 'Lemon', 'Lime', 'Orange', 'Strawberry'];
	@Input() activatedFilters$!: BehaviorSubject<ActiveFilters>;
	activatedFilters: ActiveFilters = {};

	constructor(private readonly filterService: DatasetService, private readonly route: ActivatedRoute) {
		this.filteredKeywords$ = this.keywordControl.valueChanges.pipe(
			startWith(null),
			map((keyword: string | null) => (keyword ? this.filterKeywords(keyword) : this.allKeywords.slice()))
		);

		// this.activatedFilters$.subscribe(filters => this.activatedFilters = filters);
	}

	ngOnInit() {
		this.activatedFilters$
			.pipe(
				tap(filters => {
					this.activatedFilters = {...filters};
				})
			)
			.subscribe();

		this.route.queryParams.subscribe(async (params) => {
			this.activatedFilters$.next(
				createActiveFiltersFromParams(params)
			);
			await this.filterService.setFilters(this.activatedFilters);
		});
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
		if (value) {
			this.keywords.push(value);
		}

		// Clear the input value
		event.chipInput?.clear();

		this.keywordControl.setValue(null);
	}

	remove(keyword: string): void {
		const index = this.keywords.indexOf(keyword);

		if (index >= 0) {
			this.keywords.splice(index, 1);
		}
	}

	selected(event: MatAutocompleteSelectedEvent): void {
		this.keywords.push(event.option.viewValue);
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
		return `details.label.${fieldKey}`;
	}

	getTranslationKeyEnum(fieldKey: string, valueKey: string): string {
		return `schema.dataset.${fieldKey}.${valueKey}`;
	}

	clearFilters() {
		this.activatedFilters$.next({});
		this.filterService.setFilters(this.activatedFilters);
	}
}
