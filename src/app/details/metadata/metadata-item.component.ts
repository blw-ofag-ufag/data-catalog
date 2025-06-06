import {Component, Injector, input, Input, LOCALE_ID, OnInit} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {TextOrTranslatable} from '../../models/types/TextOrTranslatable';
import {TranslateFieldPipe} from '../../translate-field.pipe';
import {DatePipe, JsonPipe, NgComponentOutlet} from '@angular/common';
import {registerLocaleData} from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import {MatChip, MatChipSet} from '@angular/material/chips';
import {ContactPoint, enumTypes, TemporalCoverage} from '../../models/schemas/dataset';
import {ActivatedRoute, Router, RouterLink, RouterModule} from '@angular/router';

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
	selector: 'enum',
	templateUrl: './enum.component.html',
	styleUrl: '../details.component.scss',
	imports: [JsonPipe, TranslateFieldPipe, MatChipSet, MatChip, RouterLink],
	standalone: true
})
export class EnumComponent implements OnInit {
	@Input() data: string = '';
	@Input() label: string = '';
	paramEntry: {[key: string]: string} = {};

	constructor(private readonly injector: Injector) {}

	ngOnInit(): void {
		this.paramEntry[this.label] = this.data;
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
	templateUrl: './temporal-metadata-item.component.html',
	styleUrl: '../details.component.scss',
	imports: [DatePipe],
	standalone: true
})
export class TemporalComponent {
	@Input() locale: string;
	data: TemporalCoverage = {'dcat:start_date': '', 'dcat:end_date': ''};

	constructor(
		private readonly injector: Injector,
		private readonly translate: TranslateService
	) {
		this.data = this.injector.get('data', this.data);
		this.locale = this.translate.currentLang;
		this.translate.onLangChange.subscribe(evt => {
			this.locale = evt.lang;
		});
	}
}

@Component({
	template: '<a href="{{data}}" target="_blank">{{data}}</a>',
	standalone: true
})
export class LinkComponent {
	data: string = '';

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', '');
	}
}

@Component({
	template: '<ul>@for (item of data; track $index) {<li><a href="{{item}}" target="_blank">{{item}}</a></li>}</ul>',
	styles: 'ul {list-style-type: none; padding: 0; margin: 0; padding-inline-start: 0;}',
	standalone: true
})
export class LinkListComponent {
	data: string[] = [];

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', '');
	}
}

@Component({
	templateUrl: './contact-metadata-item.component.html',
	standalone: true,
	imports: [JsonPipe]
})
export class ContactPointComponent {
	data: ContactPoint = {'schema:name': '', 'schema:email': ''};

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', this.data);
	}
}

@Component({
	template: '<p>{{ data }}</p>',
	standalone: true
})
export class NumberComponent {
	data: ContactPoint = {'schema:name': '', 'schema:email': ''};

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', this.data);
	}
}

@Component({
	template: '<p>Yes</p>',
	standalone: true
})
export class YesComponent {}

@Component({
	template: '<p>No</p>',
	standalone: true
})
export class NoComponent {}

@Component({
	selector: 'metadata-item',
	template: ` <div class="data-row">
		<ng-container *ngComponentOutlet="decideComponent(label, data); injector: createInjector(label, data)"></ng-container>
	</div>`,
	styleUrl: '../details.component.scss',
	imports: [NgComponentOutlet, JsonPipe],
	standalone: true
})
export class MetadataItemComponent {
	@Input() label: string = '';
	@Input() data = {};

	constructor(
		private injector: Injector,
		protected route: ActivatedRoute
	) {}

	decideComponent(label: string, data: any) {
		// if label in array EnumTypes
		if (data === true) {
			return YesComponent;
		}
		if (data === false) {
			return NoComponent;
		}
		if (typeof data == 'string' && data.startsWith('http')) {
			return LinkComponent;
		}
		if (Array.isArray(data) && data.every(item => typeof item === 'string' && item.startsWith('http'))) {
			return LinkListComponent;
		}
		if (label === 'dcat:contactPoint') {
			return ContactPointComponent;
		}
		if (typeof data === 'number') {
			return NumberComponent;
		}
		if (label === 'dct:temporal') {
			return TemporalComponent;
		}
		if (enumTypes.includes(label)) {
			return EnumComponent;
		} else {
			switch (label) {
				case 'dct:issued':
				case 'dct:modified':
				case 'bv:abrogation':
					return DateMetadataItemComponent;
				case 'dcat:theme':
					return FreeListItemComponent;
				// case 'internal:rawData':
				// 	return RawDataComponent;
				default:
					return DefaultMetadataItemComponent;
			}
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
