import {Component, Input, OnChanges, SimpleChanges, OnDestroy} from '@angular/core';
import {IndexCardsComponent} from '../index-cards/index-cards.component';
import {IndexListComponent} from '../index-list/index-list.component';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {Observable, Subscription} from 'rxjs';
import {DatasetSchema} from '../models/schemas/dataset';
import {DatasetService} from '../services/api/api.service';
import {AsyncPipe} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
	selector: 'index-outlet',
	imports: [IndexCardsComponent, IndexListComponent, MatPaginator, AsyncPipe, TranslatePipe],
	templateUrl: './index-outlet.component.html',
	styleUrl: './index-outlet.component.scss'
})
export class IndexOutletComponent implements OnChanges, OnDestroy {
	@Input() view: 'table' | 'tile' = 'tile';
	@Input() dataset$!: Observable<DatasetSchema[] | null>;

	private pageSubscription?: Subscription;
	private currentPageSize = 5;

	constructor(protected readonly datasetService: DatasetService) {
		// Subscribe to page changes to track current pageSize
		this.pageSubscription = this.datasetService.page$.subscribe(page => {
			this.currentPageSize = page.pageSize;
		});
	}

	onPageChange(event: PageEvent) {
		this.datasetService.onPageChange(event);
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['view']) {
			const defaultPageSize = this.view === 'table' ? 10 : 6;

			// Always update pageSize and URL when view changes, unless user has explicitly set a custom pageSize
			// Custom pageSize = not one of the default view-specific sizes
			const isCustomPageSize = this.currentPageSize !== 6 && this.currentPageSize !== 10 && this.currentPageSize !== 5;

			if (!isCustomPageSize) {
				this.datasetService.setPageSize(defaultPageSize);
			}
		}
	}

	ngOnDestroy(): void {
		this.pageSubscription?.unsubscribe();
	}
}
