import { Component, Input } from "@angular/core";
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from "@angular/material/card";
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {Router} from '@angular/router';
import { Observable, startWith } from "rxjs";
import { DatasetSchema } from "../models/schemas/dataset";
import { AsyncPipe, JsonPipe } from "@angular/common";
import { map } from "rxjs/operators";
import { TranslateService } from "@ngx-translate/core";
import { MatButton } from "@angular/material/button";
import { ObButtonDirective } from "@oblique/oblique";

@Component({
	standalone: true,
	selector: 'index-cards',
	templateUrl: './index-cards.component.html',
	styleUrl: './index-cards.component.scss',
	imports: [
		MatCard,
		MatCardHeader,
		MatCardContent,
		MatCardActions,
		MatCardTitle,
		MatCardSubtitle,
		MatLabel,
		MatInput,
		MatFormField,
		AsyncPipe,
		JsonPipe,
		MatButton,
		ObButtonDirective
	]
})
export class IndexCardsComponent {
	@Input() datasets$!: Observable<DatasetSchema[] | null>;
	currentLang$: Observable<string>;

	constructor(
		private readonly router: Router,
		private readonly translate: TranslateService
	) {
		this.currentLang$ = this.translate.onLangChange.pipe(
			map(event => event.lang),
			startWith(this.translate.currentLang) // emit initial value
		);
	}

	async openDataset(publisher: string, dataset: string) {
		await this.router.navigate(['details'], {queryParams: {publisher, dataset}, queryParamsHandling: 'replace'});
	}
}
