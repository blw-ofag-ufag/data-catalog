// metadata-item.component.ts statically imports @angular/common/locales/* which
// ship as untransformed ESM; stub them so jest can parse the module graph.
jest.mock('@angular/common/locales/de', () => ({__esModule: true, default: ['de']}));
jest.mock('@angular/common/locales/fr', () => ({__esModule: true, default: ['fr']}));
jest.mock('@angular/common/locales/it', () => ({__esModule: true, default: ['it']}));

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router, provideRouter} from '@angular/router';
import {
	DateMetadataItemComponent,
	DefaultMetadataItemComponent,
	EnumComponent,
	LinkComponent,
	MetadataItemComponent,
	NoComponent,
	NumberComponent,
	WasDerivedFromComponent,
	YesComponent
} from './metadata-item.component';
import {provideTranslateTesting} from '../../../../tests/helpers/translate-testing';

describe('MetadataItemComponent', () => {
	let component: MetadataItemComponent;
	let fixture: ComponentFixture<MetadataItemComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MetadataItemComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [provideRouter([])]
		}).compileComponents();

		fixture = TestBed.createComponent(MetadataItemComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	describe('decideComponent', () => {
		it('returns YesComponent for true and NoComponent for false', () => {
			expect(component.decideComponent('whatever', true)).toBe(YesComponent);
			expect(component.decideComponent('whatever', false)).toBe(NoComponent);
		});

		it('returns DateMetadataItemComponent for date fields', () => {
			expect(component.decideComponent('dct:issued', '2024-01-01')).toBe(DateMetadataItemComponent);
			expect(component.decideComponent('dct:modified', '2024-01-01')).toBe(DateMetadataItemComponent);
		});

		it('returns WasDerivedFromComponent for prov:wasDerivedFrom', () => {
			expect(component.decideComponent('prov:wasDerivedFrom', ['title', 'id'])).toBe(WasDerivedFromComponent);
		});

		it('returns LinkComponent for http string values', () => {
			expect(component.decideComponent('dcat:landingPage', 'https://example.com')).toBe(LinkComponent);
		});

		it('returns NumberComponent for numeric values', () => {
			expect(component.decideComponent('bv:retentionPeriod', 42)).toBe(NumberComponent);
		});

		it('returns EnumComponent for enum-type string fields', () => {
			expect(component.decideComponent('dct:accessRights', 'PUBLIC')).toBe(EnumComponent);
		});

		it('falls back to DefaultMetadataItemComponent for plain strings', () => {
			expect(component.decideComponent('dcat:version', '1.0')).toBe(DefaultMetadataItemComponent);
		});
	});

	describe('rendering via the outlet', () => {
		it('renders a default item label/value through translateField', () => {
			component.label = 'dcat:version';
			component.data = '2.0' as any;
			fixture.detectChanges();
			// translateField echoes the raw string when no translation exists
			expect(fixture.nativeElement.textContent).toContain('2.0');
		});

		it('renders an http value as an anchor link', () => {
			component.label = 'dcat:landingPage';
			component.data = 'https://example.org/page' as any;
			fixture.detectChanges();
			const anchor = fixture.nativeElement.querySelector('a');
			expect(anchor).toBeTruthy();
			expect(anchor.getAttribute('href')).toBe('https://example.org/page');
		});

		it('renders the boolean "yes" component', () => {
			component.label = 'bv:archivalValue';
			component.data = true as any;
			fixture.detectChanges();
			// translate pipe echoes the key
			expect(fixture.nativeElement.textContent).toContain('common.yes');
		});
	});
});

describe('WasDerivedFromComponent', () => {
	it('navigates to /details preserving publisher and lang query params', () => {
		const navigate = jest.fn();
		const route: any = {snapshot: {queryParams: {publisher: 'PUB', lang: 'de', dataset: 'old'}}};
		TestBed.configureTestingModule({
			imports: [WasDerivedFromComponent, provideTranslateTesting()],
			providers: [
				{provide: Router, useValue: {navigate}},
				{provide: ActivatedRoute, useValue: route}
			]
		});
		const fixture = TestBed.createComponent(WasDerivedFromComponent);
		fixture.componentInstance.navigateToDataset('new-id');
		expect(navigate).toHaveBeenCalledWith(['/details'], {
			queryParams: {publisher: 'PUB', dataset: 'new-id', lang: 'de'}
		});
	});
});

describe('EnumComponent', () => {
	it('maps label to data in paramEntry on init', () => {
		TestBed.configureTestingModule({
			imports: [EnumComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [provideRouter([])]
		});
		const fixture = TestBed.createComponent(EnumComponent);
		fixture.componentInstance.label = 'dct:accessRights';
		fixture.componentInstance.data = 'PUBLIC';
		fixture.detectChanges();
		expect(fixture.componentInstance.paramEntry['dct:accessRights']).toBe('PUBLIC');
	});
});
