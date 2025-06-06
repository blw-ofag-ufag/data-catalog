import {Component, Input, OnInit} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {DatasetSchema, enumTypes} from '../models/schemas/dataset';
import {DatasetService} from '../services/api/api.service';
import {Observable, startWith} from 'rxjs';
import {AsyncPipe} from '@angular/common';
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import {map} from 'rxjs/operators';
import {MatChip} from '@angular/material/chips';
import {OrgPipe} from '../org.pipe';
import {EnumComponent, MetadataItemComponent} from './metadata/metadata-item.component';
import {NormalizedMetadataElement, filterAndNormalizeMetadata} from './details.helpers';
import {
	MatAccordion,
	MatExpansionModule,
	MatExpansionPanel,
	MatExpansionPanelContent,
	MatExpansionPanelDescription,
	MatExpansionPanelHeader
} from '@angular/material/expansion';
import {AdmindirLookupComponent} from '../admindir-lookup/admindir-lookup.component';
import { KeywordsComponent } from "./keywords/keywords.component";

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
		KeywordsComponent
	],
	styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnInit {
	dataset: string = '';
	dataset$: Observable<DatasetSchema | null> = new Observable();
	// lang$: Observable<string> = new Observable();
	currentLang$: Observable<string>;
	metadata$: Observable<NormalizedMetadataElement[]> = new Observable();

	constructor(
		private readonly datasetService: DatasetService,
		private readonly route: ActivatedRoute,
		private readonly translate: TranslateService
	) {
		this.currentLang$ = this.translate.onLangChange.pipe(
			map(event => event.lang),
			startWith(this.translate.currentLang) // emit initial value
		);
	}

	ngOnInit(): void {
		// this.lang$ = new BehaviorSubject(this.route.snapshot.queryParams['lang'] || 'en');
		this.route.queryParams.subscribe(params => {
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

	protected readonly enumTypes = enumTypes;
}
