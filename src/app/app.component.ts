import {Component, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {Observable, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {ObINavigationLink} from '@oblique/oblique';
import {VersionService} from './services/version.service';

@Component({
	selector: 'root',
	templateUrl: './app.component.html',
	standalone: false,
	styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
	title = 'DigiAgriFoodCH';
	navigation = [{url: 'index', label: 'Index'}];
	private readonly destroy$ = new Subject<void>();
	version$: Observable<string>;

	topNavigation: ObINavigationLink[] = [];

	constructor(
		private readonly activatedRoute: ActivatedRoute,
		private readonly translate: TranslateService,
		private readonly router: Router,
		private readonly versionService: VersionService
	) {
		this.version$ = this.versionService.getVersion();
		this.updateNavigation();

		activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
			const langFromUrl = params['lang'] || 'en';
			const langFromTranslate = translate.currentLang;
			if (langFromUrl !== langFromTranslate) {
				translate.resetLang(langFromUrl);
			}
		});
		translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(async event => {
			this.updateNavigation();
			const langFromUrl = activatedRoute.snapshot.queryParams['lang'];
			const langFromTranslate = event.lang;
			if (langFromUrl !== langFromTranslate) {
				await router.navigate([], {queryParams: {lang: langFromTranslate}, queryParamsHandling: 'merge'});
			}
		});
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

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
