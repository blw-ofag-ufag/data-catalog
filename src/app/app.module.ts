import {LOCALE_ID, NgModule} from '@angular/core';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {
	ObButtonModule,
	ObExternalLinkModule,
	ObIconModule,
	ObMasterLayoutConfig,
	ObMasterLayoutModule,
	provideObliqueConfiguration,
	provideObliqueTranslations
} from '@oblique/oblique';
import {MultiTranslateHttpLoader} from 'ngx-translate-multi-http-loader';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {registerLocaleData} from '@angular/common';
import localeDECH from '@angular/common/locales/de-CH';
import localeFRCH from '@angular/common/locales/fr-CH';
import localeITCH from '@angular/common/locales/it-CH';
import {TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {HttpBackend, provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {HomeComponent} from './home/home.component';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatChip, MatChipListbox, MatChipOption} from '@angular/material/chips';
import {IndexComponent} from './index/index.component';
import {AboutComponent} from './about/about.component';
import {HandbookComponent} from './handbook/handbook.component';
import {LandingHeaderComponent} from './landing-header/landing-header.component';
import {IndexCardsComponent} from './index-cards/index-cards.component';
import {IndexListComponent} from './index-list/index-list.component';
import {IndexSwitchComponent} from './index-switch/index-switch.component';
import {MatTable} from '@angular/material/table';
import {FooterComponent} from './footer/footer.component';
import {MatNavList} from '@angular/material/list';
import {MAT_DATE_LOCALE, MatDateFormats} from '@angular/material/core';
import {provideDateFnsAdapter} from '@angular/material-date-fns-adapter';
import {de} from 'date-fns/locale';

registerLocaleData(localeDECH);
registerLocaleData(localeFRCH);
registerLocaleData(localeITCH);

// Explicit Swiss date format so dates can be typed manually (issue #238) with an
// unambiguous parse/display format. Calendar labels are still localized via the
// active date-fns locale, which is updated on language change (issue #224).
export const APP_DATE_FORMATS: MatDateFormats = {
	parse: {
		dateInput: 'dd.MM.yyyy'
	},
	display: {
		dateInput: 'dd.MM.yyyy',
		monthYearLabel: 'MMM yyyy',
		dateA11yLabel: 'dd.MM.yyyy',
		monthYearA11yLabel: 'MMMM yyyy'
	}
};

@NgModule({
	declarations: [AppComponent, HomeComponent, IndexComponent, AboutComponent, HandbookComponent, LandingHeaderComponent],
	imports: [
		AppRoutingModule,
		ObMasterLayoutModule,
		ObIconModule,
		BrowserAnimationsModule,
		ObButtonModule,
		TranslateModule.forRoot({
			loader: {
				provide: TranslateLoader,
				useFactory: (httpBackend: HttpBackend) => new MultiTranslateHttpLoader(httpBackend, [{prefix: './assets/i18n/', suffix: '.json'}]),
				deps: [HttpBackend]
			}
		}),
		MatButtonModule,
		MatIconModule,
		ObExternalLinkModule,
		MatChipListbox,
		MatChipOption,
		MatTable,
		IndexListComponent,
		IndexCardsComponent,
		IndexSwitchComponent,
		FooterComponent,
		MatNavList,
		MatChip
	],
	providers: [
		{provide: LOCALE_ID, useValue: 'de-CH'},
		provideDateFnsAdapter(APP_DATE_FORMATS),
		{provide: MAT_DATE_LOCALE, useValue: de},
		provideObliqueTranslations(),
		provideObliqueConfiguration({
			accessibilityStatement: {
				applicationName: 'Agri-Food Data Catalog',
				applicationOperator: 'Federal Office for Agriculture FOAG and Federal Food Safety and Veterinary Office FSVO',
				contact: [{/* at least 1 email or phone number has to be provided */ email: 'kompetenzzentrumdigitaletransformation@blw.admin.ch'}],
				conformity: 'partial',
				createdOn: new Date('2024-01-01'),
				exceptions: ['Some features may not be fully accessible']
			}
		}),
		// {provide: HTTP_INTERCEPTORS, useClass: ObHttpApiInterceptor, multi: true},
		provideHttpClient(withInterceptorsFromDi())
	],
	bootstrap: [AppComponent]
})
export class AppModule {
	constructor(config: ObMasterLayoutConfig) {
		config.homePageRoute = 'index';
		config.locale.locales = ['de-CH', 'fr-CH', 'it-CH', 'en-US'];
		config.layout.hasMaxWidth = true;
		config.header.serviceNavigation.displayLanguages = true;
		// config.header.isCustom = true;
	}
}
