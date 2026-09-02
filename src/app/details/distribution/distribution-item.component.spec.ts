import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {DefaultDistributionItemComponent, DistributionItemComponent, DistributionLinkComponent} from './distribution-item.component';
import {provideTranslateTesting} from '../../../../tests/helpers/translate-testing';

describe('DistributionItemComponent', () => {
	let component: DistributionItemComponent;
	let fixture: ComponentFixture<DistributionItemComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DistributionItemComponent, provideTranslateTesting()],
			providers: [provideRouter([])]
		}).compileComponents();

		fixture = TestBed.createComponent(DistributionItemComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	describe('decideComponent', () => {
		it('returns DistributionLinkComponent for an http accessURL', () => {
			expect(component.decideComponent('dcat:accessURL', 'https://example.com/data')).toBe(DistributionLinkComponent);
		});

		it('returns DistributionLinkComponent for an http downloadURL', () => {
			expect(component.decideComponent('dcat:downloadURL', 'http://example.com/file.csv')).toBe(DistributionLinkComponent);
		});

		it('returns DefaultDistributionItemComponent for non-URL values', () => {
			expect(component.decideComponent('dct:format', 'CSV')).toBe(DefaultDistributionItemComponent);
		});
	});

	it('renders an access URL as an anchor link', () => {
		component.label = 'dcat:accessURL';
		component.data = 'https://example.com/access';
		fixture.detectChanges();
		const anchor: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
		expect(anchor).toBeTruthy();
		expect(anchor.getAttribute('href')).toBe('https://example.com/access');
		expect(anchor.getAttribute('target')).toBe('_blank');
	});

	it('renders a non-URL value as plain text via translateField', () => {
		component.label = 'dct:format';
		component.data = 'CSV';
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('a')).toBeNull();
		expect(fixture.nativeElement.textContent).toContain('CSV');
	});
});

describe('DistributionLinkComponent', () => {
	it('opens the url in a new window on mouseup for http data', () => {
		const open = jest.spyOn(window, 'open').mockImplementation(() => null);
		TestBed.configureTestingModule({imports: [DistributionLinkComponent]});
		const fixture = TestBed.createComponent(DistributionLinkComponent);
		fixture.componentInstance.data = 'https://example.com/x';
		fixture.componentInstance.onMouseUp(new MouseEvent('mouseup'));
		expect(open).toHaveBeenCalledWith('https://example.com/x', '_blank', 'noopener,noreferrer');
		open.mockRestore();
	});

	it('does not open a window for non-http data', () => {
		const open = jest.spyOn(window, 'open').mockImplementation(() => null);
		TestBed.configureTestingModule({imports: [DistributionLinkComponent]});
		const fixture = TestBed.createComponent(DistributionLinkComponent);
		fixture.componentInstance.data = 'not-a-url';
		fixture.componentInstance.onMouseUp(new MouseEvent('mouseup'));
		expect(open).not.toHaveBeenCalled();
		open.mockRestore();
	});
});
