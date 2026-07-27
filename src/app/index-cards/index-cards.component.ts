import {Component, Input} from '@angular/core';
import {MatCard, MatCardContent, MatCardHeader, MatCardImage, MatCardSubtitle, MatCardTitle} from '@angular/material/card';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Observable, startWith} from 'rxjs';
import {DataProduct, DatasetIdentifier, DatasetSchema} from '../models/schemas/dataset';
import {AsyncPipe, DatePipe, NgOptimizedImage} from '@angular/common';
import {map} from 'rxjs/operators';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MatChip} from '@angular/material/chips';
import {OrgPipe} from '../org.pipe';
import {TranslateFieldPipe} from '../translate-field.pipe';
import {DatasetService} from '../services/api/api.service';
import {KeywordService} from '../services/api/keyword.service';

@Component({
	standalone: true,
	selector: 'index-cards',
	templateUrl: './index-cards.component.html',
	styleUrl: './index-cards.component.scss',
	imports: [
		MatCard,
		MatCardHeader,
		MatCardContent,
		MatCardTitle,
		MatCardSubtitle,
		AsyncPipe,
		MatCardImage,
		NgOptimizedImage,
		DatePipe,
		MatChip,
		OrgPipe,
		RouterLink,
		TranslatePipe,
		TranslateFieldPipe
	]
})
export class IndexCardsComponent {
	@Input() datasets$!: Observable<DataProduct[] | null>;
	currentLang$: Observable<string>;
	// Bundled local placeholder (served under the app base-href); used when a record has no
	// schema:image. Replaces a dead external URL that returned 404 (imageless records showed nothing).
	fallbackImageUrl = 'assets/images/placeholder.svg';

	// Default number of keywords to show (fallback when dynamic calculation isn't available)
	private readonly defaultMaxKeywords = 4;

	// Cache for dynamic keyword counts per dataset
	private readonly keywordCountCache = new Map<string, number>();

	// Track which cards have expanded keywords
	expandedCards = new Set<string>();

	constructor(
		private readonly router: Router,
		private readonly translate: TranslateService,
		private readonly route: ActivatedRoute,
		private readonly datasetService: DatasetService,
		private readonly keywordService: KeywordService
	) {
		this.currentLang$ = this.translate.onLangChange.pipe(
			map(event => event.lang),
			startWith(this.translate.currentLang) // emit initial value
		);
	}

	async openDataset(publisher: string, dataset: string, type: string = 'dataset') {
		// Carry the product type so the detail page loads from the right segment (#221).
		await this.router.navigate(['details'], {queryParams: {publisher, dataset, type}, queryParamsHandling: 'replace'});
	}

	/**
	 * Show keyword chips whenever the record actually carries keywords, regardless of product type
	 * (all three types can have dcat:keyword) (#221).
	 */
	hasKeywordSupport(dataset: DataProduct): boolean {
		const keywords = dataset['dcat:keyword'];
		return Array.isArray(keywords) && keywords.length > 0;
	}

	/**
	 * Get keyword code from display label
	 */
	private getKeywordKey(displayValue: string, dataset: DataProduct): string {
		const keywords = dataset['dcat:keyword'] as string[] | undefined;
		if (!keywords || !Array.isArray(keywords)) {
			return displayValue;
		}

		const currentLang = this.translate.currentLang || 'en';
		for (const code of keywords) {
			const labels = this.keywordService.getKeywordLabels(code);
			if (labels) {
				const label = labels[currentLang as keyof typeof labels] || labels.en || labels.de || labels.fr || labels.it || code;
				if (label === displayValue) {
					return code;
				}
			} else if (code === displayValue) {
				return code;
			}
		}
		return displayValue;
	}

	keywordFiltered(keyword: string, dataset: DataProduct) {
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
			'dcat:keyword': keywordValue
		};
	}

	// Filter the index by a product type; used by the type chip so each tile links to its own type
	// (dataset / dataService / datasetSeries), matching the productType facet (#221).
	typeFiltered(type?: string) {
		return {
			productType: type || 'dataset'
		};
	}

	publisherFiltered(publisher: string) {
		return {
			'dct:publisher': publisher
		};
	}

	onChipClick(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
	}

	/**
	 * Toggle keyword expansion for a specific dataset
	 */
	toggleKeywordExpansion(datasetId: string, event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();

		if (this.expandedCards.has(datasetId)) {
			this.expandedCards.delete(datasetId);
		} else {
			this.expandedCards.add(datasetId);
		}
	}

	/**
	 * Check if keywords are expanded for a dataset
	 */
	isExpanded(datasetId: string): boolean {
		return this.expandedCards.has(datasetId);
	}

	/**
	 * Calculate how many keywords can fit in the available width
	 */
	private calculateMaxVisibleKeywords(keywords: string[], datasetId: string): number {
		if (!keywords || keywords.length === 0) return 0;

		// Check cache first
		if (this.keywordCountCache.has(datasetId)) {
			return this.keywordCountCache.get(datasetId)!;
		}

		// Estimate character width and chip overhead
		const avgCharWidth = 7; // Approximate width per character in 12px font
		const chipPadding = 12; // 6px padding on each side
		const chipMargin = 6; // Right margin between chips
		const moreChipWidth = 30; // Approximate width for "+n" chip
		const containerWidth = 280; // Approximate available width in card

		let totalWidth = 0;
		let visibleCount = 0;

		for (let i = 0; i < keywords.length; i++) {
			const keyword = keywords[i];
			const chipWidth = keyword.length * avgCharWidth + chipPadding + chipMargin;

			// Reserve space for "+n" chip if there will be hidden keywords
			const needsMoreChip = i < keywords.length - 1;
			const requiredWidth = totalWidth + chipWidth + (needsMoreChip ? moreChipWidth : 0);

			if (requiredWidth > containerWidth) {
				break;
			}

			totalWidth += chipWidth;
			visibleCount++;
		}

		// Ensure we show at least 1 keyword and leave space for more chip if needed
		if (visibleCount === 0 && keywords.length > 0) {
			visibleCount = 1;
		}

		// Cache the result
		this.keywordCountCache.set(datasetId, visibleCount);
		return visibleCount;
	}

	/**
	 * Get localized keywords for a dataset
	 */
	getLocalizedKeywords(dataset: DataProduct): string[] {
		return this.datasetService.getLocalizedKeywords(dataset);
	}

	/**
	 * Get visible keywords for a dataset (dynamic based on available width)
	 */
	getVisibleKeywords(dataset: DataProduct, datasetId: string): string[] {
		const keywords = this.getLocalizedKeywords(dataset);
		if (!keywords) return [];

		const maxVisible = this.calculateMaxVisibleKeywords(keywords, datasetId);
		return keywords.slice(0, maxVisible);
	}

	/**
	 * Get hidden keywords for a dataset
	 */
	getHiddenKeywords(dataset: DataProduct, datasetId: string): string[] {
		const keywords = this.getLocalizedKeywords(dataset);
		if (!keywords) return [];

		const maxVisible = this.calculateMaxVisibleKeywords(keywords, datasetId);
		return keywords.slice(maxVisible);
	}

	/**
	 * Check if there are keywords to hide
	 */
	hasHiddenKeywords(dataset: DataProduct, datasetId: string): boolean {
		const keywords = this.getLocalizedKeywords(dataset);
		if (!keywords) return false;

		const maxVisible = this.calculateMaxVisibleKeywords(keywords, datasetId);
		return keywords.length > maxVisible;
	}

	/**
	 * Get CSS class for chip container based on expansion state
	 */
	getChipContainerClass(datasetId: string): string {
		return this.isExpanded(datasetId) ? 'chip-container expanded' : 'chip-container collapsed';
	}
}
