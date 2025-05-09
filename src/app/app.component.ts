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
			console.log('from url', params['lang']);
			const langFromUrl = params['lang'] || 'en';
			const langFromTranslate = translate.currentLang;
			if (langFromUrl !== langFromTranslate) {
				translate.resetLang(langFromUrl);
				console.log('setting after listening to route', langFromUrl);
			}
		});
		translate.onLangChange.subscribe(async event => {
			console.log('from lang change', event.lang);
			const langFromUrl = activatedRoute.snapshot.queryParams['lang'];
			const langFromTranslate = event.lang;
			if (langFromUrl !== langFromTranslate) {
				await router.navigate([], {queryParams: {lang: langFromTranslate}, queryParamsHandling: 'merge'});
				console.log('setting after listening to route',langFromTranslate);
			}
		});
	}

	title = 'DigiAgriFoodCH';
	navigation = [{url: 'index', label: 'Index'}];
}
