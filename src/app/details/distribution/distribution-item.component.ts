import {Component, Injector, Input} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {NgComponentOutlet} from '@angular/common';
import {TextOrTranslatable} from '../../models/types/TextOrTranslatable';
import {TranslateFieldPipe} from '../../translate-field.pipe';

// Default distribution metadata item component
@Component({
	template: '{{ [label, data] | translateField }}',
	styleUrl: '../details.component.scss',
	imports: [TranslateFieldPipe],
	standalone: true
})
export class DefaultDistributionItemComponent {
	data: TextOrTranslatable = '';
	label: string = '';

	constructor(private readonly injector: Injector) {
		this.label = this.injector.get('label', '');
		this.data = this.injector.get('data', '');
	}
}

// Distribution link component for URLs
@Component({
	template: '<a [href]="data" target="_blank" rel="noopener noreferrer" (mouseup)="onMouseUp($event)" style="cursor: pointer;">{{data}}</a>',
	standalone: true
})
export class DistributionLinkComponent {
	data: string = '';

	constructor(private readonly injector: Injector) {
		this.data = this.injector.get('data', '');
	}

	onMouseUp(event: Event) {
		if (this.data && this.data.startsWith('http')) {
			window.open(this.data, '_blank', 'noopener,noreferrer');
		}
	}
}

// Main distribution item component that decides which child component to use
@Component({
	selector: 'distribution-item',
	template: `<div class="data-row">
		<ng-container *ngComponentOutlet="decideComponent(label, data); injector: createInjector(label, data)"></ng-container>
	</div>`,
	styleUrl: '../details.component.scss',
	imports: [NgComponentOutlet],
	standalone: true
})
export class DistributionItemComponent {
	@Input() label: string = '';
	@Input() data = {};

	constructor(
		private readonly injector: Injector,
		protected route: ActivatedRoute,
		private readonly router: Router
	) {}

	decideComponent(label: string, data: any) {
		// Handle URLs
		if (typeof data === 'string' && data.startsWith('http')) {
			return DistributionLinkComponent;
		}

		// Default component for other fields
		return DefaultDistributionItemComponent;
	}

	createInjector(label: string, data: any) {
		return Injector.create({
			providers: [
				{provide: 'label', useValue: label},
				{provide: 'data', useValue: data},
				{provide: Router, useValue: this.router},
				{provide: ActivatedRoute, useValue: this.route}
			],
			parent: this.injector
		});
	}
}
