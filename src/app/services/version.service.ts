import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  private versionUrl = './assets/VERSION.txt';

  constructor(private http: HttpClient) {}

  getVersion(): Observable<string> {
    return this.http.get(this.versionUrl, { responseType: 'text' }).pipe(
      map(version => version.trim()),
      catchError(() => of('dev'))
    );
  }
}
