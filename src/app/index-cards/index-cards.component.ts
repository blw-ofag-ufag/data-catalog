import {Component, Input} from '@angular/core';
import {MatCard, MatCardContent, MatCardHeader, MatCardImage, MatCardSubtitle, MatCardTitle} from '@angular/material/card';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Observable, startWith} from 'rxjs';
import {DatasetSchema} from '../models/schemas/dataset';
import {AsyncPipe, DatePipe, NgOptimizedImage} from '@angular/common';
import {map} from 'rxjs/operators';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MatChip} from '@angular/material/chips';
import {OrgPipe} from '../org.pipe';
import {TranslateFieldPipe} from '../translate-field.pipe';

@Component({
	standalone: true,
	selector: 'index-cards',
	templateUrl: './index-cards.component.html',
	styleUrl: './index-cards.component.scss',
	imports: [
		MatCard,
		MatCardHeader,
		MatCardContent,
		MatCardTitle,
		MatCardSubtitle,
		AsyncPipe,
		MatCardImage,
		NgOptimizedImage,
		DatePipe,
		MatChip,
		OrgPipe,
		RouterLink,
		TranslatePipe,
		TranslateFieldPipe
	]
})
export class IndexCardsComponent {
	@Input() datasets$!: Observable<DatasetSchema[] | null>;
	currentLang$: Observable<string>;
	fallbackImageUrl = 'https://fal.media/files/koala/fu3fHRalAzcHsxBFze10d_dc302f8699ab49ffadb957300e226b94.jpg';

	constructor(
		private readonly router: Router,
		private readonly translate: TranslateService,
		private readonly route: ActivatedRoute
	) {
		this.currentLang$ = this.translate.onLangChange.pipe(
			map(event => event.lang),
			startWith(this.translate.currentLang) // emit initial value
		);
	}

	async openDataset(publisher: string, dataset: string) {
		await this.router.navigate(['details'], {queryParams: {publisher, dataset}, queryParamsHandling: 'replace'});
	}

	keywordFiltered(keyword: string) {
		const currentParams = this.route.snapshot.queryParams;
		const existingKeywords = currentParams['dcat:keyword'];

		// If there are existing keywords, merge them
		let keywordValue = keyword;
		if (existingKeywords && !existingKeywords.split(',').includes(keyword)) {
			keywordValue = existingKeywords + ',' + keyword;
		}

		return {
			...currentParams,
			'dcat:keyword': keywordValue
		};
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

	onChipClick(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
	}
}
