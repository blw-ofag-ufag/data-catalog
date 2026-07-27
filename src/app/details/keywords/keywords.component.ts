import {Component, Input} from '@angular/core';
import {MatChip} from '@angular/material/chips';
import {RouterLink} from '@angular/router';
import {DataProduct, DatasetSchema} from '../../models/schemas/dataset';
import {DatasetService} from '../../services/api/api.service';
import {KeywordService} from '../../services/api/keyword.service';
import {TranslateService} from '@ngx-translate/core';

@Component({
	selector: 'keywords',
	imports: [MatChip, RouterLink],
	templateUrl: './keywords.component.html',
	styleUrl: './keywords.component.scss'
})
export class KeywordsComponent {
	@Input() dataset: DataProduct | null = null;

	constructor(
		private readonly datasetService: DatasetService,
		private readonly keywordService: KeywordService,
		private readonly translate: TranslateService
	) {}

	/**
	 * Show keyword chips whenever the record actually carries keywords, regardless of product type
	 * (all three types can have dcat:keyword) (#221). Mirrors IndexCardsComponent.hasKeywordSupport.
	 */
	hasKeywordSupport(): boolean {
		if (!this.dataset) return false;
		const keywords = this.dataset['dcat:keyword'];
		return Array.isArray(keywords) && keywords.length > 0;
	}

	/**
	 * Get localized keywords for display
	 */
	getLocalizedKeywords(): string[] {
		if (this.dataset && this.hasKeywordSupport()) {
			return this.datasetService.getLocalizedKeywords(this.dataset);
		}
		return [];
	}

	/**
	 * Get keyword key for filtering
	 * Since keywords are stored as codes, we need to find the code from the display value
	 */
	getKeywordKey(displayValue: string): string {
		if (!this.dataset || !this.hasKeywordSupport() || !this.dataset['dcat:keyword']) {
			return displayValue;
		}

		const keywords = this.dataset['dcat:keyword'] as string[];
		if (!Array.isArray(keywords)) {
			return displayValue;
		}

		// Find the keyword code that matches this display value
		const currentLang = this.translate.currentLang || 'en';
		for (const code of keywords) {
			const labels = this.keywordService.getKeywordLabels(code);
			if (labels) {
				const label = labels[currentLang as keyof typeof labels] || labels.en || labels.de || labels.fr || labels.it || code;
				if (label === displayValue) {
					return code;
				}
			} else if (code === displayValue) {
				// No translation found, the display value is the code itself
				return code;
			}
		}

		// Fallback to display value if key not found
		return displayValue;
	}

	onChipClick(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
	}

	keywordFiltered(keyword: string) {
		// For details page, we want to start fresh with just this keyword
		// as the user is navigating from detail view back to index
		const keywordKey = this.getKeywordKey(keyword);
		return {
			'dcat:keyword': keywordKey
		};
	}
}
