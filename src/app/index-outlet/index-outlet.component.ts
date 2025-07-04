import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {IndexCardsComponent} from '../index-cards/index-cards.component';
import {IndexListComponent} from '../index-list/index-list.component';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {Observable} from 'rxjs';
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
export class IndexOutletComponent implements OnChanges {
	@Input() view: 'table' | 'tile' = 'tile';
	@Input() dataset$!: Observable<DatasetSchema[] | null>;

	constructor(protected readonly datasetService: DatasetService) {}

	onPageChange(event: PageEvent) {
		this.datasetService.onPageChange(event);
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['view']) {
			if (this.view === 'table') {
				this.datasetService.onPaginatorInitialized(10);
			} else {
				this.datasetService.onPaginatorInitialized(6);
			}
		}
	}
}
