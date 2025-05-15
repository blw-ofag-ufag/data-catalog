import {Component, Injector, Input, LOCALE_ID} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {TextOrTranslatable} from '../../models/types/TextOrTranslatable';
import {TranslateFieldPipe} from '../../translate-field.pipe';
import {DatePipe, JsonPipe, NgComponentOutlet} from '@angular/common';
import {registerLocaleData} from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import { MatChip, MatChipSet } from "@angular/material/chips";
import { MatExpansionPanel } from "@angular/material/expansion";

// Lokalisierung registrieren
registerLocaleData(localeDe);
registerLocaleData(localeFr);
registerLocaleData(localeIt);


@Component({
	templateUrl: './free-list-item.component.html',
	styleUrl: '../details.component.scss',
	imports: [MatChip, MatChipSet],
	standalone: true
})
export class FreeListItemComponent {
	data: string[] = [];
	label: string = '';

	constructor(private readonly injector: Injector) {
		this.label = this.injector.get('label', '');
		this.data = this.injector.get('data', '');
	}
}

@Component({
	templateUrl: './default-metadata-item.component.html',
	styleUrl: '../details.component.scss',
	imports: [TranslatePipe, TranslateFieldPipe, JsonPipe],
	standalone: true
})
export class DefaultMetadataItemComponent {
	data: TextOrTranslatable = '';
	label: string = '';

	constructor(private readonly injector: Injector) {
		this.label = this.injector.get('label', '');
		this.data = this.injector.get('data', '');
	}
}

@Component({
	templateUrl: './date-metadata-item.component.html',
	styleUrl: '../details.component.scss',
	imports: [DatePipe],
	standalone: true
})
export class DateMetadataItemComponent {
	data: string = '';
	label: string = '';
	@Input() locale: string;

	constructor(
		private readonly injector: Injector,
		private readonly translate: TranslateService
	) {
		this.label = this.injector.get('label', '');
		this.data = this.injector.get('data', '');
		this.locale = this.translate.currentLang;
		this.translate.onLangChange.subscribe(evt => {
			this.locale = evt.lang;
		});
	}
}

@Component({
	selector: 'metadata-item',
	template: ` <div class="data-row">
		<ng-container *ngComponentOutlet="decideComponent(label, data); injector: createInjector(label, data)"> </ng-container>
	</div>`,
	styleUrl: '../details.component.scss',
	imports: [NgComponentOutlet, JsonPipe],
	standalone: true
})
export class MetadataItemComponent {
	@Input() label: string = '';
	@Input() data = {};

	constructor(private injector: Injector) {}

	decideComponent(label: string, data: any) {
		switch (label) {
			case 'dct:issued':
			case 'dct:modified':
				return DateMetadataItemComponent;
			case 'dcat:theme':
				return FreeListItemComponent;
			// case 'internal:rawData':
			// 	return RawDataComponent;
			default:
				return DefaultMetadataItemComponent;
		}
		return DefaultMetadataItemComponent;
	}

	createInjector(label: string, data: any) {
		return Injector.create({
			providers: [
				{provide: 'label', useValue: label},
				{provide: 'data', useValue: data}
			],
			parent: this.injector
		});
	}
}
