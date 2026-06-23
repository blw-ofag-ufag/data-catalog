import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {FooterComponent} from './footer.component';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';

describe('FooterComponent', () => {
	let component: FooterComponent;
	let fixture: ComponentFixture<FooterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FooterComponent, NoopAnimationsModule, provideTranslateTesting()]
		}).compileComponents();

		fixture = TestBed.createComponent(FooterComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('renders the static footer grid sections', () => {
		fixture.detectChanges();
		const host: HTMLElement = fixture.nativeElement;
		expect(host.querySelector('.ob-grid')).not.toBeNull();
		const headings = Array.from(host.querySelectorAll('h5')).map(h => h.textContent?.trim());
		expect(headings).toEqual(expect.arrayContaining(['Über uns', 'Bleiben sie informiert', 'Weitere Informationen']));
	});
});
