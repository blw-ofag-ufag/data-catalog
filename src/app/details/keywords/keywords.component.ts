import {Component, Input} from '@angular/core';
import {MatChip} from '@angular/material/chips';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {DatasetSchema} from '../../models/schemas/dataset';
import {DatasetService} from '../../services/api/api.service';
import {TranslateService} from '@ngx-translate/core';

@Component({
	selector: 'keywords',
	imports: [MatChip, RouterLink],
	templateUrl: './keywords.component.html',
	styleUrl: './keywords.component.scss'
})
export class KeywordsComponent {
	@Input() dataset: DatasetSchema | null = null;
	@Input() keywords: string[] | { [key: string]: any } | null = null; // Support both formats

	constructor(
		private readonly route: ActivatedRoute,
		private readonly datasetService: DatasetService,
		private readonly translate: TranslateService
	) {}

	/**
	 * Get localized keywords for display
	 */
	getLocalizedKeywords(): string[] {
		// Use new dataset input if available
		if (this.dataset) {
			return this.datasetService.getLocalizedKeywords(this.dataset);
		}
		// Fall back to legacy keywords input
		if (Array.isArray(this.keywords)) {
			return this.keywords;
		}
		return [];
	}

	/**
	 * Get keyword key for filtering
	 * When keywords are multilingual, we need to find the key from the value
	 */
	getKeywordKey(displayValue: string): string {
		if (!this.dataset || !this.dataset['dcat:keyword']) {
			return displayValue;
		}

		const keywords = this.dataset['dcat:keyword'];

		// If it's the legacy format, return the value as-is
		if (Array.isArray(keywords)) {
			return displayValue;
		}

		// For multilingual format, find the key that has this display value
		const currentLang = this.translate.currentLang || 'en';
		for (const [key, translations] of Object.entries(keywords)) {
			// Check if any translation matches the display value
			if (Object.values(translations).includes(displayValue)) {
				return key;
			}
			// Also check if the localized value for current language matches
			const localizedValue = translations[currentLang as keyof typeof translations] ||
				translations['en'] ||
				translations['de'] ||
				translations['fr'] ||
				translations['it'] ||
				key;
			if (localizedValue === displayValue) {
				return key;
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
