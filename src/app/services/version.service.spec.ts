import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {VersionService} from './version.service';

describe('VersionService', () => {
	let service: VersionService;
	let httpMock: HttpTestingController;
	const VERSION_URL = './assets/VERSION.txt';

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [VersionService, provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(VersionService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('fetches VERSION.txt as text and trims the result', done => {
		service.getVersion().subscribe(version => {
			expect(version).toBe('1.2.3');
			done();
		});

		const req = httpMock.expectOne(VERSION_URL);
		expect(req.request.method).toBe('GET');
		expect(req.request.responseType).toBe('text');
		req.flush('  1.2.3\n');
	});

	it('falls back to "dev" when the request errors', done => {
		service.getVersion().subscribe(version => {
			expect(version).toBe('dev');
			done();
		});

		httpMock.expectOne(VERSION_URL).error(new ProgressEvent('network error'));
	});
});
