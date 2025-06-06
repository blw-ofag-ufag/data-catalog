import {Component, computed, Input} from '@angular/core';
import {MatTableModule} from '@angular/material/table';
import {Observable} from 'rxjs';
import {DatasetSchema} from '../models/schemas/dataset';
import {AsyncPipe, SlicePipe} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {MatChip} from '@angular/material/chips';

@Component({
	selector: 'index-list',
	templateUrl: './index-list.component.html',
	styleUrl: './index-list.component.scss',
	imports: [MatTableModule, AsyncPipe, SlicePipe, MatChip, RouterLink]
})
export class IndexListComponent {
	@Input() datasets$!: Observable<DatasetSchema[] | null>;

	constructor(private readonly router: Router) {}

	async openDataset(publisher: string, dataset: string) {
		await this.router.navigate(['details'], {queryParams: {publisher, dataset}, queryParamsHandling: 'replace'});
	}

	onChipClick(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
	}

	keywordFiltered(keyword: string) {
		return {
			'dcat:keyword': keyword,
			view: 'table'
		};
	}
}
