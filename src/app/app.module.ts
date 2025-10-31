import {LOCALE_ID, NgModule} from '@angular/core';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {ObButtonModule, ObExternalLinkModule, ObMasterLayoutConfig, ObMasterLayoutModule, provideObliqueConfiguration} from '@oblique/oblique';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {registerLocaleData} from '@angular/common';
import localeDECH from '@angular/common/locales/de-CH';
import localeFRCH from '@angular/common/locales/fr-CH';
import localeITCH from '@angular/common/locales/it-CH';
import {TranslateModule} from '@ngx-translate/core';
import {provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
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

registerLocaleData(localeDECH);
registerLocaleData(localeFRCH);
registerLocaleData(localeITCH);

@NgModule({
	declarations: [AppComponent, HomeComponent, IndexComponent, AboutComponent, HandbookComponent, LandingHeaderComponent],
	imports: [
		AppRoutingModule,
		ObMasterLayoutModule,
		BrowserAnimationsModule,
		ObButtonModule,
		TranslateModule,
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
		provideObliqueConfiguration({
			accessibilityStatement: {
				applicationName: 'Agri-Food Data Catalog',
				applicationOperator: 'Federal Office for Agriculture FOAG and Federal Food Safety and Veterinary Office FSVO',
				contact: {/* at least 1 email or phone number has to be provided */ emails: [''], phones: ['']}
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
