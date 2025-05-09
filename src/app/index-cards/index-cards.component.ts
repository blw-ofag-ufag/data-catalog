import {Component} from '@angular/core';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {Router} from '@angular/router';

@Component({
	standalone: true,
	selector: 'index-cards',
	templateUrl: './index-cards.component.html',
	styleUrl: './index-cards.component.scss',
	imports: [MatCard, MatCardHeader, MatCardContent, MatCardActions, MatCardTitle, MatLabel, MatInput, MatFormField]
})
export class IndexCardsComponent {
	constructor(private readonly router: Router) {}

	async openDataset(dataset: string) {
		await this.router.navigate(['details'], {queryParams: {dataset}, queryParamsHandling: 'replace'});
	}
}
