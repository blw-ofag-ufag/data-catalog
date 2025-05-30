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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Observable, map, startWith} from 'rxjs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {MatListModule} from '@angular/material/list';
import { MatSelectModule } from "@angular/material/select";

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
	],
	templateUrl: './index-filter-col.component.html',
	styleUrl: './index-filter-col.component.scss'
})
export class IndexFilterColComponent {
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
	// @Input() set availableFilters(filters: string[]) {
	// 	this._availableFilters = filters;
	// }

	separatorKeysCodes: number[] = [ENTER, COMMA];
	keywordControl = new FormControl('');
	filteredKeywords$: Observable<string[]>;
	// allKeywords$: Observable<string[]>;
	keywords: string[] = [];
	allKeywords: string[] = ['Apple', 'Lemon', 'Lime', 'Orange', 'Strawberry'];

	constructor() {
		this.filteredKeywords$ = this.keywordControl.valueChanges.pipe(
			startWith(null),
			map((keyword: string | null) => (keyword ? this.filterKeywords(keyword) : this.allKeywords.slice()))
		);
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
}
