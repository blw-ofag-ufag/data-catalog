import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ObAlertModule} from '@oblique/oblique';
import {TranslatePipe} from '@ngx-translate/core';
import {MatIconModule} from '@angular/material/icon';

export interface ValidationGroup {
	name: string;
	color: string;
	alertType: 'info' | 'warning' | 'error';
	errors: string[];
	icon?: string;
}

@Component({
	selector: 'validation-alert',
	standalone: true,
	imports: [CommonModule, ObAlertModule, TranslatePipe, MatIconModule],
	template: `
		<ob-alert *ngIf="validationGroup && validationGroup.errors.length > 0" [type]="validationGroup.alertType" [ngClass]="getValidationCssClass()">
			<div class="validation-header">
				<mat-icon *ngIf="validationGroup.icon" class="validation-icon">{{ validationGroup.icon }}</mat-icon>
				<strong>{{ validationGroup.name | translate }}</strong>
				<span class="error-count">({{ validationGroup.errors.length }})</span>
			</div>

			<p class="validation-description">
				{{ getValidationDescription() | translate }}
			</p>

			<ul class="validation-errors">
				<li *ngFor="let error of validationGroup.errors" class="validation-error-item">
					{{ error }}
				</li>
			</ul>
		</ob-alert>
	`,
	styles: [
		`
			.validation-header {
				display: flex;
				align-items: center;
				gap: 0.5rem;
				margin-bottom: 0.5rem;
			}

			.validation-icon {
				font-size: 1.2rem;
				width: 1.2rem;
				height: 1.2rem;
			}

			.error-count {
				color: rgba(0, 0, 0, 0.6);
				font-weight: normal;
				font-size: 0.9rem;
			}

			.validation-description {
				margin: 0.5rem 0;
				font-size: 0.9rem;
				opacity: 0.9;
			}

			.validation-errors {
				margin: 0.5rem 0 0 0;
				padding-left: 1.2rem;
			}

			.validation-error-item {
				margin-bottom: 0.25rem;
				font-size: 0.9rem;
			}

			/* I14Y-specific styling */
			.validation-alert-i14y-requirements {
				border-left: 4px solid #0066cc;
				background-color: #e6f2ff;
			}

			.validation-alert-i14y-requirements .validation-icon {
				color: #0066cc;
			}

			.validation-alert-i14y-requirements .validation-header strong {
				color: #0066cc;
			}

			/* ODS-specific styling */
			.validation-alert-open-data-swiss-requirements {
				border-left: 4px solid #e91e63;
				background-color: #fce4ec;
			}

			.validation-alert-open-data-swiss-requirements .validation-icon {
				color: #e91e63;
			}

			.validation-alert-open-data-swiss-requirements .validation-header strong {
				color: #e91e63;
			}

			/* Base requirements styling */
			.validation-alert-base-requirements .validation-icon {
				color: #ff9800;
			}

			.validation-alert-base-requirements .validation-header strong {
				color: #ff9800;
			}
		`
	]
})
export class ValidationAlertComponent {
	@Input() validationGroup?: ValidationGroup;

	private readonly descriptions: Record<string, string> = {
		'I14Y Requirements': 'validation.i14y.description',
		'Open Data Swiss Requirements': 'validation.ods.description',
		'Base Requirements': 'validation.base.description'
	};

	getValidationDescription(): string {
		if (!this.validationGroup) return '';
		return this.descriptions[this.validationGroup.name] || 'validation.generic.description';
	}

	getValidationCssClass(): string {
		if (!this.validationGroup) return '';
		return `validation-alert-${this.validationGroup.name.toLowerCase().replace(/\s+/g, '-')}`;
	}
}
