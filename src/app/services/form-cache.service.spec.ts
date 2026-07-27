import {TestBed} from '@angular/core/testing';
import {FormCacheService} from './form-cache.service';

const CACHE_PREFIX = 'modify-form-cache';
const EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * The global sessionStorage mock implements get/set/remove/clear but not the
 * iteration API (length / key). Tests that exercise the cache-key iteration
 * (clearAllFormData, cleanupExpiredCaches) install a temporary implementation.
 */
function makeIterable(keys: string[]): void {
	Object.defineProperty(sessionStorage, 'length', {configurable: true, get: () => keys.length});
	(sessionStorage as any).key = (i: number) => keys[i] ?? null;
}

function clearIterable(): void {
	if (Object.getOwnPropertyDescriptor(sessionStorage, 'length')) {
		delete (sessionStorage as any).length;
	}
	delete (sessionStorage as any).key;
}

describe('FormCacheService', () => {
	let service: FormCacheService;

	beforeEach(() => {
		clearIterable();
		jest.restoreAllMocks();
		sessionStorage.clear();
		TestBed.configureTestingModule({});
		service = TestBed.inject(FormCacheService);
	});

	afterEach(() => {
		clearIterable();
		jest.restoreAllMocks();
		sessionStorage.clear();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('cache key generation (observable via stored keys)', () => {
		it('uses the -new suffix when no datasetId is given', () => {
			service.saveFormData({a: 1});
			expect(sessionStorage.getItem(`${CACHE_PREFIX}-new`)).not.toBeNull();
		});

		it('uses the datasetId suffix when provided', () => {
			service.saveFormData({a: 1}, 'ds-123');
			expect(sessionStorage.getItem(`${CACHE_PREFIX}-ds-123`)).not.toBeNull();
		});

		it('keeps caches for different datasets separate', () => {
			service.saveFormData({which: 'new'});
			service.saveFormData({which: 'ds'}, 'ds-1');
			expect(service.getFormData()).toEqual({which: 'new'});
			expect(service.getFormData('ds-1')).toEqual({which: 'ds'});
		});
	});

	describe('saveFormData / getFormData', () => {
		it('round-trips data for the default (new) cache', () => {
			service.saveFormData({title: 'Hello'});
			expect(service.getFormData()).toEqual({title: 'Hello'});
		});

		it('round-trips data for a dataset cache', () => {
			service.saveFormData({title: 'Edit'}, 'abc');
			expect(service.getFormData('abc')).toEqual({title: 'Edit'});
		});

		it('persists the datasetId and isEditMode metadata', () => {
			service.saveFormData({x: 1}, 'abc', true);
			const meta = service.getCacheMetadata('abc');
			expect(meta).toEqual({
				timestamp: expect.any(Number),
				datasetId: 'abc',
				isEditMode: true
			});
		});

		it('defaults datasetId to null and isEditMode to false', () => {
			service.saveFormData({x: 1});
			const meta = service.getCacheMetadata();
			expect(meta!.datasetId).toBeNull();
			expect(meta!.isEditMode).toBe(false);
		});

		it('returns null when nothing is cached for the key', () => {
			expect(service.getFormData('missing')).toBeNull();
		});

		it('returns null and logs when cached JSON is corrupt', () => {
			sessionStorage.setItem(`${CACHE_PREFIX}-new`, 'not-json');
			expect(service.getFormData()).toBeNull();
			expect(console.error).toHaveBeenCalled();
		});

		it('logs an error when sessionStorage.setItem throws', () => {
			jest.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
				throw new Error('quota');
			});
			expect(() => service.saveFormData({x: 1})).not.toThrow();
			expect(console.error).toHaveBeenCalledWith('Failed to save form data to cache:', expect.any(Error));
		});
	});

	describe('24h expiry', () => {
		it('returns null for an expired cache via getFormData', () => {
			service.saveFormData({x: 1}, 'old');
			const stored = JSON.parse(sessionStorage.getItem(`${CACHE_PREFIX}-old`)!);
			stored.timestamp = Date.now() - (EXPIRY_MS + 1000);
			sessionStorage.setItem(`${CACHE_PREFIX}-old`, JSON.stringify(stored));

			expect(service.getFormData('old')).toBeNull();
		});

		it('removes the expired entry when getFormData reads it', () => {
			service.saveFormData({x: 1}, 'old');
			const stored = JSON.parse(sessionStorage.getItem(`${CACHE_PREFIX}-old`)!);
			stored.timestamp = Date.now() - (EXPIRY_MS + 1000);
			sessionStorage.setItem(`${CACHE_PREFIX}-old`, JSON.stringify(stored));

			service.getFormData('old');
			expect(sessionStorage.getItem(`${CACHE_PREFIX}-old`)).toBeNull();
		});

		it('keeps data that is just within the expiry window', () => {
			service.saveFormData({x: 1}, 'fresh');
			const stored = JSON.parse(sessionStorage.getItem(`${CACHE_PREFIX}-fresh`)!);
			stored.timestamp = Date.now() - (EXPIRY_MS - 1000);
			sessionStorage.setItem(`${CACHE_PREFIX}-fresh`, JSON.stringify(stored));

			expect(service.getFormData('fresh')).toEqual({x: 1});
		});
	});

	describe('hasFormData', () => {
		it('returns false when no cache exists', () => {
			expect(service.hasFormData('none')).toBe(false);
		});

		it('returns true for a fresh cache', () => {
			service.saveFormData({x: 1}, 'present');
			expect(service.hasFormData('present')).toBe(true);
		});

		it('returns false for an expired cache', () => {
			service.saveFormData({x: 1}, 'exp');
			const stored = JSON.parse(sessionStorage.getItem(`${CACHE_PREFIX}-exp`)!);
			stored.timestamp = Date.now() - (EXPIRY_MS + 1000);
			sessionStorage.setItem(`${CACHE_PREFIX}-exp`, JSON.stringify(stored));

			expect(service.hasFormData('exp')).toBe(false);
		});

		it('returns false when cached JSON is corrupt', () => {
			sessionStorage.setItem(`${CACHE_PREFIX}-bad`, '{broken');
			expect(service.hasFormData('bad')).toBe(false);
		});
	});

	describe('clearFormData', () => {
		it('removes the cache for the given key only', () => {
			service.saveFormData({x: 1}, 'keep');
			service.saveFormData({y: 2}, 'drop');
			service.clearFormData('drop');
			expect(service.getFormData('drop')).toBeNull();
			expect(service.getFormData('keep')).toEqual({x: 1});
		});

		it('clears the default cache when no id is given', () => {
			service.saveFormData({x: 1});
			service.clearFormData();
			expect(service.getFormData()).toBeNull();
		});

		it('logs an error when removeItem throws', () => {
			jest.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {
				throw new Error('boom');
			});
			expect(() => service.clearFormData('x')).not.toThrow();
			expect(console.error).toHaveBeenCalledWith('Failed to clear form data from cache:', expect.any(Error));
		});
	});

	describe('clearAllFormData', () => {
		it('removes all cache-prefixed keys found via iteration', () => {
			// Provide a length + key() implementation, since the global mock omits them.
			const keys = [`${CACHE_PREFIX}-new`, `${CACHE_PREFIX}-ds-1`, 'unrelated'];
			service.saveFormData({a: 1});
			service.saveFormData({b: 2}, 'ds-1');
			sessionStorage.setItem('unrelated', 'value');

			makeIterable(keys);

			service.clearAllFormData();

			expect(sessionStorage.getItem(`${CACHE_PREFIX}-new`)).toBeNull();
			expect(sessionStorage.getItem(`${CACHE_PREFIX}-ds-1`)).toBeNull();
			expect(sessionStorage.getItem('unrelated')).toBe('value');
		});
	});

	describe('getCacheMetadata', () => {
		it('returns null when no cache exists', () => {
			expect(service.getCacheMetadata('none')).toBeNull();
		});

		it('omits the data payload', () => {
			service.saveFormData({secret: 'data'}, 'm');
			const meta = service.getCacheMetadata('m') as any;
			expect(meta.data).toBeUndefined();
		});

		it('returns null when cached JSON is corrupt', () => {
			sessionStorage.setItem(`${CACHE_PREFIX}-bad`, 'nope');
			expect(service.getCacheMetadata('bad')).toBeNull();
		});
	});

	describe('cleanupExpiredCaches (constructor)', () => {
		it('removes expired entries on construction', () => {
			const expiredKey = `${CACHE_PREFIX}-stale`;
			const freshKey = `${CACHE_PREFIX}-live`;
			sessionStorage.setItem(expiredKey, JSON.stringify({data: {}, timestamp: Date.now() - (EXPIRY_MS + 1000), datasetId: 'stale', isEditMode: false}));
			sessionStorage.setItem(freshKey, JSON.stringify({data: {}, timestamp: Date.now(), datasetId: 'live', isEditMode: false}));

			makeIterable([expiredKey, freshKey]);

			// Re-instantiate so the constructor's cleanup runs against our iterable storage.
			TestBed.resetTestingModule();
			TestBed.configureTestingModule({});
			TestBed.inject(FormCacheService);

			expect(sessionStorage.getItem(expiredKey)).toBeNull();
			expect(sessionStorage.getItem(freshKey)).not.toBeNull();
		});

		it('removes unparseable cache entries on construction', () => {
			const badKey = `${CACHE_PREFIX}-corrupt`;
			sessionStorage.setItem(badKey, 'not-json');

			makeIterable([badKey]);

			TestBed.resetTestingModule();
			TestBed.configureTestingModule({});
			TestBed.inject(FormCacheService);

			expect(sessionStorage.getItem(badKey)).toBeNull();
		});
	});
});
