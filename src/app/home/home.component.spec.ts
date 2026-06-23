import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {HomeComponent} from './home.component';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

describe('HomeComponent', () => {
	let component: HomeComponent;
	let fixture: ComponentFixture<HomeComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [HomeComponent],
			imports: [NoopAnimationsModule, provideTranslateTesting()]
		}).compileComponents();

		fixture = TestBed.createComponent(HomeComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('renders the static heading content', () => {
		fixture.detectChanges();
		const host: HTMLElement = fixture.nativeElement;
		expect(host.querySelector('h1')).not.toBeNull();
		expect(host.textContent).toContain('Thank you for choosing Oblique');
	});

	it('renders the oblique logo svg', () => {
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('#oblique_logo')).not.toBeNull();
	});
});
