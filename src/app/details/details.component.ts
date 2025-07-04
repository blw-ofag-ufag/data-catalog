import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
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
import { MatAnchor, MatFabButton } from "@angular/material/button";
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
		MatAnchor,
		MatFabButton,
		ObButtonDirective
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

	protected readonly enumTypes = enumTypes;
}
