import {Component, Input, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {DatasetSchema} from '../models/schemas/dataset';
import {DatasetService} from '../services/api/api.service';
import {BehaviorSubject, Observable, startWith} from 'rxjs';
import {AsyncPipe, DatePipe, JsonPipe} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {map} from 'rxjs/operators';
import {MatChip} from '@angular/material/chips';
import {OrgPipe} from '../org.pipe';
import {StatusPipe} from '../status.pipe';
import {MetadataItemComponent} from './metadata/metadata-item.component';
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
		TranslatePipe,
		JsonPipe,
		AdmindirLookupComponent
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
}
