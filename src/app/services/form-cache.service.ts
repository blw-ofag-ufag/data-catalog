import {Injectable} from '@angular/core';

interface CachedFormData {
	data: any;
	timestamp: number;
	datasetId: string | null;
	isEditMode: boolean;
}

@Injectable({
	providedIn: 'root'
})
export class FormCacheService {
	private readonly CACHE_PREFIX = 'modify-form-cache';
	private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

	constructor() {
		// Clean up expired caches on initialization
		this.cleanupExpiredCaches();
	}

	/**
	 * Save form data to sessionStorage
	 */
	saveFormData(data: any, datasetId: string | null = null, isEditMode: boolean = false): void {
		const cacheKey = this.getCacheKey(datasetId);
		const cacheData: CachedFormData = {
			data,
			timestamp: Date.now(),
			datasetId,
			isEditMode
		};

		try {
			sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
		} catch (error) {
			console.error('Failed to save form data to cache:', error);
		}
	}

	/**
	 * Get cached form data
	 */
	getFormData(datasetId: string | null = null): any | null {
		const cacheKey = this.getCacheKey(datasetId);

		try {
			const cachedString = sessionStorage.getItem(cacheKey);
			if (!cachedString) {
				return null;
			}

			const cached: CachedFormData = JSON.parse(cachedString);

			// Check if cache is expired
			if (Date.now() - cached.timestamp > this.CACHE_EXPIRY_MS) {
				this.clearFormData(datasetId);
				return null;
			}

			return cached.data;
		} catch (error) {
			console.error('Failed to retrieve form data from cache:', error);
			return null;
		}
	}

	/**
	 * Check if cached form data exists
	 */
	hasFormData(datasetId: string | null = null): boolean {
		const cacheKey = this.getCacheKey(datasetId);
		const cached = sessionStorage.getItem(cacheKey);

		if (!cached) {
			return false;
		}

		try {
			const parsedCache: CachedFormData = JSON.parse(cached);
			// Check if not expired
			return Date.now() - parsedCache.timestamp <= this.CACHE_EXPIRY_MS;
		} catch {
			return false;
		}
	}

	/**
	 * Clear cached form data
	 */
	clearFormData(datasetId: string | null = null): void {
		const cacheKey = this.getCacheKey(datasetId);
		try {
			sessionStorage.removeItem(cacheKey);
		} catch (error) {
			console.error('Failed to clear form data from cache:', error);
		}
	}

	/**
	 * Clear all form caches
	 */
	clearAllFormData(): void {
		const keysToRemove: string[] = [];

		// Find all cache keys
		for (let i = 0; i < sessionStorage.length; i++) {
			const key = sessionStorage.key(i);
			if (key && key.startsWith(this.CACHE_PREFIX)) {
				keysToRemove.push(key);
			}
		}

		// Remove all cache keys
		keysToRemove.forEach(key => {
			sessionStorage.removeItem(key);
		});
	}

	/**
	 * Get the cache metadata (timestamp, datasetId, etc)
	 */
	getCacheMetadata(datasetId: string | null = null): Omit<CachedFormData, 'data'> | null {
		const cacheKey = this.getCacheKey(datasetId);

		try {
			const cachedString = sessionStorage.getItem(cacheKey);
			if (!cachedString) {
				return null;
			}

			const cached: CachedFormData = JSON.parse(cachedString);
			return {
				timestamp: cached.timestamp,
				datasetId: cached.datasetId,
				isEditMode: cached.isEditMode
			};
		} catch {
			return null;
		}
	}

	/**
	 * Generate cache key based on dataset ID
	 */
	private getCacheKey(datasetId: string | null): string {
		return datasetId ? `${this.CACHE_PREFIX}-${datasetId}` : `${this.CACHE_PREFIX}-new`;
	}

	/**
	 * Clean up expired caches
	 */
	private cleanupExpiredCaches(): void {
		const keysToCheck: string[] = [];

		// Find all cache keys
		for (let i = 0; i < sessionStorage.length; i++) {
			const key = sessionStorage.key(i);
			if (key && key.startsWith(this.CACHE_PREFIX)) {
				keysToCheck.push(key);
			}
		}

		// Check and remove expired caches
		keysToCheck.forEach(key => {
			try {
				const cachedString = sessionStorage.getItem(key);
				if (cachedString) {
					const cached: CachedFormData = JSON.parse(cachedString);
					if (Date.now() - cached.timestamp > this.CACHE_EXPIRY_MS) {
						sessionStorage.removeItem(key);
					}
				}
			} catch {
				// If we can't parse it, remove it
				sessionStorage.removeItem(key);
			}
		});
	}
}
