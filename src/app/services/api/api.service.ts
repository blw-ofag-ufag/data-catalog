import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, combineLatest, filter} from 'rxjs';
import {map} from 'rxjs/operators';
import {DataProduct} from '../../models/schemas/dataset';
import {enumTypes} from '../../models/enum-fields';
import {ActivatedRoute, Router} from '@angular/router';
import {PageEvent} from '@angular/material/paginator';
import Fuse from 'fuse.js';
import {MultiDatasetService} from './multi-dataset-service.service';
import {ActiveFilters} from '../../models/ActiveFilters';
import {TranslateService} from '@ngx-translate/core';
import {KeywordService} from './keyword.service';
import {DimensionService} from './dimension.service';

const fuseOptions = {
	threshold: 0.4,
	keys: [
		'dct:title.de',
		'dct:title.en',
		'dct:title.fr',
		'dct:title.it',
		'dct:description.de',
		'dct:description.en',
		'dct:description.fr',
		'dct:description.it',
		'dcat:keyword'
	],
	useExtendedSearch: true
};

const allFiltersOff = {};

@Injectable({providedIn: 'root'})
export class DatasetService {
	private readonly filteredDatasetsSubject = new BehaviorSubject<DataProduct[]>([]);
	private readonly searchTermSubject = new BehaviorSubject<string>('');
	private readonly pageSubject = new BehaviorSubject<PageEvent>({pageIndex: 0, pageSize: 5, length: 0});
	public filteredLength$ = new BehaviorSubject<number>(0);
	private readonly sortSubject = new BehaviorSubject<'title' | 'old' | 'new' | 'owner' | 'relevance'>('title');
	private isAdjustingPage = false;

	schemas$ = this.filteredDatasetsSubject.asObservable();
	searchTerm$ = this.searchTermSubject.asObservable();
	sort$ = this.sortSubject.asObservable();
	page$ = this.pageSubject.asObservable();
	private readonly filters$ = new BehaviorSubject<ActiveFilters>(allFiltersOff);

	constructor(
		private readonly http: HttpClient,
		private readonly activatedRoute: ActivatedRoute,
		private readonly multiDatasetService: MultiDatasetService,
		private readonly router: Router,
		private readonly translate: TranslateService,
		private readonly keywordService: KeywordService,
		private readonly dimensionService: DimensionService
	) {
		// Ensure the dimension glossary is available for filtering and label-aware search (issue #92)
		this.dimensionService.loadDimensions().subscribe();

		// Initialize sort from URL parameters if available
		const initialSort = this.getInitialSortFromUrl();
		this.sortSubject.next(initialSort);

		// Initialize pagination from URL parameters if available
		const initialPagination = this.getInitialPaginationFromUrl();
		this.pageSubject.next(initialPagination);
		const sortedSchemas$ = combineLatest([
			this.multiDatasetService.datasets$.pipe(filter((schemas): schemas is DataProduct[] => schemas !== null)),
			this.sortSubject
		]).pipe(
			map(([schemas, sort]) => {
				const currentLang = this.translate.currentLang || 'en';

				switch (sort) {
					// Type-aware sorting: handle missing fields per product type
					case 'new':
						// Newest first - handle null dates properly
						return [...schemas].sort((a, b) => {
							const dateA = (a['dct:issued'] as string) ? new Date(a['dct:issued'] as string).getTime() : 0;
							const dateB = b['dct:issued'] ? new Date(b['dct:issued'] as string).getTime() : 0;
							return dateB - dateA; // Newest first
						});

					case 'old':
						// Oldest first - handle null dates properly
						return [...schemas].sort((a, b) => {
							const dateA = (a['dct:issued'] as string) ? new Date(a['dct:issued'] as string).getTime() : Number.MAX_SAFE_INTEGER;
							const dateB = b['dct:issued'] ? new Date(b['dct:issued'] as string).getTime() : Number.MAX_SAFE_INTEGER;
							return dateA - dateB; // Oldest first
						});

					case 'owner':
						// Sort by data owner/steward/contact (dataset-specific)
						// Non-datasets may not have stewards; fallback to publisher
						// Sort by data owner/steward/contact
						return [...schemas].sort((a, b) => {
							const ownerA = this.getDatasetOwner(a).toLowerCase();
							const ownerB = this.getDatasetOwner(b).toLowerCase();
							return ownerA.localeCompare(ownerB);
						});

					case 'relevance':
						// For relevance without search, use a quality score or default to title
						return [...schemas].sort((a, b) => {
							// Use quality score if available, otherwise fall back to title
							const qualityA = (a as any).quality || 0;
							const qualityB = (b as any).quality || 0;
							if (qualityA !== qualityB) {
								return qualityB - qualityA; // Higher quality first
							}
							// Fall back to title sorting
							const titleA = this.getLocalizedTitle(a, currentLang).toLowerCase();
							const titleB = this.getLocalizedTitle(b, currentLang).toLowerCase();
							return titleA.localeCompare(titleB);
						});

					case 'title':
					default:
						// Sort by title in current language
						return [...schemas].sort((a, b) => {
							const titleA = this.getLocalizedTitle(a, currentLang).toLowerCase();
							const titleB = this.getLocalizedTitle(b, currentLang).toLowerCase();
							return titleA.localeCompare(titleB);
						});
				}
			})
		);

		combineLatest([sortedSchemas$, this.searchTermSubject, this.filters$, this.pageSubject, this.sortSubject]).subscribe(
			([sortedSchemas, searchTerm, filters, page, currentSort]) => {
				const unfiltered = sortedSchemas;
				let filtered = unfiltered;

				// Apply filters first
				if (Object.keys(filters).length > 0) {
					filtered = unfiltered.filter(schema => {
						// Each category must match (AND between categories)
						for (const [category, choicesMap] of Object.entries(filters)) {
							const choices = Object.keys(choicesMap).filter(key => choicesMap[key]);
							if (choices.length === 0) continue;

							// Within a category, at least one choice must match (OR within category)
							let categoryMatches = false;

							if (category === 'dcat:keyword') {
								// For keywords, check if ANY of the selected keywords match ANY of the dataset keywords
								const datasetKeywords = this.getKeywordsArray(schema);
								categoryMatches = choices.some(choice => datasetKeywords.includes(choice));
							} else if (category === 'bv:dimensions') {
								// Dimensions live on distributions; aggregate across the dataset (issue #92)
								const datasetDimensions = this.getDimensionsArray(schema);
								categoryMatches = choices.some(choice => datasetDimensions.includes(choice));
							} else {
								// For other categories, the stored value may be a scalar or an array
								// (array facets such as `dcat:theme`, see #255). Treat both alike:
								// a dataset matches when any of its values is among the choices.
								const value = schema[category];
								categoryMatches = Array.isArray(value) ? value.some(v => choices.includes(v as string)) : choices.includes(value as string);
							}

							// If this category doesn't match, the dataset doesn't pass the filter
							if (!categoryMatches) {
								return false;
							}
						}
						// All categories matched
						return true;
					});
				}

				// Apply search with respect to current sort order
				if (searchTerm) {
					const fuse = new Fuse(filtered, this.buildFuseOptions());
					const searchResults = fuse.search(searchTerm);

					if (currentSort === 'relevance') {
						// For relevance sort with search, use Fuse.js relevance scoring (overrides pre-sorting)
						filtered = searchResults.map(result => result.item);
					} else {
						// For other sorts, maintain the current sort order but filter by search results
						const searchResultItems = new Set(searchResults.map(result => result.item));
						filtered = filtered.filter(item => searchResultItems.has(item));
					}
				}

				// Check if current page is empty but we have results and we're not on the first page
				let adjustedPageIndex = page.pageIndex;
				let needsPageAdjustment = false;

				if (filtered.length > 0 && page.pageIndex > 0 && !this.isAdjustingPage) {
					const currentPageStart = page.pageIndex * page.pageSize;
					const currentPageResults = filtered.slice(currentPageStart, currentPageStart + page.pageSize);

					// If current page is empty, recursively find the last contentful page
					if (currentPageResults.length === 0) {
						adjustedPageIndex = this.findLastContentfulPage(filtered, page.pageSize, page.pageIndex);
						needsPageAdjustment = true;
					}
				}

				// Update filtered length first
				this.filteredLength$.next(filtered.length);

				// If we need to adjust the page, do it after updating the length
				if (needsPageAdjustment) {
					this.isAdjustingPage = true;
					setTimeout(() => {
						const newPageEvent = {...page, pageIndex: adjustedPageIndex, length: filtered.length};
						this.pageSubject.next(newPageEvent);
						void this.updateUrlWithPagination(newPageEvent);
						// Reset the flag after a short delay to allow the subscription to complete
						setTimeout(() => {
							this.isAdjustingPage = false;
						}, 10);
					}, 0);
				}

				const paginated = filtered.slice(adjustedPageIndex * page.pageSize, (adjustedPageIndex + 1) * page.pageSize);
				this.filteredDatasetsSubject.next(paginated);
			}
		);

		this.activatedRoute.queryParams.subscribe(params => {
			// Handle search parameter from URL
			const searchParam = params['search'] || '';
			if (searchParam !== this.searchTermSubject.value) {
				this.searchTermSubject.next(searchParam);
			}

			// Handle sort parameter from URL
			const sortParam = params['sort'] || 'title';
			const validSorts: ('title' | 'old' | 'new' | 'owner' | 'relevance')[] = ['title', 'old', 'new', 'owner', 'relevance'];
			if (validSorts.includes(sortParam) && sortParam !== this.sortSubject.value) {
				this.sortSubject.next(sortParam as 'title' | 'old' | 'new' | 'owner' | 'relevance');
			}

			// Handle pagination parameters from URL
			const urlPageParam = parseInt(params['page'], 10) || 1; // Default to page 1 if not specified
			const pageIndex = Math.max(0, urlPageParam - 1); // Convert 1-indexed URL to 0-indexed pageIndex
			const pageSizeParam = parseInt(params['pageSize'], 10);
			const currentPage = this.pageSubject.value;

			if (pageIndex !== currentPage.pageIndex || (pageSizeParam && pageSizeParam !== currentPage.pageSize)) {
				const validPageSizes = [5, 6, 9, 10, 18, 25, 36, 100, 200];
				const newPageSize = pageSizeParam && validPageSizes.includes(pageSizeParam) ? pageSizeParam : currentPage.pageSize;

				this.pageSubject.next({
					pageIndex,
					pageSize: newPageSize,
					length: currentPage.length
				});
			}

			if (!params['dataset']) {
				this.multiDatasetService.onRouteChange(null);
			} else {
				// `type` defaults to 'dataset' for back-compat with existing URLs/bookmarks (#221).
				this.multiDatasetService.onRouteChange({publisher: params['publisher'], klass: params['type'] || 'dataset', id: params['dataset']});
			}
		});
	}

	getDatasetById(_id: string) {
		return this.multiDatasetService.selectedDataset$;
	}

	getLoadingState() {
		return this.multiDatasetService.loading$;
	}

	loadDatasetById(publisher: string, id: string, type = 'dataset'): void {
		this.multiDatasetService.loadDetail(publisher, type, id);
	}

	search(query: string) {
		this.searchTermSubject.next(query);
		void this.updateUrlWithSearch(query);
	}

	private async updateUrlWithSearch(searchTerm: string) {
		const queryParams: any = {};
		if (searchTerm && searchTerm.trim()) {
			queryParams['search'] = searchTerm.trim();
		} else {
			queryParams['search'] = null;
		}
		await this.router.navigate([], {queryParams, queryParamsHandling: 'merge'});
	}

	private async updateUrlWithSort(sortOrder: 'title' | 'old' | 'new' | 'owner' | 'relevance') {
		const queryParams: any = {};
		if (sortOrder && sortOrder !== 'title') {
			queryParams['sort'] = sortOrder;
		} else {
			queryParams['sort'] = null;
		}
		await this.router.navigate([], {queryParams, queryParamsHandling: 'merge'});
	}

	private async updateUrlWithPagination(pageEvent: PageEvent) {
		const queryParams: any = {};

		// Only include page parameter if not on first page
		// Convert 0-indexed pageIndex to 1-indexed page for user-friendly URLs
		if (pageEvent.pageIndex > 0) {
			queryParams['page'] = (pageEvent.pageIndex + 1).toString();
		} else {
			queryParams['page'] = null;
		}

		// Only include pageSize parameter if not default (5)
		if (pageEvent.pageSize !== 5) {
			queryParams['pageSize'] = pageEvent.pageSize.toString();
		} else {
			queryParams['pageSize'] = null;
		}

		await this.router.navigate([], {queryParams, queryParamsHandling: 'merge'});
	}

	onPageChange(event: PageEvent) {
		this.pageSubject.next(event);
		void this.updateUrlWithPagination(event);
	}

	onPaginatorInitialized(pageSize: number) {
		const currentPage = this.pageSubject.value;
		const newPageEvent = {...currentPage, pageSize};
		this.pageSubject.next(newPageEvent);

		// Only update URL if this is a user-initiated change, not during initial load
		// Check if we have URL parameters that suggest we're still initializing
		const currentParams = this.activatedRoute.snapshot.queryParams;
		const hasPageSizeInUrl = currentParams['pageSize'];
		const hasPageInUrl = currentParams['page'];

		// If there are pagination params in URL, don't override them during initialization
		if (!hasPageSizeInUrl && !hasPageInUrl) {
			void this.updateUrlWithPagination(newPageEvent);
		}
	}

	setSort(order: 'title' | 'old' | 'new' | 'owner' | 'relevance') {
		this.sortSubject.next(order);
		void this.updateUrlWithSort(order);
	}

	setPageSize(pageSize: number) {
		const currentPage = this.pageSubject.value;
		const newPageEvent = {...currentPage, pageSize, pageIndex: 0}; // Reset to first page when changing page size
		this.pageSubject.next(newPageEvent);
		void this.updateUrlWithPagination(newPageEvent);
	}

	async setFilters(filters: ActiveFilters) {
		this.filters$.next(filters);

		// Reset set for the URL: every facet must be explicitly nulled to be cleared under
		// queryParamsHandling: 'merge'. `productType` is a synthetic facet (not a schema enum, so not
		// in enumTypes) — include it here or a deselected/absent klass filter stays stale in the URL
		// and gets re-applied on the next navigation (pagination/sort/view-switch) (#221).
		const facetKeys = [...enumTypes, 'productType'];
		const emptyFilters = facetKeys.reduce(
			(acc, key) => {
				acc[key] = null;
				return acc;
			},
			{} as Record<string, string | null>
		);

		const mappedFilters = Object.entries(filters).reduce(
			(acc, [key, subfilters]) => {
				const activeSubfilters = Object.keys(subfilters).filter(subkey => subfilters[subkey]);
				if (activeSubfilters.length > 0 && activeSubfilters) {
					acc[key] = activeSubfilters.join(',');
				}
				return acc;
			},

			emptyFilters
		);

		await this.router.navigate([], {queryParams: mappedFilters, queryParamsHandling: 'merge'});
	}

	/**
	 * Get localized title for a dataset in the specified language, with fallbacks
	 */
	private getLocalizedTitle(dataset: DataProduct, lang: string): string {
		if (dataset['dct:title'] && typeof dataset['dct:title'] === 'object') {
			const title = dataset['dct:title'] as any;
			return title[lang] || title['en'] || title['de'] || title['fr'] || title['it'] || '';
		}
		return '';
	}

	/**
	/**
	 * Get keywords array from a dataset (dataset-specific field)
	 * Returns empty array for non-dataset product types
	 */
	public getKeywordsArray(dataset: DataProduct): string[] {
		const keywords = dataset['dcat:keyword'];
		if (!keywords) return [];

		if (Array.isArray(keywords)) {
			return keywords;
		}

		return [];
	}

	/**
	 * Aggregate a dataset's distribution dimension codes (`bv:dimensions`) into a de-duplicated array,
	 * for dataset-level faceting/search (issue #92).
	 *
	 * Typed against `DataProduct` rather than `DatasetSchema` because the catalogue collection is
	 * mixed since #221; product types without distributions simply yield an empty array.
	 */
	public getDimensionsArray(dataset: DataProduct): string[] {
		const distributions = dataset['dcat:distribution'];
		if (!Array.isArray(distributions)) return [];

		const codes = new Set<string>();
		for (const distribution of distributions) {
			const dimensions = distribution?.['bv:dimensions'];
			if (Array.isArray(dimensions)) {
				dimensions.forEach(code => code && codes.add(code));
			}
		}
		return Array.from(codes);
	}

	/**
	 * Build a searchable text blob for a dataset's dimensions: the codes plus all of their glossary
	 * translations, so full-text search matches a dimension by code or localized label (issue #92).
	 */
	private getDimensionSearchText(dataset: DataProduct): string {
		return this.getDimensionsArray(dataset)
			.flatMap(code => {
				const labels = this.dimensionService.getDimensionLabels(code);
				return labels ? [code, ...Object.values(labels)] : [code];
			})
			.join(' ');
	}

	/**
	 * Fuse options extended with a computed dimension key so search matches a dataset by the codes and
	 * localized labels of its distributions' dimensions (issue #92).
	 */
	private buildFuseOptions() {
		return {
			...fuseOptions,
			keys: [...fuseOptions.keys, {name: 'bv:dimensions', getFn: (dataset: DataProduct) => this.getDimensionSearchText(dataset)}]
		};
	}

	/**
	 * Get localized keywords for display
	 * Returns an array of keyword strings in the current language
	 * Keywords are stored as string array of codes, translations come from KeywordService
	 */
	public getLocalizedKeywords(dataset: DataProduct, lang?: string): string[] {
		const keywords = dataset['dcat:keyword'];
		if (!keywords) return [];

		const currentLang = lang || this.translate.currentLang || 'en';

		// Keywords should be string[] of codes
		if (Array.isArray(keywords)) {
			return (
				keywords
					.map(code => {
						// Look up translation from KeywordService
						const labels = this.keywordService.getKeywordLabels(code);
						if (labels) {
							return labels[currentLang as keyof typeof labels] || labels.en || labels.de || labels.fr || labels.it || code;
						}
						// Fallback to the code itself if not found in KeywordService
						return code;
					})
					// #257: default Array.sort() is code-unit order, which puts "Ölsaaten" after "Zucker"
					// and any capitalized label before all lowercase ones. Sort by the active locale.
					.sort((a, b) => a.localeCompare(b, currentLang, {sensitivity: 'base'}))
			);
		}

		return [];
	}

	/**
	 * Check if dataset keywords match the search term
	 * Searches keyword codes and all language translations via KeywordService
	 */
	private keywordsMatchSearch(dataset: DataProduct, searchTerm: string): boolean {
		const keywords = dataset['dcat:keyword'];
		if (!keywords || !Array.isArray(keywords)) return false;

		const lowerSearchTerm = searchTerm.toLowerCase();

		return keywords.some(code => {
			// Check if code matches
			if (code.toLowerCase().includes(lowerSearchTerm)) return true;

			// Check all translations via KeywordService
			const labels = this.keywordService.getKeywordLabels(code);
			if (labels) {
				return Object.values(labels).some(translation => translation && translation.toLowerCase().includes(lowerSearchTerm));
			}

			return false;
		});
	}

	/**
	 * Get the dataset owner/steward/contact for sorting purposes
	 */
	private getDatasetOwner(dataset: DataProduct): string {
		// Try prov:qualifiedAttribution first (new structure)
		if (dataset['prov:qualifiedAttribution'] && Array.isArray(dataset['prov:qualifiedAttribution'])) {
			const stewards = dataset['prov:qualifiedAttribution']
				.filter(person => person['dcat:hadRole'] === 'dataSteward')
				.map(person => person['schema:name'] || person['prov:agent'] || '');

			if (stewards.length > 0) {
				return stewards[0]; // Use first steward for sorting
			}
		}

		// Fallback to businessDataOwner
		if ((dataset as any)['businessDataOwner']) {
			return (dataset as any)['businessDataOwner'];
		}

		// Fallback to contact point
		if (dataset['dcat:contactPoint'] && typeof dataset['dcat:contactPoint'] === 'object') {
			const contact = dataset['dcat:contactPoint'] as any;
			if (contact['schema:name']) {
				return contact['schema:name'];
			}
		}

		// Final fallback to publisher
		return dataset['dct:publisher'] || '';
	}

	/**
	 * Get the initial sort value from URL parameters
	 */
	private getInitialSortFromUrl(): 'title' | 'old' | 'new' | 'owner' | 'relevance' {
		const currentParams = this.activatedRoute.snapshot.queryParams;
		const sortParam = currentParams['sort'] || 'title';
		const validSorts: ('title' | 'old' | 'new' | 'owner' | 'relevance')[] = ['title', 'old', 'new', 'owner', 'relevance'];

		if (validSorts.includes(sortParam)) {
			return sortParam as 'title' | 'old' | 'new' | 'owner' | 'relevance';
		}

		return 'title'; // Default fallback
	}

	/**
	 * Recursively find the last page that has content
	 */
	private findLastContentfulPage(filteredResults: DataProduct[], pageSize: number, startPageIndex: number): number {
		// Start from the given page and work backwards
		for (let pageIndex = startPageIndex - 1; pageIndex >= 0; pageIndex--) {
			const pageStart = pageIndex * pageSize;
			const pageResults = filteredResults.slice(pageStart, pageStart + pageSize);

			// If this page has content, return it
			if (pageResults.length > 0) {
				return pageIndex;
			}
		}

		// If no previous pages have content, return 0 (first page)
		return 0;
	}

	/**
	 * Get the initial pagination values from URL parameters
	 */
	private getInitialPaginationFromUrl(): PageEvent {
		const currentParams = this.activatedRoute.snapshot.queryParams;
		const urlPageParam = parseInt(currentParams['page'], 10) || 1; // Default to page 1 if not specified
		const pageSizeParam = currentParams['pageSize'] ? parseInt(currentParams['pageSize'], 10) : null;

		// Convert 1-indexed URL page to 0-indexed pageIndex
		const pageIndex = Math.max(0, urlPageParam - 1);

		// Validate pageSize against reasonable values
		const validPageSizes = [5, 6, 9, 10, 18, 25, 36, 100, 200];

		let pageSize = 5; // Start with framework default
		if (pageSizeParam && validPageSizes.includes(pageSizeParam)) {
			pageSize = pageSizeParam; // Use URL value if valid
		}
		// Note: View-specific defaults (6/10) will be set by IndexOutletComponent if no URL override

		return {
			pageIndex,
			pageSize,
			length: 0 // Will be updated when data loads
		};
	}
}
