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
import {ContactPoint, DataProduct, DatasetSchema, TemporalCoverage} from '../../models/schemas/dataset';
import {enumArrayFields, enumTypes} from '../../models/enum-fields';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {MultiDatasetService} from '../../services/api/multi-dataset-service.service';
import {KeywordService} from '../../services/api/keyword.service';

// Lokalisierung registrieren
registerLocaleData(localeDe);
registerLocaleData(localeFr);
registerLocaleData(localeIt);

@Component({
	templateUrl: './free-list-item.component.html',
	styleUrl: '../details.component.scss',
	imports: [MatChip, MatChipSet, TranslatePipe, RouterLink],
	standalone: true
})
export class FreeListItemComponent {
	data: string[] = [];
	label: string = '';
	private readonly keywordService: KeywordService;
	private readonly translateService: TranslateService;
	private readonly router: Router;

	constructor(private readonly injector: Injector) {
		this.label = this.injector.get('label', '');
		this.data = this.injector.get('data', []);
		this.keywordService = this.injector.get(KeywordService);
		this.translateService = this.injector.get(TranslateService);
		this.router = this.injector.get(Router);
	}

	/**
	 * Query params that reproduce this chip as an index filter (#255).
	 * Array facets filter with the same `field=value` URL shape as scalar enums.
	 */
	queryParamsFor(item: string): {[key: string]: string} {
		return {[this.label]: item};
	}

	/**
	 * Navigate on mouseup, like the other components rendered through NgComponentOutlet
	 * (see DatasetLinkListComponent). Plain routerLink click navigation does not fire for
	 * chips in this view, which is why the theme chip looked dead while the scalar enum
	 * chips — rendered directly in details.component.html — worked (#255).
	 */
	navigateTo(item: string): void {
		void this.router.navigate(['/index'], {queryParams: this.queryParamsFor(item)});
	}

	getTranslatedValue(item: string): string {
		// For theme values, create a translation key
		if (this.label === 'dcat:theme') {
			return `choices.dataset.dcat:theme.${item}`;
		}
		// For keywords, translate using KeywordService
		if (this.label === 'dcat:keyword') {
			const labels = this.keywordService.getKeywordLabels(item);
			if (labels) {
				const currentLang = this.translateService.currentLang || 'en';
				return labels[currentLang as keyof typeof labels] || labels.en || labels.de || labels.fr || labels.it || item;
			}
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
				<a [routerLink]="['/details']" [queryParams]="getQueryParams(id)" (mouseup)="navigateToDataset(id)" style="cursor: pointer;">{{
					getDatasetTitle(id) || id
				}}</a>
			</li>
		}
	</ul>`,
	styles: 'ul {list-style-type: none; padding: 0; margin: 0; padding-inline-start: 0;}',
	standalone: true,
	imports: [RouterLink]
})
export class DatasetLinkListComponent implements OnInit, OnDestroy {
	data: string[] = [];
	private readonly route: ActivatedRoute;
	private readonly router: Router;
	private readonly multiDatasetService: MultiDatasetService;
	private readonly translateService: TranslateService;
	private datasets: DataProduct[] = [];
	private readonly destroy$ = new Subject<void>();

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', []);
		this.route = this.injector.get(ActivatedRoute);
		this.router = this.injector.get(Router);
		this.multiDatasetService = this.injector.get(MultiDatasetService);
		this.translateService = this.injector.get(TranslateService);
	}

	ngOnInit(): void {
		// Ensure the dataset index is available so reference IDs can be resolved to
		// titles even when the details page was deep-linked (index never visited).
		this.multiDatasetService.ensureIndexLoaded();

		// Subscribe to datasets to lookup titles
		this.multiDatasetService.datasets$.pipe(takeUntil(this.destroy$)).subscribe(datasets => {
			this.datasets = datasets;
		});
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	getDatasetTitle(datasetId: string): string {
		const dataset = this.datasets.find(d => d['dct:identifier'] === datasetId);
		if (dataset?.['dct:title']) {
			const currentLang = this.translateService.currentLang || 'de';
			const title = dataset['dct:title'];

			// Try to get title in current language, fallback to German, then French
			if (typeof title === 'object' && title !== null) {
				const titleObj = title as any;
				return titleObj[currentLang] || titleObj.de || titleObj.fr || titleObj.it || titleObj.en || '';
			}
		}
		return '';
	}

	getQueryParams(datasetId: string) {
		const currentParams = this.route.snapshot.queryParams;
		// Resolve the referenced record's own publisher + product type so cross-publisher /
		// non-dataset references load the correct detail page (#221); falls back to the current
		// context when the reference isn't in the store.
		const ref = this.datasets.find(d => d['dct:identifier'] === datasetId);
		return {
			publisher: (ref?.['dct:publisher'] as string) ?? currentParams['publisher'],
			dataset: datasetId,
			type: ((ref as any)?.['productType'] as string) ?? 'dataset',
			lang: currentParams['lang']
		};
	}

	// Navigation happens on mouseup (matching the other detail-page links), since
	// plain click navigation is intercepted in this view. routerLink is kept only
	// to render a real href so the anchor gets normal link styling (hover/visited).
	navigateToDataset(datasetId: string) {
		this.router.navigate(['/details'], {queryParams: this.getQueryParams(datasetId)});
	}
}

@Component({
	template: '{{ "common.yes" | translate }}',
	standalone: true,
	imports: [TranslatePipe]
})
export class YesComponent {}

@Component({
	template: '{{ "common.no" | translate }}',
	standalone: true,
	imports: [TranslatePipe]
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
			case 'prov:wasDerivedFrom':
				return DatasetLinkListComponent;
			case 'dcat:contactPoint':
				return ContactPointComponent;
			case 'dct:temporal':
				return TemporalComponent;
			case 'prov:wasGeneratedBy':
				return WasGeneratedByComponent;
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
