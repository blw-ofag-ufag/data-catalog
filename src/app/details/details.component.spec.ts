// details -> metadata-item statically imports @angular/common/locales/* (ESM);
// stub them so jest can parse the module graph.
jest.mock('@angular/common/locales/de', () => ({__esModule: true, default: ['de']}));
jest.mock('@angular/common/locales/fr', () => ({__esModule: true, default: ['fr']}));
jest.mock('@angular/common/locales/it', () => ({__esModule: true, default: ['it']}));

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router, provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {DetailsComponent} from './details.component';
import {DatasetService} from '../services/api/api.service';
import {PublisherService} from '../services/api/publisher.service';
import {DatasetMetadataService} from '../services/metadata/dataset-metadata.service';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';
import {AsyncPipe} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {TranslateFieldPipe} from '../translate-field.pipe';
import {OrgPipe} from '../org.pipe';

const TEST_IMPORTS = [AsyncPipe, TranslatePipe, TranslateFieldPipe, OrgPipe];

const STUB_DATASET: any = {
	'dct:identifier': 'ds-1',
	'dct:title': {de: 'Bodenkarte', fr: 'Carte des sols', en: 'Soil map'},
	'dct:description': {de: 'Beschreibung', fr: 'Description', en: 'A description'},
	'dct:publisher': 'BLW-OFAG-UFAG-FOAG',
	'dct:issued': '2023-01-15',
	'dct:modified': '2024-03-10',
	'dcat:keyword': ['soil'],
	'dcat:distribution': [
		{
			'dct:identifier': 'dist-1',
			'dct:title': {de: 'CSV', en: 'CSV'},
			'dcat:accessURL': 'https://example.com/access',
			'dcat:downloadURL': 'https://example.com/download.csv',
			'dct:format': 'CSV'
		}
	],
	'prov:qualifiedAttribution': []
};

function stubDatasetService(dataset: any): any {
	return {
		getDatasetById: jest.fn().mockReturnValue(of(dataset)),
		getLoadingState: jest.fn().mockReturnValue(of(false)),
		getLocalizedKeywords: jest.fn().mockReturnValue(['soil'])
	};
}

function stubPublisherService(): any {
	return {
		getPublishers: jest.fn().mockReturnValue([
			{
				id: 'BLW-OFAG-UFAG-FOAG',
				githubRepo: 'org/repo',
				readBranch: 'main',
				getDetailUrl: (id: string) => `https://raw/${id}.json`
			}
		])
	};
}

// DatasetMetadataService.getMetadata() returns null in this stub so the component
// uses the schema-less fallback (filterAndNormalizeMetadata).
function stubMetadataService(): any {
	return {
		getMetadata: jest.fn().mockReturnValue(of(null))
	};
}

function configure(dataset: any, queryParams: Record<string, string> = {publisher: 'BLW-OFAG-UFAG-FOAG', dataset: 'ds-1', lang: 'de'}) {
	const route: any = {
		queryParams: of(queryParams),
		snapshot: {queryParams}
	};
	return TestBed.configureTestingModule({
		imports: [DetailsComponent, NoopAnimationsModule, provideTranslateTesting()],
		providers: [
			provideRouter([]),
			{provide: DatasetService, useValue: stubDatasetService(dataset)},
			{provide: PublisherService, useValue: stubPublisherService()},
			{provide: DatasetMetadataService, useValue: stubMetadataService()},
			{provide: ActivatedRoute, useValue: route}
		]
	})
		// Drop the heavier standalone imports (Oblique popover/button, MatIcon svg
		// registry, admindir-lookup fetch, child detail components) so the host
		// template renders without external side effects.
		.overrideComponent(DetailsComponent, {set: {imports: TEST_IMPORTS, template: TEST_TEMPLATE}});
}

// A trimmed template exercising the real bindings we care about: localized
// title/description, publisher chip, dates and the distribution list.
const TEST_TEMPLATE = `
@if (dataset$ | async; as dataset) {
	@if (currentLang$ | async; as lang) {
		<h2 class="main-heading">{{ ["dct:title", dataset["dct:title"]] | translateField }}</h2>
		<p class="description">{{ ["dct:description", dataset["dct:description"]] | translateField }}</p>
		<span class="publisher">{{ dataset["dct:publisher"] | org }}</span>
		@if (dataset["dcat:distribution"] && dataset["dcat:distribution"].length > 0) {
			@for (dist of dataset["dcat:distribution"]; track $index) {
				<div class="dist">
					<span class="dist-title">{{ ["dct:title", dist["dct:title"]] | translateField }}</span>
					<span class="dist-format">{{ dist["dct:format"] }}</span>
					<span class="dist-access">{{ dist["dcat:accessURL"] }}</span>
					<span class="dist-download">{{ dist["dcat:downloadURL"] }}</span>
				</div>
			}
		}
		<table>
			<tbody>
				@for (meta of metadata$ | async; track $index) {
					<tr class="meta-row"><td class="meta-label">{{ meta.label }}</td></tr>
				}
			</tbody>
		</table>
	}
} @else {
	@if (loading$ | async) {
		<pre class="loading">loading...</pre>
	} @else {
		<div class="not-found">not found</div>
	}
}`;

describe('DetailsComponent', () => {
	let fixture: ComponentFixture<DetailsComponent>;
	let component: DetailsComponent;

	afterEach(() => TestBed.resetTestingModule());

	it('should create', async () => {
		await configure(STUB_DATASET).compileComponents();
		fixture = TestBed.createComponent(DetailsComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('reads the dataset id from the route query params', async () => {
		await configure(STUB_DATASET).compileComponents();
		fixture = TestBed.createComponent(DetailsComponent);
		fixture.detectChanges();
		expect(fixture.componentInstance.dataset).toBe('ds-1');
	});

	it('renders the localized title and description (de)', async () => {
		await configure(STUB_DATASET).compileComponents();
		TestBed.inject(TranslateService).use('de');
		fixture = TestBed.createComponent(DetailsComponent);
		fixture.detectChanges();
		const text = fixture.nativeElement.textContent;
		expect(fixture.nativeElement.querySelector('.main-heading').textContent).toContain('Bodenkarte');
		expect(fixture.nativeElement.querySelector('.description').textContent).toContain('Beschreibung');
		expect(text).toContain('choices.dataset.dct:publisher.BLW-OFAG-UFAG-FOAG');
	});

	it('renders distribution access and download URLs', async () => {
		await configure(STUB_DATASET).compileComponents();
		TestBed.inject(TranslateService).use('de');
		fixture = TestBed.createComponent(DetailsComponent);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.dist-access').textContent).toContain('https://example.com/access');
		expect(fixture.nativeElement.querySelector('.dist-download').textContent).toContain('https://example.com/download.csv');
		expect(fixture.nativeElement.querySelector('.dist-format').textContent).toContain('CSV');
	});

	it('shows the not-found path when the dataset is null and not loading', async () => {
		const svc = stubDatasetService(null);
		const route: any = {queryParams: of({dataset: 'missing'}), snapshot: {queryParams: {dataset: 'missing'}}};
		await TestBed.configureTestingModule({
			imports: [DetailsComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				provideRouter([]),
				{provide: DatasetService, useValue: svc},
				{provide: PublisherService, useValue: stubPublisherService()},
				{provide: DatasetMetadataService, useValue: stubMetadataService()},
				{provide: ActivatedRoute, useValue: route}
			]
		})
			.overrideComponent(DetailsComponent, {set: {imports: TEST_IMPORTS, template: TEST_TEMPLATE}})
			.compileComponents();
		fixture = TestBed.createComponent(DetailsComponent);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.not-found')).toBeTruthy();
		expect(fixture.nativeElement.querySelector('.main-heading')).toBeNull();
	});

	describe('GitHub / raw JSON URLs', () => {
		it('builds the GitHub file URL from publisher + dataset params', async () => {
			await configure(STUB_DATASET).compileComponents();
			fixture = TestBed.createComponent(DetailsComponent);
			fixture.detectChanges();
			expect(fixture.componentInstance.getGitHubFileUrl()).toBe(
				'https://github.com/org/repo/blob/main/data/raw/datasets/ds-1.json'
			);
		});

		it('builds the raw JSON URL via the publisher detail url', async () => {
			await configure(STUB_DATASET).compileComponents();
			fixture = TestBed.createComponent(DetailsComponent);
			fixture.detectChanges();
			expect(fixture.componentInstance.getRawJsonUrl()).toBe('https://raw/ds-1.json');
		});

		it('returns an empty URL when params are missing', async () => {
			await configure(STUB_DATASET, {} as any).compileComponents();
			fixture = TestBed.createComponent(DetailsComponent);
			fixture.detectChanges();
			expect(fixture.componentInstance.getGitHubFileUrl()).toBe('');
			expect(fixture.componentInstance.getRawJsonUrl()).toBe('');
		});
	});

	describe('getFormatIcon', () => {
		it('maps known formats to icons', async () => {
			await configure(STUB_DATASET).compileComponents();
			fixture = TestBed.createComponent(DetailsComponent);
			const c = fixture.componentInstance;
			expect(c.getFormatIcon('CSV')).toBe('file_csv');
			expect(c.getFormatIcon('pdf')).toBe('file_pdf');
			expect(c.getFormatIcon('WMS')).toBe('file_server');
		});

		it('returns the default icon for unknown/empty formats', async () => {
			await configure(STUB_DATASET).compileComponents();
			fixture = TestBed.createComponent(DetailsComponent);
			expect(fixture.componentInstance.getFormatIcon('')).toBe('file');
			expect(fixture.componentInstance.getFormatIcon('xyz')).toBe('file');
		});
	});

	describe('openEditTab', () => {
		it('navigates to /modify in edit mode for the current dataset', async () => {
			await configure(STUB_DATASET).compileComponents();
			fixture = TestBed.createComponent(DetailsComponent);
			fixture.detectChanges();
			const router = TestBed.inject(Router);
			const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
			fixture.componentInstance.openEditTab();
			expect(navigate).toHaveBeenCalledWith(['/modify'], {
				queryParams: {mode: 'edit', dataset: 'ds-1'}
			});
		});
	});

	describe('filter helpers', () => {
		it('datasetFiltered returns the dataset class filter', async () => {
			await configure(STUB_DATASET).compileComponents();
			fixture = TestBed.createComponent(DetailsComponent);
			expect(fixture.componentInstance.datasetFiltered()).toEqual({class: 'dataset'});
		});

		it('publisherFiltered returns the publisher filter', async () => {
			await configure(STUB_DATASET).compileComponents();
			fixture = TestBed.createComponent(DetailsComponent);
			expect(fixture.componentInstance.publisherFiltered('X')).toEqual({'dct:publisher': 'X'});
		});
	});
});
