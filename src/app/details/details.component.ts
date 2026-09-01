import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {DataProduct} from '../models/schemas/dataset';
import {enumArrayFields, enumTypes} from '../models/enum-fields';
import {DatasetService} from '../services/api/api.service';
import {MultiDatasetService} from '../services/api/multi-dataset-service.service';
import {IndexCardsComponent} from '../index-cards/index-cards.component';
import {Observable, Subject, combineLatest, of, startWith} from 'rxjs';
import {AsyncPipe} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {map, switchMap, takeUntil, tap} from 'rxjs/operators';
import {DATA_PRODUCT_TYPE_REGISTRY, DEFAULT_DATA_PRODUCT_TYPE, DataProductType, resolveDataProductType} from '../models/data-product-type';
import {MatChip} from '@angular/material/chips';
import {OrgPipe} from '../org.pipe';
import {TranslateFieldPipe} from '../translate-field.pipe';
import {EnumComponent, MetadataItemComponent} from './metadata/metadata-item.component';
import {NormalizedMetadataElement, filterAndNormalizeMetadata} from './details.helpers';
import {DatasetMetadataConfig, DatasetMetadataService} from '../services/metadata/dataset-metadata.service';
import {MatAccordion, MatExpansionModule, MatExpansionPanel, MatExpansionPanelDescription, MatExpansionPanelHeader} from '@angular/material/expansion';
import {AdmindirLookupComponent} from '../admindir-lookup/admindir-lookup.component';
import {KeywordsComponent} from './keywords/keywords.component';
import {DistributionComponent} from './distribution/distribution.component';
import {NotFoundComponent} from '../not-found/not-found.component';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {ObButtonDirective} from '@oblique/oblique';
import {PublisherService} from '../services/api/publisher.service';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ObPopoverModule} from '@oblique/oblique';
import {PopoverLinksDirective} from '../directives/popover-links.directive';

@Component({
	selector: 'app-details',
	standalone: true,
	templateUrl: './details.component.html',
	imports: [
		AsyncPipe,
		MatChip,
		OrgPipe,
		MetadataItemComponent,
		MatExpansionPanel,
		MatExpansionPanelHeader,
		MatExpansionPanelDescription,
		MatExpansionModule,
		MatAccordion,
		AdmindirLookupComponent,
		EnumComponent,
		RouterLink,
		TranslatePipe,
		TranslateFieldPipe,
		KeywordsComponent,
		DistributionComponent,
		NotFoundComponent,
		MatIcon,
		ObButtonDirective,
		MatButton,
		ObPopoverModule,
		PopoverLinksDirective,
		IndexCardsComponent
	],
	styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnInit, OnDestroy {
	dataset: string = '';
	dataset$: Observable<DataProduct | null> = new Observable();
	loading$: Observable<boolean>;
	// lang$: Observable<string> = new Observable();
	currentLang$: Observable<string>;
	metadata$: Observable<NormalizedMetadataElement[]> = new Observable();
	// Contained/served datasets for container types (dataService/datasetSeries), rendered as a
	// dedicated "Data Sets" tile section (#221, Figma).
	subDatasets$: Observable<DataProduct[]> = of([]);
	// The record's own product type, captured once the record loads. Deep links/bookmarks may omit
	// the `type` query param, so the GitHub/raw URL builders derive the type from the loaded record
	// (falling back to the route param, then the default) rather than always 'dataset' (#221).
	private resolvedType: DataProductType | null = null;
	private readonly destroy$ = new Subject<void>();

	constructor(
		private readonly datasetService: DatasetService,
		private readonly multiDatasetService: MultiDatasetService,
		private readonly route: ActivatedRoute,
		private readonly router: Router,
		private readonly translate: TranslateService,
		private readonly publisherService: PublisherService,
		private readonly metadataService: DatasetMetadataService,
		private readonly sanitizer: DomSanitizer
	) {
		this.loading$ = this.datasetService.getLoadingState();
		this.currentLang$ = this.translate.onLangChange.pipe(
			map(event => event.lang),
			startWith(this.translate.currentLang) // emit initial value
		);
	}

	ngOnInit(): void {
		// this.lang$ = new BehaviorSubject(this.route.snapshot.queryParams['lang'] || 'en');
		this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
			this.dataset = params['dataset'];
			this.resolvedType = null; // reset per navigation; re-captured once *this* record loads
			// Capture the record's own product type as it flows through, so the GitHub/raw URL builders
			// use it rather than the `type` query param (absent on deep links/bookmarks). Done in a tap
			// on dataset$ so it holds for any subscriber, independent of whether metadata$ is used.
			//
			// getDatasetById ignores its argument and hands back the shared selectedDataset$ subject,
			// which still replays the PREVIOUS record until the new detail fetch resolves. Guard on the
			// identifier so a stale record can't stamp the wrong type onto the new page's links (#221).
			this.dataset$ = this.datasetService.getDatasetById(this.dataset).pipe(tap(record => (this.resolvedType = this.typeOfRequestedRecord(record))));

			// Render the record against the metadata for its own product type, so dataService /
			// datasetSeries detail pages show their type-specific fields (#221).
			this.metadata$ = this.dataset$.pipe(
				switchMap(dataset => {
					if (!dataset) {
						return of([] as NormalizedMetadataElement[]);
					}
					const type = resolveDataProductType(dataset.productType).type;
					return this.metadataService.getMetadataForType(type).pipe(map(metadataConfig => this.buildDetailFields(dataset, metadataConfig)));
				})
			);

			// Ensure the catalogue index is loaded so container references resolve to full datasets
			// even on a deep link / refresh (the index route may never have been visited) (#221).
			this.multiDatasetService.ensureIndexLoaded();

			// Resolve the container's contained/served dataset IDs to full datasets for the
			// dedicated "Data Sets" tile section (#221).
			this.subDatasets$ = combineLatest([this.dataset$, this.multiDatasetService.datasets$]).pipe(
				map(([record, all]) => {
					if (!record) {
						return [];
					}
					const ids = ((record['dcat:servesDataset'] ?? record['dcat:dataset']) as string[] | null) ?? [];
					return ids.map(id => all.find(d => d['dct:identifier'] === id)).filter((d): d is DataProduct => !!d);
				})
			);
		});
	}

	// Build the displayed detail fields for a record against the metadata for its product type.
	// Falls back to the schema-less normaliser if metadata isn't available.
	private buildDetailFields(dataset: DataProduct, metadataConfig: DatasetMetadataConfig | null): NormalizedMetadataElement[] {
		if (!metadataConfig) {
			return filterAndNormalizeMetadata(dataset);
		}

		// Container reference arrays render in the dedicated "Data Sets" tile section, not as a
		// Metadata row (#221).
		const containerFields = ['dcat:servesDataset', 'dcat:dataset'];
		const normalized: NormalizedMetadataElement[] = [];
		Object.entries(dataset).forEach(([key, value]) => {
			if (containerFields.includes(key)) {
				return;
			}
			const fieldMetadata = metadataConfig.fields.get(key);
			if (fieldMetadata?.displayInDetails && value != null) {
				normalized.push({label: key, data: value});
			}
		});

		const sorted = normalized.sort((a, b) => {
			const aOrder = metadataConfig.fields.get(a.label)?.displayOrder || 999;
			const bOrder = metadataConfig.fields.get(b.label)?.displayOrder || 999;
			return aOrder - bOrder;
		});

		return sorted.length > 0 ? sorted : filterAndNormalizeMetadata(dataset);
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}

	// Filter the index by a product type; used by the hero type chip so it links to the record's own
	// type (dataset / dataService / datasetSeries), matching the productType facet (#221).
	typeFiltered(type?: string) {
		return {
			productType: type || 'dataset'
		};
	}

	publisherFiltered(publisher: string) {
		return {
			'dct:publisher': publisher
		};
	}

	/**
	 * The product type of the record currently being requested, or null while it hasn't loaded.
	 * `selectedDataset$` replays the previously viewed record, so anything whose identifier doesn't
	 * match the requested one is treated as "not loaded yet" rather than adopted (#221).
	 */
	private typeOfRequestedRecord(record: DataProduct | null): DataProductType | null {
		if (!record || record['dct:identifier'] !== this.dataset) {
			return null;
		}
		return resolveDataProductType(record.productType).type;
	}

	// Resolve the product type so the GitHub/raw links point at the correct per-type folder
	// (data/raw/{segment}) rather than always 'datasets' (#221). Prefer the loaded record's own
	// productType (deep links/bookmarks may omit the `type` query param); fall back to the route
	// param, then the default.
	private currentType(): DataProductType {
		return this.resolvedType ?? resolveDataProductType(this.route.snapshot.queryParams['type']).type;
	}

	getGitHubFileUrl(): string {
		const params = this.route.snapshot.queryParams;
		const publisherId = params['publisher'];
		const datasetId = params['dataset'];
		if (!publisherId || !datasetId) return '';

		const publisher = this.publisherService.getPublishers().find(p => p.id === publisherId);
		if (!publisher) return '';

		const segment = DATA_PRODUCT_TYPE_REGISTRY[this.currentType()].segment;
		return `https://github.com/${publisher.githubRepo}/blob/${publisher.readBranch}/data/raw/${segment}/${datasetId}.json`;
	}

	getRawJsonUrl(): string {
		const params = this.route.snapshot.queryParams;
		const publisherId = params['publisher'];
		const datasetId = params['dataset'];
		if (!publisherId || !datasetId) return '';

		const publisher = this.publisherService.getPublishers().find(p => p.id === publisherId);
		if (!publisher) return '';

		return publisher.getDetailUrl(datasetId, this.currentType());
	}

	openGitHubFile(): void {
		const url = this.getGitHubFileUrl();
		if (url) {
			window.open(url, '_blank', 'noopener');
		}
	}

	openRawJson(): void {
		const url = this.getRawJsonUrl();
		if (url) {
			window.open(url, '_blank', 'noopener');
		}
	}

	openEditTab(): void {
		// Get current dataset from dataset$ observable
		this.dataset$
			.pipe(takeUntil(this.destroy$))
			.subscribe(dataset => {
				if (dataset && dataset['dct:identifier']) {
					// Navigate to modify route with edit mode, dataset ID and product type (#221).
					void this.router.navigate(['/modify'], {
						queryParams: {
							mode: 'edit',
							dataset: dataset['dct:identifier'],
							type: (dataset.productType as string) || DEFAULT_DATA_PRODUCT_TYPE
						}
					});
				}
			})
			.unsubscribe(); // Unsubscribe immediately after getting the value
	}

	// bv:externalCatalogs entries are {dcat:catalog, dct:identifier} objects per the schema, but
	// records written by the pre-#260 form stored bare strings. Used to render both shapes.
	isString(value: unknown): value is string {
		return typeof value === 'string';
	}

	getFormatIcon(format: string): string {
		if (!format) return 'file';

		const formatUpper = format.toUpperCase();

		// Web services
		if (['WMS', 'WFS', 'WMTS'].includes(formatUpper)) {
			return 'file_server';
		}

		// Audio formats
		if (['MP3', 'WAV', 'OGG', 'M4A', 'FLAC', 'AAC'].includes(formatUpper)) {
			return 'file_audio';
		}

		// CSV
		if (formatUpper === 'CSV') {
			return 'file_csv';
		}

		// EPUB
		if (formatUpper === 'EPUB') {
			return 'file_epub';
		}

		// Excel formats
		if (['XLS', 'XLSX', 'XLSM', 'XLSB'].includes(formatUpper)) {
			return 'file_excel';
		}

		// Image formats
		if (['JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'SVG', 'WEBP', 'TIFF', 'TIF'].includes(formatUpper)) {
			return 'file_image';
		}

		// JSON
		if (formatUpper === 'JSON' || formatUpper === 'GEOJSON') {
			return 'file_json';
		}

		// PDF
		if (formatUpper === 'PDF') {
			return 'file_pdf';
		}

		// PowerPoint formats
		if (['PPT', 'PPTX', 'PPS', 'PPSX'].includes(formatUpper)) {
			return 'file_ppt';
		}

		// Video formats
		if (['MP4', 'AVI', 'MOV', 'WMV', 'MKV', 'WEBM', 'FLV', 'MPG', 'MPEG'].includes(formatUpper)) {
			return 'file_video';
		}

		// Word formats
		if (['DOC', 'DOCX', 'ODT', 'RTF'].includes(formatUpper)) {
			return 'file:word';
		}

		// Archive formats
		if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ', 'BZ2', 'XZ'].includes(formatUpper)) {
			return 'file_zip';
		}

		// Default
		return 'file';
	}

	getTooltipHtml(label: string): SafeHtml {
		// Get the translated tooltip text
		const translationKey = `tooltips.${label}`;
		let translatedText = this.translate.instant(translationKey);

		// Replace <a> tags with <span> elements that have data attributes
		// This is needed because Oblique popover seems to block link clicks
		translatedText = translatedText.replace(
			/<a\s+href=["']([^"']+)["']([^>]*)>([^<]*)<\/a>/gi,
			'<span class="popover-link" data-href="$1" style="color: #007bff; text-decoration: underline; cursor: pointer;"$2>$3</span>'
		);

		// Bypass sanitization to allow HTML content from trusted translation files
		return this.sanitizer.bypassSecurityTrustHtml(translatedText);
	}

	hasTooltip(label: string): boolean {
		// Check if a tooltip exists for this label
		const translationKey = `tooltips.${label}`;
		const translatedText = this.translate.instant(translationKey);

		// Return true if the translation exists (not the same as the key)
		return translatedText !== translationKey && translatedText !== '';
	}

	// Read the live module bindings rather than snapshotting them: seedEnumFieldsFromSchema()
	// reassigns these exports once the runtime dataset schema resolves. A snapshot taken at
	// construction (e.g. on a deep link that builds this component before the schema lands) would
	// keep the compiled-in defaults and dispatch enum rows against a stale classification (#221).
	protected get enumTypes(): string[] {
		return enumTypes;
	}

	protected get enumArrayFields(): string[] {
		return enumArrayFields;
	}
}
