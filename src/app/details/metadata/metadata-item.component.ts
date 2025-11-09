import {Component, Injector, Input, OnDestroy, OnInit} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {TextOrTranslatable} from '../../models/types/TextOrTranslatable';
import {TranslateFieldPipe} from '../../translate-field.pipe';
import {DatePipe, NgComponentOutlet, registerLocaleData} from '@angular/common';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import localeDe from '@angular/common/locales/de';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import {MatChip, MatChipSet} from '@angular/material/chips';
import {ContactPoint, TemporalCoverage, enumArrayFields, enumTypes} from '../../models/schemas/dataset';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';

// Lokalisierung registrieren
registerLocaleData(localeDe);
registerLocaleData(localeFr);
registerLocaleData(localeIt);

@Component({
	templateUrl: './free-list-item.component.html',
	styleUrl: '../details.component.scss',
	imports: [MatChip, MatChipSet, TranslatePipe],
	standalone: true
})
export class FreeListItemComponent {
	data: string[] = [];
	label: string = '';

	constructor(private readonly injector: Injector) {
		this.label = this.injector.get('label', '');
		this.data = this.injector.get('data', []);
	}

	getTranslatedValue(item: string): string {
		// For theme values, create a translation key
		if (this.label === 'dcat:theme') {
			return `choices.dataset.dcat:theme.${item}`;
		}
		// For keywords, return as-is (no translation needed)
		if (this.label === 'dcat:keyword') {
			return item;
		}
		// For other fields, return the value as-is or with appropriate translation key
		return item;
	}
}

@Component({
	selector: 'enum',
	templateUrl: './enum.component.html',
	styleUrl: '../details.component.scss',
	imports: [TranslateFieldPipe, MatChipSet, MatChip, RouterLink],
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
	imports: [TranslateFieldPipe],
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
export class DateMetadataItemComponent implements OnDestroy {
	data: string = '';
	label: string = '';
	@Input() locale: string;
	private readonly destroy$ = new Subject<void>();

	constructor(
		private readonly injector: Injector,
		private readonly translate: TranslateService
	) {
		this.label = this.injector.get('label', '');
		this.data = this.injector.get('data', '');
		this.locale = this.translate.currentLang;
		this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(evt => {
			this.locale = evt.lang;
		});
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}
}

@Component({
	templateUrl: './temporal-metadata-item.component.html',
	styleUrl: '../details.component.scss',
	imports: [DatePipe],
	standalone: true
})
export class TemporalComponent implements OnDestroy {
	@Input() locale: string;
	data: TemporalCoverage = {'dcat:start_date': '', 'dcat:end_date': ''};
	private readonly destroy$ = new Subject<void>();

	constructor(
		private readonly injector: Injector,
		private readonly translate: TranslateService
	) {
		this.data = this.injector.get('data', this.data);
		this.locale = this.translate.currentLang;
		this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(evt => {
			this.locale = evt.lang;
		});
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}
}

@Component({
	template: '<a [href]="data" target="_blank" rel="noopener noreferrer" (mouseup)="onMouseUp($event)" style="cursor: pointer;">{{data}}</a>',
	standalone: true
})
export class LinkComponent {
	data: string = '';

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', '');
	}

	onMouseUp(event: Event) {
		if (this.data && this.data.startsWith('http')) {
			window.open(this.data, '_blank', 'noopener,noreferrer');
		}
	}
}

@Component({
	template:
		'<ul>@for (item of data; track $index) {<li><a [href]="item" target="_blank" rel="noopener noreferrer" (mouseup)="onMouseUp($event, item)" style="cursor: pointer;">{{item}}</a></li>}</ul>',
	styles: 'ul {list-style-type: none; padding: 0; margin: 0; padding-inline-start: 0;}',
	standalone: true
})
export class LinkListComponent {
	data: string[] = [];

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', '');
	}

	onMouseUp(event: Event, url: string) {
		if (url && url.startsWith('http')) {
			window.open(url, '_blank', 'noopener,noreferrer');
		}
	}
}

@Component({
	templateUrl: './contact-metadata-item.component.html',
	standalone: true,
	imports: []
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
	template:
		'<p>{{ data[0] }} - <a [href]="data[1]" target="_blank" rel="noopener noreferrer" (mouseup)="onMouseUp($event)" style="cursor: pointer;">{{ data[1] }}</a></p>',
	standalone: true
})
export class WasGeneratedByComponent {
	data: string[] = [];

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', []);
	}

	onMouseUp(event: Event) {
		if (this.data[1] && this.data[1].startsWith('http')) {
			window.open(this.data[1], '_blank', 'noopener,noreferrer');
		}
	}
}

@Component({
	template:
		'<p>{{ data[0] }} - <a (mouseup)="navigateToDataset(data[1])" style="cursor: pointer; text-decoration: underline; color: #0066cc;">{{ data[1] }}</a></p>',
	standalone: true
})
export class WasDerivedFromComponent {
	data: string[] = [];
	private readonly route: ActivatedRoute;
	private readonly router: Router;

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', []);
		this.route = this.injector.get(ActivatedRoute);
		this.router = this.injector.get(Router);
	}

	navigateToDataset(datasetId: string) {
		const currentParams = this.route.snapshot.queryParams;
		const queryParams = {
			publisher: currentParams['publisher'],
			dataset: datasetId,
			lang: currentParams['lang']
		};
		this.router.navigate(['/details'], {queryParams});
	}
}

@Component({
	template:
		'<ul>@for (item of data; track $index) {<li><a [href]="item.uri" target="_blank" rel="noopener noreferrer" (mouseup)="onMouseUp($event, item.uri)" style="cursor: pointer;">{{item.alias || item.uri}}</a></li>}</ul>',
	styles: 'ul {list-style-type: none; padding: 0; margin: 0; padding-inline-start: 0;}',
	standalone: true
})
export class RelatedResourcesComponent {
	data: {alias?: string; uri: string}[] = [];

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', []);
	}

	onMouseUp(event: Event, uri: string) {
		if (uri && uri.startsWith('http')) {
			window.open(uri, '_blank', 'noopener,noreferrer');
		}
	}
}

@Component({
	template: '<ul>@for (id of data; track $index) {<li>{{ id }}</li>}</ul>',
	styles: 'ul {list-style-type: none; padding: 0; margin: 0; padding-inline-start: 0;}',
	standalone: true
})
export class DatasetIdListComponent {
	data: string[] = [];

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', []);
	}
}

@Component({
	template: `<ul>
		@for (id of data; track $index) {
			<li>
				<a (mouseup)="navigateToDataset(id)" style="cursor: pointer; text-decoration: underline">{{ id }}</a>
			</li>
		}
	</ul>`,
	styles: 'ul {list-style-type: none; padding: 0; margin: 0; padding-inline-start: 0;}',
	standalone: true
})
export class DatasetLinkListComponent {
	data: string[] = [];
	private readonly route: ActivatedRoute;
	private readonly router: Router;

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', []);
		this.route = this.injector.get(ActivatedRoute);
		this.router = this.injector.get(Router);
	}

	navigateToDataset(datasetId: string) {
		const currentParams = this.route.snapshot.queryParams;
		const queryParams = {
			publisher: currentParams['publisher'],
			dataset: datasetId,
			lang: currentParams['lang']
		};
		this.router.navigate(['/details'], {queryParams});
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
	imports: [NgComponentOutlet],
	standalone: true
})
export class MetadataItemComponent {
	@Input() label: string = '';
	@Input() data = {};

	constructor(
		private readonly injector: Injector,
		protected route: ActivatedRoute
	) {}

	decideComponent(label: string, data: any) {
		// Handle boolean values
		if (data === true) {
			return YesComponent;
		}
		if (data === false) {
			return NoComponent;
		}

		// Handle enum array fields FIRST (before other checks)
		if (enumArrayFields.includes(label) && Array.isArray(data)) {
			return FreeListItemComponent;
		}

		// Handle specific field types
		switch (label) {
			case 'dct:issued':
			case 'dct:modified':
			case 'bv:abrogation':
				return DateMetadataItemComponent;
			case 'dcat:inSeries':
			case 'dct:replaces':
				return DatasetLinkListComponent;
			case 'dcat:contactPoint':
				return ContactPointComponent;
			case 'dct:temporal':
				return TemporalComponent;
			case 'prov:wasGeneratedBy':
				return WasGeneratedByComponent;
			case 'prov:wasDerivedFrom':
				return WasDerivedFromComponent;
		}

		// Handle URL links
		if (typeof data == 'string' && data.startsWith('http')) {
			return LinkComponent;
		}
		if (Array.isArray(data) && data.every(item => typeof item === 'string' && item.startsWith('http'))) {
			return LinkListComponent;
		}

		// Handle numbers
		if (typeof data === 'number') {
			return NumberComponent;
		}

		// Handle related resources (complex objects)
		if (label === 'foaf:page' && Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
			return RelatedResourcesComponent;
		}

		// Handle enum types (single string values)
		if (enumTypes.includes(label) && typeof data === 'string') {
			return EnumComponent;
		}

		// Default fallback
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
