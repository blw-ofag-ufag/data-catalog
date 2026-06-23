import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, provideRouter} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {of} from 'rxjs';
import {AppComponent} from './app.component';
import {VersionService} from './services/version.service';
import {DebugService} from './services/debug.service';
import {provideTranslateTesting} from '../../tests/helpers/translate-testing';

/**
 * AppComponent is tested SHALLOWLY: its real template bootstraps the Oblique
 * `ob-master-layout`, whose global popover / events services are known to fail
 * under TestBed. We override the template with an empty one and assert the
 * component logic (title, navigation, language/legal helpers).
 */
describe('AppComponent', () => {
	let component: AppComponent;
	let fixture: ComponentFixture<AppComponent>;

	const versionStub = {getVersion: jest.fn().mockReturnValue(of('1.2.3'))};
	const debugStub = {toggleDebug: jest.fn()};
	const activatedRouteStub = {
		queryParams: of({}),
		snapshot: {queryParams: {}}
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [AppComponent],
			imports: [NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				provideRouter([]),
				{provide: ActivatedRoute, useValue: activatedRouteStub},
				{provide: VersionService, useValue: versionStub},
				{provide: DebugService, useValue: debugStub}
			]
		})
			.overrideComponent(AppComponent, {set: {template: '<div class="app-root-stub"></div>'}})
			.compileComponents();

		TestBed.inject(TranslateService).use('en');
		fixture = TestBed.createComponent(AppComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('exposes the application title', () => {
		expect(component.title).toBe('DigiAgriFoodCH');
	});

	it('builds the top navigation from translation keys', () => {
		fixture.detectChanges();
		const urls = component.topNavigation.map(n => n.url);
		expect(urls).toEqual(['index', 'about', 'handbook']);
		expect(component.topNavigation.length).toBe(3);
	});

	it('exposes the version stream from the version service', done => {
		component.version$.subscribe(v => {
			expect(v).toBe('1.2.3');
			done();
		});
	});

	it('registers a window.toggleDebug hook delegating to the debug service', () => {
		(window as any).toggleDebug();
		expect(debugStub.toggleDebug).toHaveBeenCalled();
	});

	it('returns the current language defaulting to en', () => {
		expect(component.getCurrentLanguage()).toBe('en');
	});

	describe('getLegalBasisUrl', () => {
		const cases: Array<[string, string]> = [
			['de', 'https://www.admin.ch/gov/de/start/rechtliches.html'],
			['fr', 'https://www.admin.ch/gov/fr/accueil/conditions-utilisation.html'],
			['it', 'https://www.admin.ch/gov/it/pagina-iniziale/basi-legali.html'],
			['en', 'https://www.admin.ch/gov/en/start/terms-and-conditions.html']
		];

		cases.forEach(([lang, expected]) => {
			it(`returns the ${lang} legal basis url`, () => {
				TestBed.inject(TranslateService).use(lang);
				expect(component.getLegalBasisUrl()).toBe(expected);
			});
		});

		it('strips region suffixes (de-CH -> de)', () => {
			TestBed.inject(TranslateService).use('de-CH');
			expect(component.getLegalBasisUrl()).toBe('https://www.admin.ch/gov/de/start/rechtliches.html');
		});
	});

	it('completes the destroy subject on ngOnDestroy without error', () => {
		expect(() => component.ngOnDestroy()).not.toThrow();
	});
});
