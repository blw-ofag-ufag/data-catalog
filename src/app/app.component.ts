import {AfterViewInit, Component, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {Observable, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {ObINavigationLink} from '@oblique/oblique';
import {DateAdapter} from '@angular/material/core';
import {Locale} from 'date-fns';
import {de, enUS, fr, it} from 'date-fns/locale';
import {VersionService} from './services/version.service';
import {DebugService} from './services/debug.service';

const DATE_FNS_LOCALES: Record<string, Locale> = {de, fr, it, en: enUS};

@Component({
	selector: 'root',
	templateUrl: './app.component.html',
	standalone: false,
	styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy, AfterViewInit {
	title = 'DigiAgriFoodCH';
	navigation = [{url: 'index', label: 'Index'}];
	private readonly destroy$ = new Subject<void>();
	version$: Observable<string>;

	topNavigation: ObINavigationLink[] = [];

	constructor(
		private readonly activatedRoute: ActivatedRoute,
		private readonly translate: TranslateService,
		private readonly router: Router,
		private readonly versionService: VersionService,
		private readonly debugService: DebugService,
		private readonly dateAdapter: DateAdapter<Date>
	) {
		this.version$ = this.versionService.getVersion();
		this.updateNavigation();
		this.updateDateAdapterLocale(translate.currentLang);

		// Expose toggleDebug() to window for developer use
		(window as any).toggleDebug = () => this.debugService.toggleDebug();

		activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
			const langFromUrl = params['lang'] || 'en';
			const langFromTranslate = translate.currentLang;
			if (langFromUrl !== langFromTranslate) {
				translate.resetLang(langFromUrl);
			}
		});
		translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(async event => {
			this.updateNavigation();
			this.updateDateAdapterLocale(event.lang);
			const langFromUrl = activatedRoute.snapshot.queryParams['lang'];
			const langFromTranslate = event.lang;
			if (langFromUrl !== langFromTranslate) {
				await router.navigate([], {queryParams: {lang: langFromTranslate}, queryParamsHandling: 'merge'});
			}
		});
	}

	// Localize the Material datepickers to the selected UI language (issue #224).
	private updateDateAdapterLocale(lang: string | undefined): void {
		const langCode = (lang || 'de').split('-')[0];
		this.dateAdapter.setLocale(DATE_FNS_LOCALES[langCode] ?? de);
	}

	private updateNavigation() {
		this.topNavigation = [
			{label: this.translate.instant('app.navigation.catalog'), url: 'index'},
			{label: this.translate.instant('app.navigation.about'), url: 'about'},
			{label: this.translate.instant('app.navigation.handbook'), url: 'handbook'}
		];
	}

	getCurrentLanguage(): string {
		return this.translate.currentLang || 'en';
	}

	getLegalBasisUrl(): string {
		const lang = this.getCurrentLanguage();
		const langCode = lang.split('-')[0];

		switch (langCode) {
			case 'de':
				return 'https://www.admin.ch/gov/de/start/rechtliches.html';
			case 'fr':
				return 'https://www.admin.ch/gov/fr/accueil/conditions-utilisation.html';
			case 'it':
				return 'https://www.admin.ch/gov/it/pagina-iniziale/basi-legali.html';
			case 'en':
			default:
				return 'https://www.admin.ch/gov/en/start/terms-and-conditions.html';
		}
	}

	ngAfterViewInit() {
		// Remove accessibility statement link from footer
		setTimeout(() => {
			const accessibilityLink = document.querySelector('ob-master-layout-footer > div > ul > li > a[routerlink="accessibility-statement"]');
			if (accessibilityLink) {
				accessibilityLink.remove();
			}
		}, 0);
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
