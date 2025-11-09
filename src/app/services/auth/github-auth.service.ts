import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject, Observable, throwError} from 'rxjs';
import {catchError, map, mergeMap, tap} from 'rxjs/operators';
import {RepositoryCredentialsService} from './repository-credentials.service';
import {environment} from '../../../environments/environment';

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

	// Legacy properties for backward compatibility
	private readonly REPO_OWNER = 'blw-ofag-ufag';
	private readonly REPO_NAME = 'metadata';

	private readonly credentialsSubject = new BehaviorSubject<GitHubCredentials | null>(null);
	public credentials$ = this.credentialsSubject.asObservable();

	constructor(
		private readonly http: HttpClient,
		private readonly repositoryCredentialsService: RepositoryCredentialsService
	) {}

	/**
	 * Validate GitHub credentials and check repository write permissions (legacy method)
	 */
	validateCredentials(credentials: GitHubCredentials): Observable<GitHubUser> {
		const repository = `${this.REPO_OWNER}/${this.REPO_NAME}`;
		return this.validateCredentialsForRepository(credentials, repository);
	}

	/**
	 * Validate GitHub credentials for a specific repository
	 */
	validateCredentialsForRepository(credentials: GitHubCredentials, repository: string): Observable<GitHubUser> {
		const headers = new HttpHeaders({
			Authorization: `token ${credentials.token}`,
			Accept: 'application/vnd.github.v3+json'
		});

		// First, verify the token by getting user info
		return this.http.get<GitHubUser>(`${this.API_BASE}/user`, {headers}).pipe(
			tap(user => {
				// Validate username matches token owner
				if (user.login !== credentials.username) {
					throw new Error('USERNAME_MISMATCH');
				}
			}),
			mergeMap(user => {
				// If user info succeeds and username matches, check repository permissions
				return this.checkRepositoryPermissionsForRepo(credentials.token, repository).pipe(
					map(() => user) // Return the user info if repo check succeeds
				);
			}),
			tap(() => {
				// Store credentials only after ALL validations succeed
				this.repositoryCredentialsService.setCredentials(repository, credentials, true);

				// Also store in legacy subject for backward compatibility
				this.credentialsSubject.next(credentials);
			}),
			catchError(error => {
				// Mark credentials as invalid in the service
				this.repositoryCredentialsService.setCredentials(repository, credentials, false);

				if (error.status === 401) {
					return throwError(() => new Error('INVALID_TOKEN'));
				} else if (error.status === 403) {
					return throwError(() => new Error('TOKEN_EXPIRED'));
				} else if (error.message === 'USERNAME_MISMATCH') {
					return throwError(() => new Error('USERNAME_MISMATCH'));
				}
				return throwError(() => error);
			})
		);
	}

	/**
	 * Check if the token has write permissions to the repository (legacy method)
	 */
	private checkRepositoryPermissions(token: string): Observable<boolean> {
		const repository = `${this.REPO_OWNER}/${this.REPO_NAME}`;
		return this.checkRepositoryPermissionsForRepo(token, repository);
	}

	/**
	 * Check if the token has write permissions to a specific repository
	 */
	private checkRepositoryPermissionsForRepo(token: string, repository: string): Observable<boolean> {
		const headers = new HttpHeaders({
			Authorization: `token ${token}`,
			Accept: 'application/vnd.github.v3+json'
		});

		return this.http.get<any>(`${this.API_BASE}/repos/${repository}`, {headers}).pipe(
			map(repo => {
				const permissions = repo.permissions;
				if (!permissions?.push) {
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
	 * Check if user is authenticated (legacy method)
	 */
	isAuthenticated(): boolean {
		// Always return true in debug mode
		if (environment.debugMode) {
			return true;
		}
		return this.credentialsSubject.value !== null;
	}

	/**
	 * Check if user is authenticated for a specific repository
	 */
	isAuthenticatedForRepository(repository: string): boolean {
		return this.repositoryCredentialsService.hasValidCredentials(repository);
	}

	/**
	 * Get credentials for a specific repository
	 */
	getCredentialsForRepository(repository: string): GitHubCredentials | null {
		const repoCredentials = this.repositoryCredentialsService.getCredentials(repository);
		return repoCredentials ? repoCredentials.credentials : null;
	}

	/**
	 * Clear stored credentials
	 */
	logout(): void {
		this.credentialsSubject.next(null);
	}

	/**
	 * Generate GitHub URL for creating a new file (legacy method)
	 */
	generateCreateFileUrl(filePath: string, content: string): string {
		const repository = `${this.REPO_OWNER}/${this.REPO_NAME}`;
		return this.generateCreateFileUrlForRepository(repository, 'main', filePath, content);
	}

	/**
	 * Generate GitHub URL for editing an existing file (legacy method)
	 */
	generateEditFileUrl(filePath: string): string {
		const repository = `${this.REPO_OWNER}/${this.REPO_NAME}`;
		return this.generateEditFileUrlForRepository(repository, 'main', filePath);
	}

	/**
	 * Generate GitHub URL for creating a new file in a specific repository
	 */
	generateCreateFileUrlForRepository(repository: string, branch: string, filePath: string, content: string): string {
		const encodedContent = encodeURIComponent(content);
		const filename = filePath.split('/').pop();
		return `https://github.com/${repository}/new/${branch}?filename=${filePath}&value=${encodedContent}`;
	}

	/**
	 * Generate GitHub URL for editing an existing file in a specific repository
	 */
	generateEditFileUrlForRepository(repository: string, branch: string, filePath: string): string {
		return `https://github.com/${repository}/edit/${branch}/${filePath}`;
	}

	/**
	 * Check if a file exists in the repository (legacy method)
	 */
	checkFileExists(filePath: string): Observable<boolean> {
		const repository = `${this.REPO_OWNER}/${this.REPO_NAME}`;
		return this.checkFileExistsInRepository(repository, 'main', filePath);
	}

	/**
	 * Check if a file exists in a specific repository
	 */
	checkFileExistsInRepository(repository: string, branch: string, filePath: string): Observable<boolean> {
		// For public repos, we can check without authentication
		return this.http.get<any>(`${this.API_BASE}/repos/${repository}/contents/${filePath}?ref=${branch}`).pipe(
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
