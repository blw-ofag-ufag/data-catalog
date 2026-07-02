import {Component, Injector, OnDestroy} from '@angular/core';
import {MatChip} from '@angular/material/chips';
import {RouterLink} from '@angular/router';
import {Subject, takeUntil} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import {DimensionService} from '../../services/api/dimension.service';

/**
 * Renders a distribution's `bv:dimensions` (issue #92) as localized chips on the detail page,
 * each linking to the catalogue filtered by that dimension. Mirrors the keyword detail chips.
 * Instantiated via `ngComponentOutlet` from {@link DistributionItemComponent}, so `data` (the
 * dimension codes) is read from the injector.
 */
@Component({
	selector: 'distribution-dimensions',
	template: `
		<div class="chip-container">
			@for (code of codes; track code) {
				<mat-chip class="small-chip" style="display: inline-block; margin-right: 8px">
					<a [routerLink]="['/index']" [queryParams]="{'bv:dimensions': code}">
						{{ label(code) }}
					</a>
				</mat-chip>
			}
		</div>
	`,
	styleUrl: './distribution-dimensions.component.scss',
	imports: [MatChip, RouterLink],
	standalone: true
})
export class DistributionDimensionsComponent implements OnDestroy {
	codes: string[] = [];
	private lang = 'de';
	private readonly destroy$ = new Subject<void>();

	constructor(
		injector: Injector,
		private readonly dimensionService: DimensionService,
		private readonly translate: TranslateService
	) {
		const data = injector.get<string[] | string>('data', []);
		this.codes = Array.isArray(data) ? data : data ? [data] : [];
		this.lang = this.translate.currentLang || 'de';

		// Load the glossary and re-render labels once it (or the language) changes.
		this.dimensionService.loadDimensions().pipe(takeUntil(this.destroy$)).subscribe();
		this.dimensionService.dimensions$.pipe(takeUntil(this.destroy$)).subscribe();
		this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
			this.lang = this.translate.currentLang || 'de';
		});
	}

	label(code: string): string {
		return this.dimensionService.getDimensionLabel(code, this.lang);
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
