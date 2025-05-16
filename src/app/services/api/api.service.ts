import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, combineLatest, filter, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {DatasetSchema} from '../../models/schemas/dataset';
import {ActivatedRoute} from '@angular/router';
import {PageEvent} from '@angular/material/paginator';

@Injectable({providedIn: 'root'})
export class DatasetService {
	private readonly url = 'https://raw.githubusercontent.com/blw-ofag-ufag/metadata/refs/heads/main/data/processed/datasets.json';
	private readonly detailUrl = 'https://raw.githubusercontent.com/blw-ofag-ufag/metadata/refs/heads/main/data/raw/datasets/';
	private readonly schemasSubject = new BehaviorSubject<DatasetSchema[] | null>(null);
	private readonly filteredDatasetsSubject = new BehaviorSubject<DatasetSchema[]>([]);
	private readonly searchTermSubject = new BehaviorSubject<string>('');
	private readonly pageSubject = new BehaviorSubject<PageEvent>({pageIndex: 0, pageSize: 5, length: 0});
	private loadingMain = false;
	private datasetScheduledForLoad = null;
	public filteredLength$ = new BehaviorSubject<number>(0);
	private sort$ = new BehaviorSubject<'title' | 'old' | 'new' | 'owner'>('title');

	schemas$ = this.filteredDatasetsSubject.asObservable();

	constructor(
		private readonly http: HttpClient,
		private readonly activatedRoute: ActivatedRoute
	) {
		const sortedSchemas$ = combineLatest([this.schemasSubject.pipe(filter((schemas): schemas is DatasetSchema[] => schemas !== null)), this.sort$]).pipe(
			map(([schemas, sort]) => {
				return [...schemas].sort((a, b) => {
					const titleA = (a['dct:title']?.en || '').toLowerCase();
					const titleB = (b['dct:title']?.en || '').toLowerCase();
					return titleA.localeCompare(titleB); // adjust based on `sort` if needed
				});
			})
		);

		combineLatest([sortedSchemas$, this.searchTermSubject, this.pageSubject]).subscribe(([sortedSchemas, searchTerm, page]) => {
			const filtered = sortedSchemas.filter(schema => JSON.stringify(schema).toLowerCase().includes(searchTerm.toLowerCase()));
			this.filteredLength$.next(filtered.length);

			const paginated = filtered.slice(page.pageIndex * page.pageSize, (page.pageIndex + 1) * page.pageSize);
			this.filteredDatasetsSubject.next(paginated);
		});

		this.loadDatasets();
		this.activatedRoute.queryParams.subscribe(params => {
			if (!params['dataset']) {
				return;
			}
			if (!this.loadingMain) {
				this.loadAndMergeDataset(params['dataset']);
				this.datasetScheduledForLoad = null;
			} else {
				this.datasetScheduledForLoad = params['dataset'];
			}
		});
	}

	private loadDatasets(): void {
		this.loadingMain = true;
		this.http.get<DatasetSchema[]>(this.url).subscribe({
			next: data => {
				this.schemasSubject.next(data);
				this.loadingMain = false;
				if (this.datasetScheduledForLoad) {
					this.loadAndMergeDataset(this.datasetScheduledForLoad);
					this.datasetScheduledForLoad = null;
				}
			},
			error: err => {
				console.error('Failed to fetch datasets:', err);
				this.schemasSubject.next([]);
				this.loadingMain = false;
			}
		});
	}

	private loadAndMergeDataset(datasetId: string): void {
		this.http.get<DatasetSchema>(this.detailUrl + datasetId + '.json').subscribe({
			next: data => {
				const datasets = this.schemasSubject.value;
				if (datasets) {
					const index = datasets.findIndex(ds => ds['dct:identifier'] === datasetId);
					const datasetToEnhance = datasets[index];
					const enhancedDataset = {...datasetToEnhance, ...data};
					const enhancedDatasets = [...datasets.slice(0, index), enhancedDataset, ...datasets.slice(index + 1)];
					this.schemasSubject.next(enhancedDatasets);
				}
			},
			error: err => {
				console.error('Failed to fetch datasets:', err);
				this.schemasSubject.next([]);
			}
		});
	}

	getDatasetById(id: string): Observable<DatasetSchema | undefined> {
		return this.schemas$.pipe(map(datasets => datasets?.find(ds => ds['dct:identifier'] === id)));
	}

	search(query: string) {
		this.searchTermSubject.next(query);
		// const currentSchemas = this.schemasSubject.value;
		// const filteredSchemas= (currentSchemas || []).filter(x => JSON.stringify(x).toLowerCase().includes(query.toLowerCase()));
		// this.schemasSubject.next(filteredSchemas);
	}

	onPageChange(event: PageEvent) {
		this.pageSubject.next(event);
	}

	setSort(order: 'title' | 'old' | 'new' | 'owner') {
		this.sort$.next(order);
	}
}
