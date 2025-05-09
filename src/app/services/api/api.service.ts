import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {DatasetSchema} from '../../models/schemas/dataset';

@Injectable({providedIn: 'root'})
export class DatasetService {
	private readonly url = 'https://raw.githubusercontent.com/blw-ofag-ufag/metadata/refs/heads/main/data/processed/datasets.json';

	private readonly schemasSubject = new BehaviorSubject<DatasetSchema[] | null>(null);
	schemas$ = this.schemasSubject.asObservable();

	constructor(private readonly http: HttpClient) {
		this.loadDatasets();
	}

	private loadDatasets(): void {
		this.http.get<DatasetSchema[]>(this.url).subscribe({
			next: data => this.schemasSubject.next(data),
			error: err => {
				console.error('Failed to fetch datasets:', err);
				this.schemasSubject.next([]);
			}
		});
	}

	getDatasetById(id: string): Observable<DatasetSchema | undefined> {
		return this.schemas$.pipe(map(datasets => datasets?.find(ds => ds['dct:identifier'] === id)));
	}
}
