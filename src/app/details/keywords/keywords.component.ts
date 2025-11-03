import {Component, Input} from '@angular/core';
import {MatChip} from '@angular/material/chips';
import {ActivatedRoute, RouterLink} from '@angular/router';

@Component({
	selector: 'keywords',
	imports: [MatChip, RouterLink],
	templateUrl: './keywords.component.html',
	styleUrl: './keywords.component.scss'
})
export class KeywordsComponent {
	@Input() keywords: string[] = [];

	constructor(private readonly route: ActivatedRoute) {}

	onChipClick(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
	}

	keywordFiltered(keyword: string) {
		// For details page, we want to start fresh with just this keyword
		// as the user is navigating from detail view back to index
		return {
			'dcat:keyword': keyword
		};
	}
}
