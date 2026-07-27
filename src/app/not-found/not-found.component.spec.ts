import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {NotFoundComponent} from './not-found.component';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

describe('NotFoundComponent', () => {
	let component: NotFoundComponent;
	let fixture: ComponentFixture<NotFoundComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [NotFoundComponent, NoopAnimationsModule, provideTranslateTesting()]
		}).compileComponents();

		fixture = TestBed.createComponent(NotFoundComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('renders the 404 heading and translated message keys', () => {
		fixture.detectChanges();
		const host: HTMLElement = fixture.nativeElement;
		expect(host.querySelector('h1')?.textContent).toContain('404');
		// FakeTranslateLoader echoes keys back.
		expect(host.querySelector('h1')?.textContent).toContain('not-found.title');
		expect(host.querySelector('p')?.textContent).toContain('not-found.message');
	});
});
