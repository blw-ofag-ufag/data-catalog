import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {DistributionComponent} from './distribution.component';
import {provideTranslateTesting} from '../../../../tests/helpers/translate-testing';

describe('DistributionComponent', () => {
	let component: DistributionComponent;
	let fixture: ComponentFixture<DistributionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DistributionComponent, provideTranslateTesting()],
			providers: [provideRouter([])]
		}).compileComponents();

		fixture = TestBed.createComponent(DistributionComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	describe('getDistributionFields', () => {
		it('returns an empty array when distribution is null', () => {
			component.distribution = null;
			expect(component.getDistributionFields()).toEqual([]);
		});

		it('only returns populated fields', () => {
			component.distribution = {
				'dct:identifier': 'dist-1',
				'dcat:accessURL': 'https://example.com/access',
				'dct:format': 'CSV',
				'dct:title': '',
				'dct:description': null,
				'schema:comment': {}
			};
			const labels = component.getDistributionFields().map(f => f.label);
			expect(labels).toContain('dct:identifier');
			expect(labels).toContain('dcat:accessURL');
			expect(labels).toContain('dct:format');
			expect(labels).not.toContain('dct:title'); // empty string filtered
			expect(labels).not.toContain('dct:description'); // null filtered
			expect(labels).not.toContain('schema:comment'); // empty object filtered
		});
	});

	describe('template', () => {
		it('renders distinct access and download URL links', () => {
			component.distribution = {
				'dcat:accessURL': 'https://example.com/access',
				'dcat:downloadURL': 'https://example.com/download.csv',
				'dct:format': 'CSV'
			};
			fixture.detectChanges();
			const anchors: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));
			const hrefs = anchors.map(a => a.getAttribute('href'));
			expect(hrefs).toContain('https://example.com/access');
			expect(hrefs).toContain('https://example.com/download.csv');
		});

		it('renders the format value as plain text (not a link)', () => {
			component.distribution = {'dct:format': 'CSV'};
			fixture.detectChanges();
			expect(fixture.nativeElement.textContent).toContain('CSV');
			expect(fixture.nativeElement.querySelector('a')).toBeNull();
		});

		it('renders an empty table body when distribution has no displayable fields', () => {
			component.distribution = {};
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelectorAll('tr').length).toBe(0);
		});
	});
});
