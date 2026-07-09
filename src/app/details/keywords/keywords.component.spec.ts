import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {provideRouter} from '@angular/router';
import {KeywordsComponent} from './keywords.component';
import {DatasetService} from '../../services/api/api.service';
import {KeywordService} from '../../services/api/keyword.service';
import {provideTranslateTesting} from '../../../../tests/helpers/translate-testing';
import {stubKeywordService} from '../../../../tests/helpers/service-stubs';

function stubDatasetService(keywords: string[]): any {
	return {
		getLocalizedKeywords: jest.fn().mockReturnValue(keywords)
	};
}

describe('KeywordsComponent', () => {
	let component: KeywordsComponent;
	let fixture: ComponentFixture<KeywordsComponent>;

	async function setup(localized: string[], keywordCodes: string[] = localized): Promise<void> {
		await TestBed.configureTestingModule({
			imports: [KeywordsComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				provideRouter([]),
				{provide: DatasetService, useValue: stubDatasetService(localized)},
				{provide: KeywordService, useValue: stubKeywordService()}
			]
		}).compileComponents();

		fixture = TestBed.createComponent(KeywordsComponent);
		component = fixture.componentInstance;
		component.dataset = {'dcat:keyword': keywordCodes} as any;
	}

	it('should create', async () => {
		await setup([]);
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('returns [] from getLocalizedKeywords when there is no dataset', async () => {
		await setup([]);
		component.dataset = null;
		expect(component.getLocalizedKeywords()).toEqual([]);
	});

	it('renders a chip per localized keyword', async () => {
		await setup(['Agriculture', 'Soil']);
		fixture.detectChanges();
		const chips = fixture.nativeElement.querySelectorAll('mat-chip');
		expect(chips.length).toBe(2);
		expect(fixture.nativeElement.textContent).toContain('Agriculture');
		expect(fixture.nativeElement.textContent).toContain('Soil');
	});

	it('builds the keyword filter query param from the chip routerLink', async () => {
		await setup(['Soil'], ['soil-code']);
		fixture.detectChanges();
		const filter = component.keywordFiltered('Soil');
		// No keyword labels in the stub => falls back to display value
		expect(filter).toEqual({'dcat:keyword': 'Soil'});
	});

	it('onChipClick prevents default and stops propagation', async () => {
		await setup(['Soil']);
		const event = {preventDefault: jest.fn(), stopPropagation: jest.fn()} as unknown as MouseEvent;
		component.onChipClick(event);
		expect(event.preventDefault).toHaveBeenCalled();
		expect(event.stopPropagation).toHaveBeenCalled();
	});

	it('getKeywordKey maps a display value back to its code when labels match', async () => {
		await setup(['Soil'], ['soil-code']);
		// Make the KeywordService resolve the code to a matching label.
		// currentLang is undefined in the testing TranslateModule, so resolution
		// falls back to the English label.
		(component as any).keywordService.getKeywordLabels = jest
			.fn()
			.mockReturnValue({de: 'Boden', en: 'Soil', fr: '', it: ''});
		expect(component.getKeywordKey('Soil')).toBe('soil-code');
	});

	it('getKeywordKey falls back to the display value when no dataset keywords', async () => {
		await setup(['Soil']);
		component.dataset = {} as any;
		expect(component.getKeywordKey('Soil')).toBe('Soil');
	});

	// #221 regression: keyword support was gated on `productType === 'dataset'`, so dataService /
	// datasetSeries records rendered the '—' placeholder on the detail page even though the very
	// same records showed their chips in the index cards/list. The gate is presence-based now.
	describe('keyword support is presence-based, not product-type based (#221)', () => {
		it.each(['dataService', 'datasetSeries', 'dataset'])('renders keyword chips for a %s record', async productType => {
			await setup(['Agriculture']);
			component.dataset = {'dcat:keyword': ['agri'], productType} as any;
			fixture.detectChanges();

			expect(component.hasKeywordSupport()).toBe(true);
			expect(component.getLocalizedKeywords()).toEqual(['Agriculture']);
			expect(fixture.nativeElement.querySelectorAll('mat-chip').length).toBe(1);
		});

		it.each(['dataService', 'datasetSeries', 'dataset'])('reports no keyword support for a %s record with no keywords', async productType => {
			await setup([]);
			component.dataset = {productType} as any;

			expect(component.hasKeywordSupport()).toBe(false);
			expect(component.getLocalizedKeywords()).toEqual([]);
		});

		it('reports no keyword support for an empty keyword array', async () => {
			await setup([]);
			component.dataset = {'dcat:keyword': [], productType: 'dataService'} as any;
			expect(component.hasKeywordSupport()).toBe(false);
		});
	});
});
