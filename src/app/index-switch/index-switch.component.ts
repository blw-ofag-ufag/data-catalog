import {Component, Input, OnDestroy, OnInit, ViewChild, AfterViewInit, ElementRef, ChangeDetectorRef} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {AsyncPipe} from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import {MatButton, MatIconButton} from '@angular/material/button';
import { ObButtonDirective, ObInputClearDirective } from "@oblique/oblique";
import {MatTooltip} from '@angular/material/tooltip';
import {IndexFilterColComponent} from '../index-filter-col/index-filter-col.component';
import {IndexOutletComponent} from '../index-outlet/index-outlet.component';
import {MatFormField, MatInput, MatLabel, MatPrefix} from '@angular/material/input';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {DatasetSchema, enumTypes} from '../models/schemas/dataset';
import {DatasetService} from '../services/api/api.service';
import {MatBadge} from '@angular/material/badge';
import {ActiveFilters, createActiveFiltersFromParams} from '../models/ActiveFilters';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
	selector: 'index-switch',
	standalone: true,
	templateUrl: './index-switch.component.html',
	imports: [
		RouterModule,
		MatIcon,
		MatIconButton,
		ObButtonDirective,
		MatTooltip,
		MatTooltip,
		MatButton,
		IndexFilterColComponent,
		IndexOutletComponent,
		MatFormField,
		MatOption,
		MatSelect,
		MatInput,
		MatLabel,
		MatPrefix,
		AsyncPipe,
		MatBadge,
		TranslatePipe,
		ObInputClearDirective
	],
	styleUrl: './index-switch.component.scss'
})
export class IndexSwitchComponent implements OnInit, OnDestroy, AfterViewInit {
	view: 'table' | 'tile' = 'tile';
	showFilters = false;
	@Input() datasets$: Observable<DatasetSchema[] | null> = new Observable();
	activatedFilters$: BehaviorSubject<ActiveFilters> = new BehaviorSubject({});
	@ViewChild(MatSelect) sortSelect!: MatSelect;
	private readonly destroy$ = new Subject<void>();

	constructor(
		private readonly route: ActivatedRoute,
		private readonly router: Router,
		public readonly datasetService: DatasetService,
		private readonly cdr: ChangeDetectorRef
	) {}

	ngOnInit() {
		this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(async params => {
			this.view = params['view'] || 'tile';

			// Handle showFilters parameter from URL
			const showFiltersParam = params['showFilters'];
			if (showFiltersParam !== undefined) {
				this.showFilters = showFiltersParam === 'true';
			}
			// Note: Removed automatic filter panel showing when filters are active
			// Users must explicitly request the filter panel to be shown

			// Parse and populate filter state from URL parameters
			const urlFilters = createActiveFiltersFromParams(params);
			this.activatedFilters$.next(urlFilters);

			// Apply filters to the dataset service regardless of filter panel visibility
			await this.datasetService.setFilters(urlFilters);
		});
	}

	ngAfterViewInit() {
		// Try multiple approaches to trigger a refresh of the mat-select display
		setTimeout(() => {
			if (this.sortSelect) {
				try {
					// Approach 1: Update error state (forces internal refresh)
					this.sortSelect.updateErrorState();

					// Approach 2: Trigger focus/blur events on the trigger element
					if (this.sortSelect.trigger) {
						const triggerElement = this.sortSelect.trigger.nativeElement;
						triggerElement.dispatchEvent(new Event('focus', { bubbles: true }));
						triggerElement.dispatchEvent(new Event('blur', { bubbles: true }));
					}

					// Approach 3: Force change detection
					this.cdr.detectChanges();

					// Approach 4: Trigger a programmatic click (most aggressive)
					if (this.sortSelect.trigger) {
						const clickEvent = new MouseEvent('click', {
							view: window,
							bubbles: true,
							cancelable: true
						});
						this.sortSelect.trigger.nativeElement.dispatchEvent(clickEvent);
						// Immediately close it to simulate just a "wake up" click
						setTimeout(() => {
							if (this.sortSelect.panelOpen) {
								this.sortSelect.close();
							}
						}, 10);
					}
				} catch (error) {
					// Silently handle any errors from the workaround attempts
					console.debug('Mat-select refresh workaround failed:', error);
				}
			}
		}, 100);
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}

	async switchTo(mode: 'table' | 'tile') {
		await this.router.navigate([], {queryParams: {view: mode}, queryParamsHandling: 'merge'});
	}

	async toggleShowFilters() {
		this.showFilters = !this.showFilters;
		await this.updateUrlWithShowFilters(this.showFilters);
	}

	search(event: Event) {
		this.datasetService.search((event?.target as HTMLInputElement)?.value);
	}

	clearSearch() {
		this.datasetService.search('');
	}

	setSorting(criterion: 'title' | 'old' | 'new' | 'owner' | 'relevance') {
		this.datasetService.setSort(criterion);
	}

	getFilterCount(filters: ActiveFilters | null): number | null {
		if (!filters || Object.keys(filters).length === 0) {
			return null;
		}
		return Object.keys(filters).length;
	}


	getSortLabel(sortType: 'title' | 'old' | 'new' | 'owner' | 'relevance' | null): string {
		if (sortType === 'title' || !sortType) {
			return 'ui.defaultSelect';
		}
		return 'ui.sort'; // Just "Sort" for non-default cases
	}

	onSortChangeByType(value: 'title' | 'old' | 'new' | 'owner' | 'relevance') {
		if (value) {
			this.setSorting(value);
		}
	}

	private async updateUrlWithShowFilters(showFilters: boolean) {
		const queryParams: any = {};
		if (showFilters) {
			queryParams['showFilters'] = 'true';
		} else {
			queryParams['showFilters'] = null;
		}
		await this.router.navigate([], {queryParams, queryParamsHandling: 'merge'});
	}

	openNewDatasetTab(): void {
		this.router.navigate(['/modify'], {
			queryParams: {
				mode: 'new'
			}
		});
	}
}
