import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, combineLatest, filter, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {DatasetSchema} from '../../models/schemas/dataset';
import {ActivatedRoute, Params, Router, RouterModule} from '@angular/router';
import {PageEvent} from '@angular/material/paginator';
import Fuse from 'fuse.js';
import {MultiDatasetService} from './multi-dataset-service.service';
import {ActiveFilters} from '../../models/ActiveFilters';
import {enumTypes} from '../../models/schemas/dataset';

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
	]
};

const allFiltersOff = {};

@Injectable({providedIn: 'root'})
export class DatasetService {
	private readonly filteredDatasetsSubject = new BehaviorSubject<DatasetSchema[]>([]);
	private readonly searchTermSubject = new BehaviorSubject<string>('');
	private readonly pageSubject = new BehaviorSubject<PageEvent>({pageIndex: 0, pageSize: 5, length: 0});
	public filteredLength$ = new BehaviorSubject<number>(0);
	private sort$ = new BehaviorSubject<'title' | 'old' | 'new' | 'owner' | 'relevance'>('title');

	schemas$ = this.filteredDatasetsSubject.asObservable();
	private filters$ = new BehaviorSubject<ActiveFilters>(allFiltersOff);

	constructor(
		private readonly http: HttpClient,
		private readonly activatedRoute: ActivatedRoute,
		private readonly multiDatasetService: MultiDatasetService,
		private readonly router: Router
	) {
		const sortedSchemas$ = combineLatest([
			this.multiDatasetService.datasets$.pipe(filter((schemas): schemas is DatasetSchema[] => schemas !== null)),
			this.sort$
		]).pipe(
			map(([schemas, sort]) => {
				switch (sort) {
					case 'new':
						return [...schemas].sort((a, b) => {
							return a['dct:issued'] && b['dct:issued'] ? new Date(b['dct:issued']).getTime() - new Date(a['dct:issued']).getTime() : 0;
						});
					case 'old':
						return [...schemas].sort((a, b) => {
							return a['dct:issued'] && b['dct:issued'] ? new Date(a['dct:issued']).getTime() - new Date(b['dct:issued']).getTime() : 0;
						});
					case 'owner':
					default: //title is default
						return [...schemas].sort((a, b) => {
							const titleA = (a['dct:title']?.en || '').toLowerCase();
							const titleB = (b['dct:title']?.en || '').toLowerCase();
							return titleA && titleB ? titleA.localeCompare(titleB) : titleA ? -1 : 1;
						});
				}
			})
		);

		combineLatest([sortedSchemas$, this.searchTermSubject, this.filters$, this.pageSubject]).subscribe(([sortedSchemas, searchTerm, filters, page]) => {
			let unfiltered = sortedSchemas;
			let filtered = unfiltered;
			if (Object.keys(filters).length > 0) {
				filtered = unfiltered.filter(schema => {
					for (const filter of Object.entries(filters)) {
						const [category, choicesMap] = filter;
						for (const choice of Object.keys(choicesMap)) {
							if (category === 'dcat:keyword') {
								if (schema['dcat:keyword']?.includes(choice)) {
									return true; // this means OR for filtering
								} else {
									return false;
								}
							} else {
								if (schema[category] === choice) {
									return true; // this means OR for filtering
								}
							}
						}
					}
					return false;
				});
			}
			if (searchTerm) {
				const fuse = new Fuse(sortedSchemas, fuseOptions);
				filtered = fuse.search(searchTerm).map(result => result.item);
			}
			this.filteredLength$.next(filtered.length);

			const paginated = filtered.slice(page.pageIndex * page.pageSize, (page.pageIndex + 1) * page.pageSize);
			this.filteredDatasetsSubject.next(paginated);
		});

		this.activatedRoute.queryParams.subscribe(params => {
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

	loadDatasetById(publisher: string, id: string): void {
		this.multiDatasetService.loadDetail(publisher, 'dataset', id);
	}

	search(query: string) {
		this.searchTermSubject.next(query);
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
}
