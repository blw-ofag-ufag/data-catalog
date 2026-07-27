import {TestBed} from '@angular/core/testing';
import {KeywordService, Keyword} from './keyword.service';
import {PublisherService} from './publisher.service';
import {mockFetchJson, mockFetchByUrl, restoreFetch} from '../../../../tests/helpers/fetch-mock';

describe('KeywordService', () => {
	let service: KeywordService;
	let publisherService: PublisherService;

	beforeEach(() => {
		// jsdom has no global fetch; provide a stub so the fetch-mock helper can spy on it.
		(globalThis as any).fetch = jest.fn();
		TestBed.configureTestingModule({});
		publisherService = TestBed.inject(PublisherService);
		service = TestBed.inject(KeywordService);
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		restoreFetch();
		delete (globalThis as any).fetch;
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('starts with an empty keyword list', () => {
		expect(service.getKeywords()).toEqual([]);
		expect(service.getKeywordCodes()).toEqual([]);
	});

	describe('loadKeywords', () => {
		it('parses the multilingual map into sorted Keyword objects', done => {
			mockFetchJson({
				zebra: {de: 'Zebra', fr: 'Zèbre', it: 'Zebra-it', en: 'Zebra-en'},
				apple: {de: 'Apfel', fr: 'Pomme', it: 'Mela', en: 'Apple'}
			});

			service.loadKeywords().subscribe((keywords: Keyword[]) => {
				expect(keywords.map(k => k.code)).toEqual(['apple', 'zebra']);
				expect(keywords[0].labels).toEqual({de: 'Apfel', fr: 'Pomme', it: 'Mela', en: 'Apple'});
				done();
			});
		});

		it('falls back to the code when a translation is missing', done => {
			mockFetchJson({lonely: {de: 'Einsam'}});

			service.loadKeywords().subscribe(keywords => {
				const lonely = keywords.find(k => k.code === 'lonely')!;
				expect(lonely.labels.de).toBe('Einsam');
				expect(lonely.labels.fr).toBe('lonely');
				expect(lonely.labels.en).toBe('lonely');
				done();
			});
		});

		it('deduplicates keywords sharing a code across publishers', done => {
			// Same payload for every publisher URL -> the Map collapses duplicate codes.
			mockFetchJson({shared: {de: 'Geteilt', fr: 'Partagé', it: 'Condiviso', en: 'Shared'}});

			service.loadKeywords().subscribe(keywords => {
				expect(keywords.filter(k => k.code === 'shared').length).toBe(1);
				done();
			});
		});

		it('ignores non-object payloads and malformed entries', done => {
			const urls = publisherService.getPublishers().map(p => p.getKeywordUrl());
			mockFetchByUrl([
				{match: urls[0], payload: ['not', 'an', 'object']},
				{match: urls[1] ?? urls[0], payload: {valid: {de: 'Gültig'}, bad: 'string-value'}}
			]);

			service.loadKeywords().subscribe(keywords => {
				expect(keywords.find(k => k.code === 'bad')).toBeUndefined();
				expect(keywords.find(k => k.code === 'valid')).toBeTruthy();
				done();
			});
		});

		it('does not re-fetch and returns the cached data once loaded', async () => {
			const firstSpy = mockFetchJson({k: {de: 'K', fr: 'K', it: 'K', en: 'K'}});
			await new Promise<void>(resolve => service.loadKeywords().subscribe(() => resolve()));
			expect(firstSpy).toHaveBeenCalled();

			// New payload that must be ignored because keywords are already cached.
			jest.clearAllMocks();
			(globalThis.fetch as jest.Mock).mockClear();

			const keywords = await new Promise<Keyword[]>(resolve => service.loadKeywords().subscribe(resolve));
			expect(globalThis.fetch).not.toHaveBeenCalled();
			expect(keywords.map(k => k.code)).toEqual(['k']);
		});
	});

	describe('accessors after load', () => {
		beforeEach(done => {
			mockFetchJson({
				agri: {de: 'Landwirtschaft', fr: 'Agriculture', it: 'Agricoltura', en: 'Agriculture'}
			});
			service.loadKeywords().subscribe(() => done());
		});

		it('getKeywords returns the loaded keywords', () => {
			expect(service.getKeywords().map(k => k.code)).toContain('agri');
		});

		it('getKeywordCodes returns just the codes', () => {
			expect(service.getKeywordCodes()).toContain('agri');
		});

		it('getKeywordLabels returns labels for a known code', () => {
			expect(service.getKeywordLabels('agri')).toEqual({
				de: 'Landwirtschaft',
				fr: 'Agriculture',
				it: 'Agricoltura',
				en: 'Agriculture'
			});
		});

		it('getKeywordLabels returns null for an unknown code', () => {
			expect(service.getKeywordLabels('nope')).toBeNull();
		});
	});

	it('emits an empty list when every keyword fetch fails', done => {
		jest.spyOn(globalThis, 'fetch' as never).mockRejectedValue(new Error('down') as never);

		service.loadKeywords().subscribe(keywords => {
			expect(keywords).toEqual([]);
			done();
		});
	});
});
