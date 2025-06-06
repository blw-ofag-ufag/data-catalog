import {Component, Input, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import { AsyncPipe, JsonPipe } from "@angular/common";
import {IndexCardsComponent} from '../index-cards/index-cards.component';
import {IndexListComponent} from '../index-list/index-list.component';
import {MatIcon} from '@angular/material/icon';
import {MatAnchor, MatButton, MatIconButton} from '@angular/material/button';
import {ObButtonDirective} from '@oblique/oblique';
import {MatTooltip} from '@angular/material/tooltip';
import {IndexFilterColComponent} from '../index-filter-col/index-filter-col.component';
import {IndexOutletComponent} from '../index-outlet/index-outlet.component';
import {MatFormField, MatInput, MatLabel, MatPrefix} from '@angular/material/input';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';
import { BehaviorSubject, Observable } from "rxjs";
import { DatasetSchema, enumTypes } from "../models/schemas/dataset";
import { DatasetService } from "../services/api/api.service";
import { LengthPipe } from "../length.pipe";
import { MatBadge } from "@angular/material/badge";
import { ActiveFilters } from "../models/ActiveFilters";

@Component({
	selector: 'index-switch',
	standalone: true,
	templateUrl: './index-switch.component.html',
	imports: [
		MatIcon,
		MatIconButton,
		ObButtonDirective,
		MatTooltip,
		MatTooltip,
		MatButton,
		IndexFilterColComponent,
		IndexOutletComponent,
		MatAnchor,
		MatFormField,
		MatOption,
		MatSelect,
		MatInput,
		MatLabel,
		MatPrefix,
		AsyncPipe,
		MatBadge,
	],
	styleUrl: './index-switch.component.scss'
})
export class IndexSwitchComponent implements OnInit {
	view: 'table' | 'tile' = 'tile';
	showFilters = false;
	@Input() datasets$: Observable<DatasetSchema[] | null> = new Observable();
	activatedFilters$: BehaviorSubject<ActiveFilters> = new BehaviorSubject({});

	constructor(
		private readonly route: ActivatedRoute,
		private readonly router: Router,
		private readonly datasetService: DatasetService
	) {}

	ngOnInit() {
		this.route.queryParams.subscribe(params => {
			this.view = params['view'] || 'tile';
			for (const allowedfilter of enumTypes) {
				if (params[allowedfilter]) {
					this.showFilters = true;
				}
			}
		});
	}

	async switchTo(mode: 'table' | 'tile') {
		await this.router.navigate([], {queryParams: {view: mode}, queryParamsHandling: 'merge'});
	}

	toggleShowFilters() {
		this.showFilters = !this.showFilters;
	}

	search(event: Event) {
		// alert("shuffling");
		this.datasetService.search((event?.target as HTMLInputElement)?.value);
	}

	setSorting(criterion: 'title' | 'old' | 'new' | 'owner' | 'relevance') {
		this.datasetService.setSort(criterion);
	}

	getFilterCount(filters: ActiveFilters | null): number | null {
		if (!filters || Object.keys(filters).length === 0) {
			return null;
		}
		return Object.keys(filters).length;
	}
}
