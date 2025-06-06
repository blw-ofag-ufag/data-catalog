import {Component} from '@angular/core';
import {Observable} from 'rxjs';
import {DatasetSchema} from '../models/schemas/dataset';
import {DatasetService} from '../services/api/api.service';

@Component({
	selector: 'index',
	standalone: false,
	templateUrl: './index.component.html',
	styleUrl: './index.component.scss'
})
export class IndexComponent {
	datasets$: Observable<DatasetSchema[] | null> = new Observable();

	constructor(private readonly datasetService: DatasetService) {
		this.datasets$ = this.datasetService.schemas$;
	}
}
