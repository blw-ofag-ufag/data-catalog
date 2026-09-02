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
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MatTooltip} from '@angular/material/tooltip';
import {MatButton} from '@angular/material/button';
import {ActivatedRoute} from '@angular/router';
import {ActiveFilters} from '../models/ActiveFilters';
import {Keyword, KeywordService} from '../services/api/keyword.service';
import {DatasetMetadataConfig, DatasetMetadataService} from '../services/metadata/dataset-metadata.service';
import {DATA_PRODUCT_TYPES} from '../models/data-product-type';
import {Dimension, DimensionService} from '../services/api/dimension.service';

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
	// Facetable enum fields, derived from the runtime schema (fields that carry enum
	/**
	 * P5 SCHEMA-AWARE FILTERS:
	 * - Filters are derived from runtime metadata schema (already implemented in constructor)
	 * - Only enum fields from metadata are shown as filter options
	 * - Non-enum fields are not filterable
	 * - Future: Could add type-aware filter UI that shows different filters per product type
	 * - Keyword filtering works for all types (keyword codes are product-agnostic)
	 */
	// options). dcat:keyword is intentionally absent here - it has no schema enum and
	// is handled via the dedicated keyword chip/autocomplete UI below.
	private _availableFilterKeys: string[] = [];
	// Stable dataset (catalogue) metadata; filter keys + choices come from here so the form's active
	// product type can't shrink the catalogue filters (#221).
	private catalogueConfig: DatasetMetadataConfig | null = null;
	private readonly _selectedFilters: ActiveFilters = {};
	private readonly destroy$ = new Subject<void>();
	// @Input() set availableFilters(filters: string[]) {
	// 	this._availableFilters = filters;
	// }

	separatorKeysCodes: number[] = [ENTER, COMMA];
	keywordControl = new FormControl('');
	filteredKeywords$: Observable<Keyword[]>;
	keywords: string[] = []; // Stores keyword codes for filtering
	allKeywords: Keyword[] = []; // Full keyword objects with translations

	// Distribution dimensions ("structure") facet — mirrors the keyword chip-autocomplete (issue #92)
	dimensionControl = new FormControl('');
	filteredDimensions$: Observable<Dimension[]>;
	dimensions: string[] = []; // Stores dimension codes for filtering
	allDimensions: Dimension[] = []; // Full dimension objects with translations
	@Input() activatedFilters$!: BehaviorSubject<ActiveFilters>;
	activatedFilters: ActiveFilters = {};

	constructor(
		private readonly keywordService: KeywordService,
		private readonly dimensionService: DimensionService,
		private readonly filterService: DatasetService,
		private readonly route: ActivatedRoute,
		private readonly translateService: TranslateService,
		private readonly metadataService: DatasetMetadataService
	) {
		this.filteredKeywords$ = this.keywordControl.valueChanges.pipe(
			startWith(null),
			map((searchValue: string | null) => (searchValue ? this.filterKeywords(searchValue) : this.sortKeywordsByLabel(this.allKeywords)))
		);
		this.filteredDimensions$ = this.dimensionControl.valueChanges.pipe(
			startWith(null),
			map((searchValue: string | null) => (searchValue ? this.filterDimensions(searchValue) : this.sortDimensionsByLabel(this.allDimensions)))
		);
		this.subscribeToGlossaries();
	}

	/**
	 * Wire up the keyword/dimension glossaries feeding the chip autocompletes.
	 *
	 * #257: both glossaries arrive sorted by code, but the panels show localized labels, so each
	 * emission is re-sorted by label — and again whenever the user switches language, since the
	 * alphabet of the labels changes with it.
	 */
	private subscribeToGlossaries(): void {
		this.keywordService.keywords$.pipe(takeUntil(this.destroy$)).subscribe(keywords => (this.allKeywords = this.sortKeywordsByLabel(keywords)));
		this.dimensionService.dimensions$.pipe(takeUntil(this.destroy$)).subscribe(dimensions => (this.allDimensions = this.sortDimensionsByLabel(dimensions)));

		this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
			this.allKeywords = this.sortKeywordsByLabel(this.allKeywords);
			this.allDimensions = this.sortDimensionsByLabel(this.allDimensions);
			// Re-emit so an open autocomplete panel picks up the new order immediately.
			this.keywordControl.setValue(this.keywordControl.value);
			this.dimensionControl.setValue(this.dimensionControl.value);
		});

		// The glossaries are normally loaded by the catalogue service, but the facet must not depend
		// on that ordering/timing to have options available.
		this.dimensionService.loadDimensions().pipe(takeUntil(this.destroy$)).subscribe();
		this.keywordService.loadKeywords().pipe(takeUntil(this.destroy$)).subscribe();
	}

	ngOnInit() {
		// Derive the facetable enum fields from the stable catalogue (dataset) schema. Using the
		// catalogue channel (not the form's mutable metadata$) keeps the full filter set even after
		// the modify form has loaded a non-dataset product type (#221).
		this.metadataService
			.getCatalogueMetadata()
			.pipe(takeUntil(this.destroy$))
			.subscribe(config => {
				if (!config) return;
				const enumKeys = Array.from(config.fields.values())
					.filter(field => (field.enum?.length ?? 0) > 0)
					.map(field => field.key);
				// A failed/offline schema fetch yields an empty {properties:{}} fallback with zero enum
				// fields. Don't let that wipe an already-derived filter set — keep the last good facets so
				// the catalogue stays filterable after a transient fetch failure (#221).
				if (enumKeys.length === 0 && this._availableFilterKeys.length > 0) {
					return;
				}
				this.catalogueConfig = config;
				this._availableFilterKeys = enumKeys;
			});

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

			// Extract dimensions from filters for UI display
			if (filters['bv:dimensions']) {
				this.dimensions = Object.keys(filters['bv:dimensions']).filter(key => filters['bv:dimensions'][key]);
			} else {
				this.dimensions = [];
			}
		});
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}

	get availableFilters(): string[] {
		return this._availableFilterKeys;
	}

	// Product-type ("klass") facet options — filter the catalogue between the data-product types (#221).
	// Matching is generic: api.service matches the selected values against each item's `productType` tag.
	readonly productTypeOptions = DATA_PRODUCT_TYPES;

	productTypeLabel(type: string): string {
		return `choices.productType.${type}`;
	}

	filterChoices(_filterkey: string): readonly string[] {
		// Options come from the stable catalogue (dataset) schema (already empty-string filtered),
		// not the form's mutable metadata, so choices stay correct regardless of the active form type.
		return this.catalogueConfig?.fields.get(_filterkey)?.enum ?? [];
	}

	add(event: MatChipInputEvent): void {
		const value = (event.value || '').trim();

		// Find the keyword code from the input value (which could be a label)
		const keyword = this.findKeywordByLabelOrCode(value);
		const code = keyword ? keyword.code : value;

		// Add our keyword code
		if (code && !this.keywords.includes(code)) {
			this.keywords.push(code);
			this.onCategoryChange('dcat:keyword', this.keywords);
		}

		// Clear the input value
		event.chipInput?.clear();

		this.keywordControl.setValue(null);
	}

	remove(keywordCode: string): void {
		const index = this.keywords.indexOf(keywordCode);

		if (index >= 0) {
			this.keywords.splice(index, 1);
			this.onCategoryChange('dcat:keyword', this.keywords);
		}
	}

	selected(event: MatAutocompleteSelectedEvent): void {
		// The value is the keyword code (set via [value] in the template)
		const keywordCode = event.option.value;
		if (!this.keywords.includes(keywordCode)) {
			this.keywords.push(keywordCode);
			this.onCategoryChange('dcat:keyword', this.keywords);
		}
		this.keywordControl.setValue(null);
	}

	private filterKeywords(searchValue: string): Keyword[] {
		const filterValue = searchValue.toLowerCase();

		return this.sortKeywordsByLabel(
			this.allKeywords.filter(keyword => {
				// Search in code and all translations
				if (keyword.code.toLowerCase().includes(filterValue)) return true;
				return Object.values(keyword.labels).some(label => label.toLowerCase().includes(filterValue));
			})
		);
	}

	/** #257: alphabetical order of the facet options, by the label shown in the active language. */
	private sortKeywordsByLabel(keywords: Keyword[]): Keyword[] {
		const lang = this.translateService.currentLang || 'de';
		return [...keywords].sort((a, b) => this.getKeywordObjectLabel(a).localeCompare(this.getKeywordObjectLabel(b), lang, {sensitivity: 'base'}));
	}

	/** Same alphabetical treatment for the dimensions facet. */
	private sortDimensionsByLabel(dimensions: Dimension[]): Dimension[] {
		const lang = this.translateService.currentLang || 'de';
		return [...dimensions].sort((a, b) => this.getDimensionLabel(a.code).localeCompare(this.getDimensionLabel(b.code), lang, {sensitivity: 'base'}));
	}

	/**
	 * Get localized label for a keyword code
	 */
	getKeywordLabel(code: string): string {
		const labels = this.keywordService.getKeywordLabels(code);
		if (labels) {
			const currentLang = this.translateService.currentLang || 'de';
			return labels[currentLang as keyof typeof labels] || labels.de || labels.en || code;
		}
		return code;
	}

	/**
	 * Get localized label for a keyword object
	 */
	getKeywordObjectLabel(keyword: Keyword): string {
		const currentLang = this.translateService.currentLang || 'de';
		return keyword.labels[currentLang as keyof typeof keyword.labels] || keyword.labels.de || keyword.labels.en || keyword.code;
	}

	/**
	 * Find keyword by label or code
	 */
	private findKeywordByLabelOrCode(value: string): Keyword | undefined {
		const lowerValue = value.toLowerCase();
		return this.allKeywords.find(keyword => {
			if (keyword.code.toLowerCase() === lowerValue) return true;
			return Object.values(keyword.labels).some(label => label.toLowerCase() === lowerValue);
		});
	}

	// --- Distribution dimensions ("structure") facet — mirrors the keyword helpers above ---

	addDimension(event: MatChipInputEvent): void {
		const value = (event.value || '').trim();
		const dimension = this.findDimensionByLabelOrCode(value);
		const code = dimension ? dimension.code : value;

		if (code && !this.dimensions.includes(code)) {
			this.dimensions.push(code);
			this.onCategoryChange('bv:dimensions', this.dimensions);
		}

		event.chipInput?.clear();
		this.dimensionControl.setValue(null);
	}

	removeDimension(dimensionCode: string): void {
		const index = this.dimensions.indexOf(dimensionCode);
		if (index >= 0) {
			this.dimensions.splice(index, 1);
			this.onCategoryChange('bv:dimensions', this.dimensions);
		}
	}

	selectedDimension(event: MatAutocompleteSelectedEvent): void {
		const dimensionCode = event.option.value;
		if (!this.dimensions.includes(dimensionCode)) {
			this.dimensions.push(dimensionCode);
			this.onCategoryChange('bv:dimensions', this.dimensions);
		}
		this.dimensionControl.setValue(null);
	}

	private filterDimensions(searchValue: string): Dimension[] {
		const filterValue = searchValue.toLowerCase();
		return this.sortDimensionsByLabel(
			this.allDimensions.filter(dimension => {
				if (dimension.code.toLowerCase().includes(filterValue)) return true;
				return Object.values(dimension.labels).some(label => label.toLowerCase().includes(filterValue));
			})
		);
	}

	getDimensionLabel(code: string): string {
		const currentLang = this.translateService.currentLang || 'de';
		return this.dimensionService.getDimensionLabel(code, currentLang);
	}

	getDimensionObjectLabel(dimension: Dimension): string {
		const currentLang = this.translateService.currentLang || 'de';
		return dimension.labels[currentLang as keyof typeof dimension.labels] || dimension.labels.de || dimension.labels.en || dimension.code;
	}

	private findDimensionByLabelOrCode(value: string): Dimension | undefined {
		const lowerValue = value.toLowerCase();
		return this.allDimensions.find(dimension => {
			if (dimension.code.toLowerCase() === lowerValue) return true;
			return Object.values(dimension.labels).some(label => label.toLowerCase() === lowerValue);
		});
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
		this.dimensions = [];
		this.activatedFilters = {};
		this.activatedFilters$.next({});
		this.filterService.setFilters({});
	}
}
