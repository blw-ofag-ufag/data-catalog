import {Component, Input} from '@angular/core';
import {MatTableModule} from '@angular/material/table';
import {Observable} from 'rxjs';
import {DatasetSchema} from '../models/schemas/dataset';
import {AsyncPipe, DatePipe} from '@angular/common';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {MatChip} from '@angular/material/chips';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {TranslateFieldPipe} from '../translate-field.pipe';

@Component({
	selector: 'index-list',
	templateUrl: './index-list.component.html',
	styleUrl: './index-list.component.scss',
	imports: [MatTableModule, AsyncPipe, MatChip, RouterLink, TranslatePipe, TranslateFieldPipe, DatePipe]
})
export class IndexListComponent {
	@Input() datasets$!: Observable<DatasetSchema[] | null>;

	constructor(
		private readonly router: Router,
		public translate: TranslateService,
		private readonly route: ActivatedRoute
	) {}

	async openDataset(publisher: string, dataset: string) {
		await this.router.navigate(['details'], {queryParams: {publisher, dataset}, queryParamsHandling: 'replace'});
	}

	onChipClick(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
	}

	keywordFiltered(keyword: string) {
		const currentParams = this.route.snapshot.queryParams;
		const existingKeywords = currentParams['dcat:keyword'];

		// If there are existing keywords, merge them
		let keywordValue = keyword;
		if (existingKeywords && !existingKeywords.split(',').includes(keyword)) {
			keywordValue = existingKeywords + ',' + keyword;
		}

		return {
			...currentParams,
			'dcat:keyword': keywordValue,
			view: 'table'
		};
	}

	getStewards(dataset: DatasetSchema): string[] {
		// First, try to get from prov:qualifiedAttribution (new structure)
		if (dataset['prov:qualifiedAttribution'] && Array.isArray(dataset['prov:qualifiedAttribution'])) {
			const stewards = dataset['prov:qualifiedAttribution']
				.filter(person => person['dcat:hadRole'] === 'dataSteward') // Fixed: was 'dcat:role'
				.map(person => person['schema:name'] || person['prov:agent'] || '')
				.filter(name => name !== '');

			if (stewards.length > 0) {
				return stewards;
			}
		}

		// Fallback 1: Use businessDataOwner field (current data structure)
		if ((dataset as any)['businessDataOwner']) {
			return [(dataset as any)['businessDataOwner']];
		}

		// Fallback 2: Use dcat:contactPoint if available
		if (dataset['dcat:contactPoint'] && typeof dataset['dcat:contactPoint'] === 'object') {
			const contact = dataset['dcat:contactPoint'] as any;
			if (contact['schema:name']) {
				return [contact['schema:name']];
			}
		}

		return [];
	}
}
