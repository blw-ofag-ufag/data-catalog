import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {DatasetSchema, enumTypes} from '../models/schemas/dataset';
import {DatasetService} from '../services/api/api.service';
import {Observable, Subject, startWith} from 'rxjs';
import {AsyncPipe} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {map, takeUntil} from 'rxjs/operators';
import {MatChip} from '@angular/material/chips';
import {OrgPipe} from '../org.pipe';
import {TranslateFieldPipe} from '../translate-field.pipe';
import {EnumComponent, MetadataItemComponent} from './metadata/metadata-item.component';
import {NormalizedMetadataElement, filterAndNormalizeMetadata} from './details.helpers';
import {MatAccordion, MatExpansionModule, MatExpansionPanel, MatExpansionPanelDescription, MatExpansionPanelHeader} from '@angular/material/expansion';
import {AdmindirLookupComponent} from '../admindir-lookup/admindir-lookup.component';
import {KeywordsComponent} from './keywords/keywords.component';
import {DistributionComponent} from './distribution/distribution.component';
import {NotFoundComponent} from '../not-found/not-found.component';
import { MatIcon } from "@angular/material/icon";
import { MatButton } from "@angular/material/button";
import { ObButtonDirective } from "@oblique/oblique";
import {PublisherService} from '../services/api/publisher.service';

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
		MatButton
	],
	styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnInit, OnDestroy {
	dataset: string = '';
	dataset$: Observable<DatasetSchema | null> = new Observable();
	loading$: Observable<boolean>;
	// lang$: Observable<string> = new Observable();
	currentLang$: Observable<string>;
	metadata$: Observable<NormalizedMetadataElement[]> = new Observable();
	private readonly destroy$ = new Subject<void>();

	constructor(
		private readonly datasetService: DatasetService,
		private readonly route: ActivatedRoute,
		private readonly router: Router,
		private readonly translate: TranslateService,
		private readonly publisherService: PublisherService
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
			this.dataset$ = this.datasetService.getDatasetById(this.dataset);

			this.metadata$ = this.dataset$.pipe(
				map(dataset => {
					if (!dataset) {
						return [];
					}
					return filterAndNormalizeMetadata(dataset);
				})
			);
		});
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}

	datasetFiltered() {
		return {
			class: 'dataset'
		};
	}

	publisherFiltered(publisher: string) {
		return {
			'dct:publisher': publisher
		};
	}

	getGitHubFileUrl(): string {
		const params = this.route.snapshot.queryParams;
		const publisherId = params['publisher'];
		const datasetId = params['dataset'];
		if (!publisherId || !datasetId) return '';

		const publisher = this.publisherService.getPublishers().find(p => p.id === publisherId);
		if (!publisher) return '';

		return `https://github.com/${publisher.githubRepo}/blob/${publisher.branch}/data/raw/datasets/${datasetId}.json`;
	}

	getRawJsonUrl(): string {
		const params = this.route.snapshot.queryParams;
		const publisherId = params['publisher'];
		const datasetId = params['dataset'];
		if (!publisherId || !datasetId) return '';

		const publisher = this.publisherService.getPublishers().find(p => p.id === publisherId);
		if (!publisher) return '';

		return publisher.getDetailUrl(datasetId);
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
		this.dataset$.pipe(takeUntil(this.destroy$)).subscribe(dataset => {
			if (dataset && dataset['dct:identifier']) {
				// Navigate to modify route with edit mode and dataset ID
				this.router.navigate(['/modify'], {
					queryParams: {
						mode: 'edit',
						dataset: dataset['dct:identifier']
					}
				});
			}
		}).unsubscribe(); // Unsubscribe immediately after getting the value
	}

	getFormatIcon(format: string): string {
		if (!format) return 'file';
		
		const formatUpper = format.toUpperCase();
		
		// Web services
		if (['WMS', 'WFS', 'WMTS'].includes(formatUpper)) {
			return 'file-server';
		}
		
		// Audio formats
		if (['MP3', 'WAV', 'OGG', 'M4A', 'FLAC', 'AAC'].includes(formatUpper)) {
			return 'file-audio';
		}
		
		// CSV
		if (formatUpper === 'CSV') {
			return 'file-csv';
		}
		
		// EPUB
		if (formatUpper === 'EPUB') {
			return 'file-epub';
		}
		
		// Excel formats
		if (['XLS', 'XLSX', 'XLSM', 'XLSB'].includes(formatUpper)) {
			return 'file-excel';
		}
		
		// Image formats
		if (['JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'SVG', 'WEBP', 'TIFF', 'TIF'].includes(formatUpper)) {
			return 'file-image';
		}
		
		// JSON
		if (formatUpper === 'JSON' || formatUpper === 'GEOJSON') {
			return 'file-json';
		}
		
		// PDF
		if (formatUpper === 'PDF') {
			return 'file-pdf';
		}
		
		// PowerPoint formats
		if (['PPT', 'PPTX', 'PPS', 'PPSX'].includes(formatUpper)) {
			return 'file-ppt';
		}
		
		// Video formats
		if (['MP4', 'AVI', 'MOV', 'WMV', 'MKV', 'WEBM', 'FLV', 'MPG', 'MPEG'].includes(formatUpper)) {
			return 'file-video';
		}
		
		// Word formats
		if (['DOC', 'DOCX', 'ODT', 'RTF'].includes(formatUpper)) {
			return 'file-word';
		}
		
		// Archive formats
		if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ', 'BZ2', 'XZ'].includes(formatUpper)) {
			return 'file-zip';
		}
		
		// Default
		return 'file';
	}

	protected readonly enumTypes = enumTypes;
}
