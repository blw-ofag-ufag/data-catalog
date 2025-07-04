import {Component, Input} from '@angular/core';
import {MatChip} from '@angular/material/chips';
import {RouterLink} from '@angular/router';

@Component({
	selector: 'keywords',
	imports: [MatChip, RouterLink],
	templateUrl: './keywords.component.html',
	styleUrl: './keywords.component.scss'
})
export class KeywordsComponent {
	@Input() keywords: string[] = [];

	onChipClick(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
	}

	keywordFiltered(keyword: string) {
		return {
			'dcat:keyword': keyword
		};
	}
}
