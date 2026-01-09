import {Component, Input} from '@angular/core';
import {MatTableModule} from '@angular/material/table';
import {Observable} from 'rxjs';
import {DatasetSchema} from '../models/schemas/dataset';
import {AsyncPipe, DatePipe} from '@angular/common';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {MatChip} from '@angular/material/chips';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {TranslateFieldPipe} from '../translate-field.pipe';
import {DatasetService} from '../services/api/api.service';
import {KeywordService} from '../services/api/keyword.service';

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
		private readonly route: ActivatedRoute,
		private readonly datasetService: DatasetService,
		private readonly keywordService: KeywordService
	) {}

	async openDataset(publisher: string, dataset: string) {
		await this.router.navigate(['details'], {queryParams: {publisher, dataset}, queryParamsHandling: 'replace'});
	}

	onChipClick(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
	}

	/**
	 * Get localized keywords for a dataset
	 */
	getLocalizedKeywords(dataset: DatasetSchema): string[] {
		return this.datasetService.getLocalizedKeywords(dataset);
	}

	/**
	 * Get keyword code from display label
	 */
	private getKeywordKey(displayValue: string, dataset: DatasetSchema): string {
		const keywords = dataset['dcat:keyword'];
		if (!keywords || !Array.isArray(keywords)) {
			return displayValue;
		}

		const currentLang = this.translate.currentLang || 'en';
		for (const code of keywords) {
			const labels = this.keywordService.getKeywordLabels(code);
			if (labels) {
				const label =
					labels[currentLang as keyof typeof labels] || labels.en || labels.de || labels.fr || labels.it || code;
				if (label === displayValue) {
					return code;
				}
			} else if (code === displayValue) {
				return code;
			}
		}
		return displayValue;
	}

	keywordFiltered(keyword: string, dataset: DatasetSchema) {
		const keywordCode = this.getKeywordKey(keyword, dataset);
		const currentParams = this.route.snapshot.queryParams;
		const existingKeywords = currentParams['dcat:keyword'];

		// If there are existing keywords, merge them
		let keywordValue = keywordCode;
		if (existingKeywords && !existingKeywords.split(',').includes(keywordCode)) {
			keywordValue = `${existingKeywords},${keywordCode}`;
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

		// Fallback 1: Use dataOwner field (current data structure)
		if ((dataset as any)['dataOwner']) {
			return [(dataset as any)['dataOwner']];
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
