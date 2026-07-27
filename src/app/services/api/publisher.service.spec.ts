import {TestBed} from '@angular/core/testing';
import {PublisherService} from './publisher.service';

describe('PublisherService', () => {
	let service: PublisherService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(PublisherService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('getPublishers', () => {
		it('returns the publishers loaded from the codegen data', () => {
			const publishers = service.getPublishers();
			expect(publishers.length).toBeGreaterThan(0);
		});

		it('exposes id, githubRepo and readBranch for each publisher', () => {
			for (const publisher of service.getPublishers()) {
				expect(typeof publisher.id).toBe('string');
				expect(typeof publisher.githubRepo).toBe('string');
				expect(typeof publisher.readBranch).toBe('string');
			}
		});

		it('returns the same array instance on repeated calls', () => {
			expect(service.getPublishers()).toBe(service.getPublishers());
		});
	});

	describe('URL builders', () => {
		it('getProcessedUrl points at data/processed/datasets.json on the read branch', () => {
			const publisher = service.getPublishers()[0];
			expect(publisher.getProcessedUrl()).toBe(
				`https://raw.githubusercontent.com/${publisher.githubRepo}/refs/heads/${publisher.readBranch}/data/processed/datasets.json`
			);
		});

		it('getKeywordUrl points at data/schemas/keywords.json on the read branch', () => {
			const publisher = service.getPublishers()[0];
			expect(publisher.getKeywordUrl()).toBe(
				`https://raw.githubusercontent.com/${publisher.githubRepo}/refs/heads/${publisher.readBranch}/data/schemas/keywords.json`
			);
		});

		it('getDetailUrl embeds the dataset id under data/raw/datasets', () => {
			const publisher = service.getPublishers()[0];
			expect(publisher.getDetailUrl('abc-123')).toBe(
				`https://raw.githubusercontent.com/${publisher.githubRepo}/refs/heads/${publisher.readBranch}/data/raw/datasets/abc-123.json`
			);
		});

		it('builds distinct detail URLs per dataset id', () => {
			const publisher = service.getPublishers()[0];
			expect(publisher.getDetailUrl('one')).not.toBe(publisher.getDetailUrl('two'));
		});

		it('builds per-publisher URLs that include each publisher repo', () => {
			for (const publisher of service.getPublishers()) {
				expect(publisher.getProcessedUrl()).toContain(publisher.githubRepo);
				expect(publisher.getKeywordUrl()).toContain(publisher.githubRepo);
			}
		});
	});
});
