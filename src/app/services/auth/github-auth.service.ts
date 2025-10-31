import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface GitHubCredentials {
	username: string;
	token: string;
}

export interface GitHubUser {
	login: string;
	name: string;
	email: string;
}

@Injectable({
	providedIn: 'root'
})
export class GitHubAuthService {
	private readonly API_BASE = 'https://api.github.com';
	private readonly REPO_OWNER = 'blw-ofag-ufag';
	private readonly REPO_NAME = 'metadata';

	private credentialsSubject = new BehaviorSubject<GitHubCredentials | null>(null);
	public credentials$ = this.credentialsSubject.asObservable();

	constructor(private http: HttpClient) {}

	/**
	 * Validate GitHub credentials and check repository write permissions
	 */
	validateCredentials(credentials: GitHubCredentials): Observable<GitHubUser> {
		const headers = new HttpHeaders({
			'Authorization': `token ${credentials.token}`,
			'Accept': 'application/vnd.github.v3+json'
		});

		// First, verify the token by getting user info
		return this.http.get<GitHubUser>(`${this.API_BASE}/user`, { headers }).pipe(
			tap(() => {
				// If user info succeeds, check repository permissions
				this.checkRepositoryPermissions(credentials.token).subscribe();
			}),
			tap(() => {
				// Store credentials if validation succeeds
				this.credentialsSubject.next(credentials);
			}),
			catchError(error => {
				if (error.status === 401) {
					return throwError(() => new Error('INVALID_TOKEN'));
				} else if (error.status === 403) {
					return throwError(() => new Error('TOKEN_EXPIRED'));
				}
				return throwError(() => new Error('NETWORK_ERROR'));
			})
		);
	}

	/**
	 * Check if the token has write permissions to the repository
	 */
	private checkRepositoryPermissions(token: string): Observable<boolean> {
		const headers = new HttpHeaders({
			'Authorization': `token ${token}`,
			'Accept': 'application/vnd.github.v3+json'
		});

		return this.http.get<any>(`${this.API_BASE}/repos/${this.REPO_OWNER}/${this.REPO_NAME}`, { headers }).pipe(
			map(repo => {
				const permissions = repo.permissions;
				if (!permissions || !permissions.push) {
					throw new Error('NO_WRITE_PERMISSION');
				}
				return true;
			}),
			catchError(error => {
				if (error.status === 404) {
					return throwError(() => new Error('REPO_NOT_FOUND'));
				} else if (error.status === 403) {
					return throwError(() => new Error('NO_REPO_ACCESS'));
				}
				return throwError(() => error);
			})
		);
	}

	/**
	 * Get stored credentials
	 */
	getCredentials(): GitHubCredentials | null {
		return this.credentialsSubject.value;
	}

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): boolean {
		return this.credentialsSubject.value !== null;
	}

	/**
	 * Clear stored credentials
	 */
	logout(): void {
		this.credentialsSubject.next(null);
	}

	/**
	 * Generate GitHub URL for creating a new file
	 */
	generateCreateFileUrl(filePath: string, content: string): string {
		const encodedContent = encodeURIComponent(content);
		const filename = filePath.split('/').pop();
		return `https://github.com/${this.REPO_OWNER}/${this.REPO_NAME}/new/main?filename=${filePath}&value=${encodedContent}`;
	}

	/**
	 * Generate GitHub URL for editing an existing file
	 */
	generateEditFileUrl(filePath: string): string {
		return `https://github.com/${this.REPO_OWNER}/${this.REPO_NAME}/edit/main/${filePath}`;
	}

	/**
	 * Check if a file exists in the repository
	 */
	checkFileExists(filePath: string): Observable<boolean> {
		// For public repos, we can check without authentication
		return this.http.get<any>(`${this.API_BASE}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/${filePath}?ref=main`).pipe(
			map(() => true),
			catchError(error => {
				if (error.status === 404) {
					return [false]; // File doesn't exist
				}
				return throwError(() => error);
			})
		);
	}
}
