import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, combineLatest, filter, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {DatasetSchema} from '../../models/schemas/dataset';
import {ActivatedRoute} from '@angular/router';
import {PageEvent} from '@angular/material/paginator';
import Fuse from 'fuse.js';
import {MultiDatasetService} from './multi-dataset-service.service';

const fuseOptions = {
	keys: ['dct:title.de', 'dct:title.en', 'dct:title.fr', 'dct:title.it', 'dct:description.de', 'dct:description.en', 'dct:description.fr', 'dct:description.it']
};

@Injectable({providedIn: 'root'})
export class DatasetService {
	private readonly filteredDatasetsSubject = new BehaviorSubject<DatasetSchema[]>([]);
	private readonly searchTermSubject = new BehaviorSubject<string>('');
	private readonly pageSubject = new BehaviorSubject<PageEvent>({pageIndex: 0, pageSize: 5, length: 0});
	public filteredLength$ = new BehaviorSubject<number>(0);
	private sort$ = new BehaviorSubject<'title' | 'old' | 'new' | 'owner'>('title');

	schemas$ = this.filteredDatasetsSubject.asObservable();

	constructor(
		private readonly http: HttpClient,
		private readonly activatedRoute: ActivatedRoute,
		private readonly multiDatasetService: MultiDatasetService
	) {
		const sortedSchemas$ = combineLatest([
			this.multiDatasetService.datasets$.pipe(filter((schemas): schemas is DatasetSchema[] => schemas !== null)),
			this.sort$
		]).pipe(
			map(([schemas, sort]) => {
				return [...schemas].sort((a, b) => {
					const titleA = (a['dct:title']?.en || '').toLowerCase();
					const titleB = (b['dct:title']?.en || '').toLowerCase();
					return titleA && titleB ? titleA.localeCompare(titleB) : titleA ? -1 : 1;
				});
			})
		);

		combineLatest([sortedSchemas$, this.searchTermSubject, this.pageSubject]).subscribe(([sortedSchemas, searchTerm, page]) => {
			const fuse = new Fuse(sortedSchemas, fuseOptions);
			let filtered = [];
			if (!searchTerm) {
				filtered = sortedSchemas;
			} else {
				filtered = fuse.search(searchTerm).map(result => result.item);
			}
			// const filtered = sortedSchemas.filter(schema => JSON.stringify(schema).toLowerCase().includes(searchTerm.toLowerCase()));
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
		// publisher = 'BLW-OFAG-UFAG-FOAG';
		this.multiDatasetService.loadDetail(publisher, 'dataset', id);
	}

	search(query: string) {
		this.searchTermSubject.next(query);
	}

	onPageChange(event: PageEvent) {
		this.pageSubject.next(event);
	}

	setSort(order: 'title' | 'old' | 'new' | 'owner') {
		this.sort$.next(order);
	}
}
