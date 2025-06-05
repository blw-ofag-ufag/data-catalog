import {Component} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';

@Component({
	selector: 'root',
	templateUrl: './app.component.html',
	standalone: false,
	styleUrl: './app.component.scss'
})
export class AppComponent {
	constructor(
		private readonly activatedRoute: ActivatedRoute,
		private readonly translate: TranslateService,
		private readonly router: Router
	) {
		activatedRoute.queryParams.subscribe(params => {
			const langFromUrl = params['lang'] || 'en';
			const langFromTranslate = translate.currentLang;
			if (langFromUrl !== langFromTranslate) {
				translate.resetLang(langFromUrl);
			}
		});
		translate.onLangChange.subscribe(async event => {
			const langFromUrl = activatedRoute.snapshot.queryParams['lang'];
			const langFromTranslate = event.lang;
			if (langFromUrl !== langFromTranslate) {
				await router.navigate([], {queryParams: {lang: langFromTranslate}, queryParamsHandling: 'merge'});
			}
		});
	}

	title = 'DigiAgriFoodCH';
	navigation = [{url: 'index', label: 'Index'}];
}
