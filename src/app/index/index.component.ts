import { Component, OnInit } from "@angular/core";
import { Observable } from "rxjs";
import { DatasetSchema } from "../models/schemas/dataset";
import { DatasetService } from "../services/api/api.service";

@Component({
	selector: 'index',
	standalone: false,
	templateUrl: './index.component.html',
	styleUrl: './index.component.scss'
})
export class IndexComponent implements OnInit {
	datasets$: Observable<DatasetSchema[] | null> = new Observable();

	constructor(
		private datasetService: DatasetService,

	) {
		this.datasets$ = this.datasetService.schemas$;
	}

	ngOnInit() {

	}

}
