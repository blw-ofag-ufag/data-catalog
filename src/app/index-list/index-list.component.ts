import { Component, computed, Input } from "@angular/core";
import {MatTableModule} from '@angular/material/table';
import { Observable } from "rxjs";
import { DatasetSchema } from "../models/schemas/dataset";
import { AsyncPipe, SlicePipe } from "@angular/common";
import { Router } from "@angular/router";

@Component({
	selector: 'index-list',
	templateUrl: './index-list.component.html',
	styleUrl: './index-list.component.scss',
	imports: [MatTableModule, AsyncPipe, SlicePipe]
})
export class IndexListComponent {
	@Input() datasets$!: Observable<DatasetSchema[] | null>;

	constructor(private readonly router: Router) {}

	async openDataset(publisher: string, dataset: string) {
		await this.router.navigate(['details'], {queryParams: {publisher, dataset}, queryParamsHandling: 'replace'});
	}
}
