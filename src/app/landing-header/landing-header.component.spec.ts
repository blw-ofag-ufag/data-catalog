import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {LandingHeaderComponent} from './landing-header.component';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

describe('LandingHeaderComponent', () => {
	let component: LandingHeaderComponent;
	let fixture: ComponentFixture<LandingHeaderComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [LandingHeaderComponent],
			imports: [NoopAnimationsModule, provideTranslateTesting()]
		}).compileComponents();

		fixture = TestBed.createComponent(LandingHeaderComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('renders the title and description i18n keys', () => {
		fixture.detectChanges();
		const host: HTMLElement = fixture.nativeElement;
		expect(host.querySelector('h1')?.textContent).toContain('app.title');
		expect(host.querySelector('p')?.textContent).toContain('app.description');
	});

	it('renders the landing header container wrapper', () => {
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.bleeding-landing-header')).not.toBeNull();
	});
});
