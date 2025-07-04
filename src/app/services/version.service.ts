import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

@Injectable({
	providedIn: 'root'
})
export class VersionService {
	private readonly versionUrl = './assets/VERSION.txt';

	constructor(private readonly http: HttpClient) {}

	getVersion(): Observable<string> {
		return this.http.get(this.versionUrl, {responseType: 'text'}).pipe(
			map(version => version.trim()),
			catchError(() => of('dev'))
		);
	}
}
