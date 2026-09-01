import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Observable, of, timer} from 'rxjs';
import {catchError, map, retry, shareReplay, tap} from 'rxjs/operators';

export interface SchemaConfig {
	id: string;
	name: string;
	githubRepo: string;
	branch: string;
	path: string;
	color: string;
	alertType: 'info' | 'warning' | 'error';
	icon: string;
}

export interface CachedSchema {
	schema: any;
	timestamp: number;
	config: SchemaConfig;
}

@Injectable({
	providedIn: 'root'
})
export class ValidationSchemaFetcherService {
	private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour cache TTL
	private readonly RETRY_COUNT = 3;
	private readonly RETRY_DELAY = 1000; // 1 second

	private readonly schemaCache = new Map<string, CachedSchema>();
	private readonly loadingSchemas = new Map<string, Observable<any>>();

	constructor(private readonly http: HttpClient) {
		// Load from localStorage if available (for offline support)
		this.loadCachedSchemasFromStorage();
	}

	/**
	 * Get the GitHub raw content URL for a schema
	 */
	private getSchemaUrl(config: SchemaConfig): string {
		return `https://raw.githubusercontent.com/${config.githubRepo}/refs/heads/${config.branch}/${config.path}`;
	}

	/**
	 * Fetch a schema from GitHub or cache
	 */
	fetchSchema(config: SchemaConfig): Observable<any> {
		const cacheKey = config.id;

		// Check if we have a valid cached version
		const cached = this.schemaCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return of(cached.schema);
		}

		// Check if we're already loading this schema
		const loading = this.loadingSchemas.get(cacheKey);
		if (loading) {
			return loading;
		}

		// Fetch the schema from GitHub
		const url = this.getSchemaUrl(config);
		const request$ = this.http.get<any>(url).pipe(
			retry({
				count: this.RETRY_COUNT,
				delay: (error, retryCount) => {
					console.warn(`Retrying schema fetch for ${config.id} (attempt ${retryCount}/${this.RETRY_COUNT})`);
					return timer(this.RETRY_DELAY * retryCount);
				}
			}),
			tap(schema => {
				// Cache the schema
				const cacheEntry: CachedSchema = {
					schema,
					timestamp: Date.now(),
					config
				};
				this.schemaCache.set(cacheKey, cacheEntry);
				this.saveCachedSchemasToStorage();
			}),
			catchError((error: HttpErrorResponse) => {
				console.error(`Failed to fetch schema ${config.id} from ${url}:`, error);

				// Try to use stale cache if available
				if (cached) {
					console.warn(`Using stale cached schema for ${config.id}`);
					return of(cached.schema);
				}

				// Return a minimal fallback schema
				return of(this.getFallbackSchema(config));
			}),
			shareReplay(1)
		);

		// Store the loading observable to prevent duplicate requests
		this.loadingSchemas.set(cacheKey, request$);

		// Clean up loading state after completion
		request$.subscribe({
			complete: () => this.loadingSchemas.delete(cacheKey)
		});

		return request$;
	}

	/**
	 * Fetch all schemas based on provided configurations
	 */
	fetchAllSchemas(configs: SchemaConfig[]): Observable<Map<string, any>> {
		const requests = configs.map(config => this.fetchSchema(config).pipe(map(schema => ({id: config.id, schema, config}))));

		// Use Promise.allSettled equivalent for observables
		return new Observable(observer => {
			const results = new Map<string, any>();
			let completed = 0;

			requests.forEach(request$ => {
				request$.subscribe({
					next: result => {
						results.set(result.id, {
							...result.config,
							schema: result.schema
						});
					},
					error: error => {
						console.error('Schema fetch error:', error);
						completed++;
						if (completed === requests.length) {
							observer.next(results);
							observer.complete();
						}
					},
					complete: () => {
						completed++;
						if (completed === requests.length) {
							observer.next(results);
							observer.complete();
						}
					}
				});
			});
		});
	}

	/**
	 * Clear the cache for a specific schema or all schemas
	 */
	clearCache(schemaId?: string): void {
		if (schemaId) {
			this.schemaCache.delete(schemaId);
		} else {
			this.schemaCache.clear();
		}
		this.saveCachedSchemasToStorage();
	}

	/**
	 * Load cached schemas from localStorage for offline support
	 */
	private loadCachedSchemasFromStorage(): void {
		try {
			const stored = localStorage.getItem('validationSchemas');
			if (stored) {
				const parsed = JSON.parse(stored);
				Object.entries(parsed).forEach(([key, value]: [string, any]) => {
					this.schemaCache.set(key, value as CachedSchema);
				});
			}
		} catch (error) {
			console.warn('Failed to load cached schemas from storage:', error);
		}
	}

	/**
	 * Save cached schemas to localStorage for offline support
	 */
	private saveCachedSchemasToStorage(): void {
		try {
			const toStore: Record<string, CachedSchema> = {};
			this.schemaCache.forEach((value, key) => {
				toStore[key] = value;
			});
			localStorage.setItem('validationSchemas', JSON.stringify(toStore));
		} catch (error) {
			console.warn('Failed to save schemas to storage:', error);
		}
	}

	/**
	 * Get a minimal fallback schema when fetching fails
	 */
	private getFallbackSchema(config: SchemaConfig): any {
		console.warn(`Using fallback schema for ${config.id}`);
		return {
			$schema: 'http://json-schema.org/draft-07/schema#',
			title: `${config.name} (Offline)`,
			type: 'object',
			required: [],
			properties: {}
		};
	}
}
