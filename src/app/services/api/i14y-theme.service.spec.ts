import {TestBed} from '@angular/core/testing';
import {HttpClient} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {I14YThemeService, I14YTheme} from './i14y-theme.service';

describe('I14YThemeService', () => {
	let service: I14YThemeService;
	let httpGet: jest.Mock;

	function configure(httpMock: Partial<HttpClient>): void {
		TestBed.configureTestingModule({
			providers: [I14YThemeService, {provide: HttpClient, useValue: httpMock}]
		});
		service = TestBed.inject(I14YThemeService);
	}

	beforeEach(() => {
		httpGet = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(() => {});
	});

	it('should be created', () => {
		configure({get: httpGet});
		expect(service).toBeTruthy();
	});

	it('initialises with the fallback themes', () => {
		configure({get: httpGet});
		const themes = service.getThemes();
		expect(themes.length).toBe(24);
		expect(themes.map(t => t.code)).toContain('agriculture');
	});

	describe('getThemeLabels / getThemeCodes', () => {
		beforeEach(() => configure({get: httpGet}));

		it('returns multilingual labels for a known code', () => {
			expect(service.getThemeLabels('agriculture')).toEqual({
				de: 'Landwirtschaft',
				fr: 'Agriculture',
				it: 'Agricoltura',
				en: 'Agriculture'
			});
		});

		it('returns null for an unknown code', () => {
			expect(service.getThemeLabels('not-a-theme')).toBeNull();
		});

		it('lists all fallback codes', () => {
			const codes = service.getThemeCodes();
			expect(codes).toContain('administration');
			expect(codes).toContain('work');
			expect(codes.length).toBe(24);
		});
	});

	describe('loadThemes', () => {
		it('emits themes from the API path and pushes them onto themes$', done => {
			httpGet.mockReturnValue(of({some: 'payload'}));
			configure({get: httpGet});

			service.loadThemes().subscribe((themes: I14YTheme[]) => {
				expect(httpGet).toHaveBeenCalledWith(
					'https://www.i14y.admin.ch/api/concepts/08da58dc-4dc8-f9cb-b6f2-7d16b3fa0cde/content'
				);
				// parseI14YResponse currently returns the fallback themes.
				expect(themes.length).toBe(24);
				service.themes$.subscribe(current => {
					expect(current).toEqual(themes);
					done();
				});
			});
		});

		it('falls back to the fallback themes when the API call fails', done => {
			httpGet.mockReturnValue(throwError(() => new Error('api down')));
			configure({get: httpGet});

			service.loadThemes().subscribe(themes => {
				expect(themes.length).toBe(24);
				expect(themes.map(t => t.code)).toContain('agriculture');
				done();
			});
		});

		it('keeps themes$ populated after a failed load', done => {
			httpGet.mockReturnValue(throwError(() => new Error('api down')));
			configure({get: httpGet});

			service.loadThemes().subscribe(() => {
				expect(service.getThemes().length).toBe(24);
				done();
			});
		});
	});
});
