import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {SchemaConfig, ValidationSchemaFetcherService} from './validation-schema-fetcher.service';

const config: SchemaConfig = {
	id: 'dataset',
	name: 'Dataset',
	githubRepo: 'owner/repo',
	branch: 'main',
	path: 'schema.json',
	color: '#fff',
	alertType: 'info',
	icon: 'info'
};

const URL = `https://raw.githubusercontent.com/${config.githubRepo}/refs/heads/${config.branch}/${config.path}`;

describe('ValidationSchemaFetcherService', () => {
	let service: ValidationSchemaFetcherService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({
			providers: [ValidationSchemaFetcherService, provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(ValidationSchemaFetcherService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
		jest.useRealTimers();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('fetchSchema', () => {
		it('fetches and caches a schema on a cache miss', done => {
			const schema = {type: 'object', title: 'remote'};
			service.fetchSchema(config).subscribe(result => {
				expect(result).toEqual(schema);
				expect(localStorage.getItem('validationSchemas')).toContain('remote');
				done();
			});
			httpMock.expectOne(URL).flush(schema);
		});

		it('serves a cache hit without a second HTTP request', done => {
			const schema = {type: 'object', title: 'cached'};

			service.fetchSchema(config).subscribe(() => {
				// Second call must come from cache; no expectOne below = no request made.
				service.fetchSchema(config).subscribe(result => {
					expect(result).toEqual(schema);
					httpMock.expectNone(URL);
					done();
				});
			});

			httpMock.expectOne(URL).flush(schema);
		});

		it('retries on failure and then succeeds', done => {
			jest.useFakeTimers();
			const schema = {type: 'object', title: 'after-retry'};

			service.fetchSchema(config).subscribe(result => {
				expect(result).toEqual(schema);
				done();
			});

			// First attempt fails, retry schedules a timer; advance and answer the retry.
			httpMock.expectOne(URL).flush({}, {status: 500, statusText: 'Server Error'});
			jest.advanceTimersByTime(1000);
			httpMock.expectOne(URL).flush(schema);
		});

		it('falls back to a minimal offline schema after exhausting retries', done => {
			jest.useFakeTimers();

			service.fetchSchema(config).subscribe(result => {
				expect(result.title).toBe('Dataset (Offline)');
				expect(result.type).toBe('object');
				expect(result.properties).toEqual({});
				done();
			});

			// 1 initial attempt + 3 retries = 4 failures total.
			httpMock.expectOne(URL).flush({}, {status: 500, statusText: 'Server Error'});
			jest.advanceTimersByTime(1000);
			httpMock.expectOne(URL).flush({}, {status: 500, statusText: 'Server Error'});
			jest.advanceTimersByTime(2000);
			httpMock.expectOne(URL).flush({}, {status: 500, statusText: 'Server Error'});
			jest.advanceTimersByTime(3000);
			httpMock.expectOne(URL).flush({}, {status: 500, statusText: 'Server Error'});
		});
	});

	describe('clearCache', () => {
		it('removes the cached entry from persisted storage', done => {
			service.fetchSchema(config).subscribe(() => {
				expect(localStorage.getItem('validationSchemas')).toContain('cached');

				service.clearCache(config.id);

				const persisted = JSON.parse(localStorage.getItem('validationSchemas') ?? '{}');
				expect(persisted[config.id]).toBeUndefined();
				done();
			});
			httpMock.expectOne(URL).flush({title: 'cached'});
		});
	});
});
