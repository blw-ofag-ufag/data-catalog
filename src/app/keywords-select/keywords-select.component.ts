import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {map, Observable, startWith} from 'rxjs';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
	selector: 'keywords-select',
	templateUrl: './keywords-select.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
	imports: [
		// Angular and Material modules
		CommonModule,
		ReactiveFormsModule,
		MatChipsModule,
		MatAutocompleteModule,
		MatFormFieldModule,
		MatIconModule,
		MatInputModule,
		TranslatePipe
	]
})
export class KeywordsSelectComponent implements OnInit {
	@Input() availableKeywords: string[] = [];
	@Input() value: string[] = [];
	@Output() selectionChange = new EventEmitter<string[]>();

	separatorKeysCodes: number[] = [ENTER, COMMA];
	keywordControl = new FormControl('');
	filteredKeywords$!: Observable<string[]>;

	private readonly allKeywords: string[] = [];

	ngOnInit() {
		this.filteredKeywords$ = this.keywordControl.valueChanges.pipe(
			startWith(null),
			map((keyword: string | null) => (keyword ? this.filter(keyword) : this.allKeywords.slice()))
		);
	}

	add(event: MatChipInputEvent): void {
		const value = (event.value || '').trim();

		if (value && !this.value.includes(value)) {
			this.value.push(value);
			this.selectionChange.emit(this.value);
		}

		event.chipInput?.clear();
		this.keywordControl.setValue(null);
	}

	remove(keyword: string): void {
		const index = this.value.indexOf(keyword);

		if (index >= 0) {
			this.value.splice(index, 1);
			this.selectionChange.emit(this.value);
		}
	}

	selected(event: MatAutocompleteSelectedEvent): void {
		const keyword = event.option.viewValue;
		if (!this.value.includes(keyword)) {
			this.value.push(keyword);
			this.selectionChange.emit(this.value);
		}
		this.keywordControl.setValue(null);
	}

	private filter(value: string): string[] {
		const filterValue = value.toLowerCase();
		return this.allKeywords.filter(kw => kw.toLowerCase().includes(filterValue) && !this.value.includes(kw));
	}
}
