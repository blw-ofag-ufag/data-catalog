import {Component, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import { ObINavigationLink } from "@oblique/oblique";

@Component({
	selector: 'root',
	templateUrl: './app.component.html',
	standalone: false,
	styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
	title = 'DigiAgriFoodCH';
	navigation = [{url: 'index', label: 'Index'}];
	private destroy$ = new Subject<void>();

	topNavigation: ObINavigationLink[] = [];

	constructor(
		private readonly activatedRoute: ActivatedRoute,
		private readonly translate: TranslateService,
		private readonly router: Router
	) {
		this.updateNavigation();
		
		activatedRoute.queryParams
			.pipe(takeUntil(this.destroy$))
			.subscribe(params => {
				const langFromUrl = params['lang'] || 'en';
				const langFromTranslate = translate.currentLang;
				if (langFromUrl !== langFromTranslate) {
					translate.resetLang(langFromUrl);
				}
			});
		translate.onLangChange
			.pipe(takeUntil(this.destroy$))
			.subscribe(async event => {
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
			{ label: this.translate.instant('app.navigation.catalog'), url: 'index' },
			{ label: this.translate.instant('app.navigation.about'), url: 'about' },
			{ label: this.translate.instant('app.navigation.handbook'), url: 'handbook' }
		];
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
