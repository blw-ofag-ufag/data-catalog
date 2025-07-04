import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, combineLatest, filter} from 'rxjs';
import {map} from 'rxjs/operators';
import {DatasetSchema, enumTypes} from '../../models/schemas/dataset';
import {ActivatedRoute, Router} from '@angular/router';
import {PageEvent} from '@angular/material/paginator';
import Fuse from 'fuse.js';
import {MultiDatasetService} from './multi-dataset-service.service';
import {ActiveFilters} from '../../models/ActiveFilters';
import {TranslateService} from '@ngx-translate/core';

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
	private readonly filteredDatasetsSubject = new BehaviorSubject<DatasetSchema[]>([]);
	private readonly searchTermSubject = new BehaviorSubject<string>('');
	private readonly pageSubject = new BehaviorSubject<PageEvent>({pageIndex: 0, pageSize: 5, length: 0});
	public filteredLength$ = new BehaviorSubject<number>(0);
	private readonly sort$ = new BehaviorSubject<'title' | 'old' | 'new' | 'owner' | 'relevance'>('title');

	schemas$ = this.filteredDatasetsSubject.asObservable();
	searchTerm$ = this.searchTermSubject.asObservable();
	private readonly filters$ = new BehaviorSubject<ActiveFilters>(allFiltersOff);

	constructor(
		private readonly http: HttpClient,
		private readonly activatedRoute: ActivatedRoute,
		private readonly multiDatasetService: MultiDatasetService,
		private readonly router: Router,
		private readonly translate: TranslateService
	) {
		const sortedSchemas$ = combineLatest([
			this.multiDatasetService.datasets$.pipe(filter((schemas): schemas is DatasetSchema[] => schemas !== null)),
			this.sort$
		]).pipe(
			map(([schemas, sort]) => {
				const currentLang = this.translate.currentLang || 'en';

				switch (sort) {
					case 'new':
						// Newest first - handle null dates properly
						return [...schemas].sort((a, b) => {
							const dateA = a['dct:issued'] ? new Date(a['dct:issued']).getTime() : 0;
							const dateB = b['dct:issued'] ? new Date(b['dct:issued']).getTime() : 0;
							return dateB - dateA; // Newest first
						});

					case 'old':
						// Oldest first - handle null dates properly
						return [...schemas].sort((a, b) => {
							const dateA = a['dct:issued'] ? new Date(a['dct:issued']).getTime() : Number.MAX_SAFE_INTEGER;
							const dateB = b['dct:issued'] ? new Date(b['dct:issued']).getTime() : Number.MAX_SAFE_INTEGER;
							return dateA - dateB; // Oldest first
						});

					case 'owner':
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

		combineLatest([sortedSchemas$, this.searchTermSubject, this.filters$, this.pageSubject, this.sort$]).subscribe(
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
								const datasetKeywords = schema['dcat:keyword'] || [];
								categoryMatches = choices.some(choice => datasetKeywords.includes(choice));
							} else {
								// For other categories, check if the schema value matches any of the choices
								categoryMatches = choices.includes(schema[category] as string);
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
					const fuse = new Fuse(filtered, fuseOptions);
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

				this.filteredLength$.next(filtered.length);

				const paginated = filtered.slice(page.pageIndex * page.pageSize, (page.pageIndex + 1) * page.pageSize);
				this.filteredDatasetsSubject.next(paginated);
			}
		);

		this.activatedRoute.queryParams.subscribe(params => {
			// Handle search parameter from URL
			const searchParam = params['search'] || '';
			if (searchParam !== this.searchTermSubject.value) {
				this.searchTermSubject.next(searchParam);
			}

			if (!params['dataset']) {
				this.multiDatasetService.onRouteChange(null);
			} else {
				this.multiDatasetService.onRouteChange({publisher: params['publisher'], klass: 'dataset', id: params['dataset']});
			}
		});
	}

	getDatasetById(id: string) {
		return this.multiDatasetService.selectedDataset$;
	}

	getLoadingState() {
		return this.multiDatasetService.loading$;
	}

	loadDatasetById(publisher: string, id: string): void {
		this.multiDatasetService.loadDetail(publisher, 'dataset', id);
	}

	search(query: string) {
		this.searchTermSubject.next(query);
		this.updateUrlWithSearch(query);
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

	onPageChange(event: PageEvent) {
		this.pageSubject.next(event);
	}

	onPaginatorInitialized(pageSize: number) {
		this.pageSubject.next({...this.pageSubject.value, pageSize});
	}

	setSort(order: 'title' | 'old' | 'new' | 'owner' | 'relevance') {
		this.sort$.next(order);
	}

	async setFilters(filters: ActiveFilters) {
		this.filters$.next(filters);

		const emptyFilters = Object.values(enumTypes).reduce(
			(acc, enumKey) => {
				acc[enumKey] = null;
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
	private getLocalizedTitle(dataset: DatasetSchema, lang: string): string {
		if (dataset['dct:title'] && typeof dataset['dct:title'] === 'object') {
			const title = dataset['dct:title'] as any;
			return title[lang] || title['en'] || title['de'] || title['fr'] || title['it'] || '';
		}
		return '';
	}

	/**
	 * Get the dataset owner/steward/contact for sorting purposes
	 */
	private getDatasetOwner(dataset: DatasetSchema): string {
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
}
