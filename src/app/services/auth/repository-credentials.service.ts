import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {GitHubCredentials} from './github-auth.service';
import {Publisher} from '../../models/publisher.model';

export interface RepositoryCredentials {
	repository: string; // githubRepo format: "owner/repo"
	credentials: GitHubCredentials;
	isValid: boolean;
	lastValidated: Date;
}

@Injectable({
	providedIn: 'root'
})
export class RepositoryCredentialsService {
	private readonly STORAGE_KEY = 'repository_credentials';
	private credentialsMap = new Map<string, RepositoryCredentials>();
	private readonly selectedRepositorySubject = new BehaviorSubject<string | null>(null);

	public selectedRepository$ = this.selectedRepositorySubject.asObservable();

	constructor() {
		this.loadFromStorage();
	}

	/**
	 * Set credentials for a specific repository
	 */
	setCredentials(repository: string, credentials: GitHubCredentials, isValid: boolean = false): void {
		const repoCredentials: RepositoryCredentials = {
			repository,
			credentials,
			isValid,
			lastValidated: new Date()
		};

		this.credentialsMap.set(repository, repoCredentials);
		this.saveToStorage();
	}

	/**
	 * Get credentials for a specific repository
	 */
	getCredentials(repository: string): RepositoryCredentials | null {
		return this.credentialsMap.get(repository) || null;
	}

	/**
	 * Check if repository has valid credentials
	 */
	hasValidCredentials(repository: string): boolean {
		const creds = this.credentialsMap.get(repository);
		return creds ? creds.isValid : false;
	}

	/**
	 * Remove credentials for a repository
	 */
	removeCredentials(repository: string): void {
		this.credentialsMap.delete(repository);
		this.saveToStorage();

		// If this was the selected repository, clear the selection
		if (this.selectedRepositorySubject.value === repository) {
			this.selectedRepositorySubject.next(null);
		}
	}

	/**
	 * Mark credentials as invalid (e.g., token expired)
	 */
	invalidateCredentials(repository: string): void {
		const creds = this.credentialsMap.get(repository);
		if (creds) {
			creds.isValid = false;
			this.credentialsMap.set(repository, creds);
			this.saveToStorage();
		}
	}

	/**
	 * Mark credentials as valid after successful validation
	 */
	validateCredentials(repository: string): void {
		const creds = this.credentialsMap.get(repository);
		if (creds) {
			creds.isValid = true;
			creds.lastValidated = new Date();
			this.credentialsMap.set(repository, creds);
			this.saveToStorage();
		}
	}

	/**
	 * Get all repositories with credentials
	 */
	getAuthenticatedRepositories(): string[] {
		return Array.from(this.credentialsMap.keys()).filter(repo => this.credentialsMap.get(repo)?.isValid);
	}

	/**
	 * Get all repositories with credentials (valid or invalid)
	 */
	getAllRepositoriesWithCredentials(): string[] {
		return Array.from(this.credentialsMap.keys());
	}

	/**
	 * Set the currently selected repository
	 */
	setSelectedRepository(repository: string | null): void {
		this.selectedRepositorySubject.next(repository);
	}

	/**
	 * Get the currently selected repository
	 */
	getSelectedRepository(): string | null {
		return this.selectedRepositorySubject.value;
	}

	/**
	 * Clear all credentials
	 */
	clearAllCredentials(): void {
		this.credentialsMap.clear();
		this.selectedRepositorySubject.next(null);
		this.saveToStorage();
	}

	/**
	 * Get repository credentials by publisher
	 */
	getCredentialsByPublisher(publisher: Publisher): RepositoryCredentials | null {
		return this.getCredentials(publisher.githubRepo);
	}

	/**
	 * Check if publisher has valid credentials
	 */
	hasValidCredentialsForPublisher(publisher: Publisher): boolean {
		return this.hasValidCredentials(publisher.githubRepo);
	}

	/**
	 * Save credentials to sessionStorage
	 */
	private saveToStorage(): void {
		try {
			const serializable = Array.from(this.credentialsMap.entries()).map(([key, value]) => [
				key,
				{
					...value,
					lastValidated: value.lastValidated.toISOString()
				}
			]);
			sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializable));
		} catch (error) {
			console.warn('Failed to save credentials to storage:', error);
		}
	}

	/**
	 * Load credentials from sessionStorage
	 */
	private loadFromStorage(): void {
		try {
			const stored = sessionStorage.getItem(this.STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as [string, any][];
				this.credentialsMap = new Map(
					parsed.map(([key, value]) => [
						key,
						{
							...value,
							lastValidated: new Date(value.lastValidated)
						}
					])
				);
			}
		} catch (error) {
			console.warn('Failed to load credentials from storage:', error);
			this.credentialsMap = new Map();
		}
	}
}
