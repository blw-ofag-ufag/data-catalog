import { Component, Input } from "@angular/core";
import { IndexCardsComponent } from "../index-cards/index-cards.component";
import { IndexListComponent } from "../index-list/index-list.component";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { Observable } from "rxjs";
import { DatasetSchema } from "../models/schemas/dataset";
import { DatasetService } from "../services/api/api.service";

@Component({
	selector: 'index-outlet',
	imports: [IndexCardsComponent, IndexListComponent, MatPaginator],
	templateUrl: './index-outlet.component.html',
	styleUrl: './index-outlet.component.scss'
})
export class IndexOutletComponent {
	@Input() view: 'table' | 'tile' = 'tile';
	@Input() dataset$!: Observable<DatasetSchema[] | null>;

	constructor(protected readonly datasetService: DatasetService) {}

	onPageChange(event: PageEvent) {
		this.datasetService.onPageChange(event);
	}
}
