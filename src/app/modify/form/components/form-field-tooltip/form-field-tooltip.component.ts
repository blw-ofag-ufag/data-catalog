import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {MatIconModule} from '@angular/material/icon';
import {ObPopoverModule} from '@oblique/oblique';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {PopoverLinksDirective} from '../../../../directives/popover-links.directive';

@Component({
	selector: 'app-form-field-tooltip',
	standalone: true,
	imports: [CommonModule, TranslateModule, MatIconModule, ObPopoverModule, PopoverLinksDirective],
	template: `
		@if (hasTooltip()) {
			<button
				type="button"
				class="ob-button-icon tooltip-button"
				[obPopover]="popoverTemplate"
				placement="top"
				[appendToBody]="true"
				[attr.aria-label]="'Help for ' + fieldName"
			>
				<mat-icon svgIcon="info_circle"></mat-icon>
			</button>
			<ng-template #popoverTemplate>
				<div [innerHTML]="getTooltipHtml()" appPopoverLinks class="tooltip-content"></div>
			</ng-template>
		}
	`,
	styles: [
		`
			.tooltip-button {
				padding: 0;
				background: none;
				border: none;
				cursor: pointer;
				display: inline-flex;
				align-items: center;
				margin-left: 4px;
			}

			.tooltip-button mat-icon {
				width: 18px;
				height: 18px;
				font-size: 18px;
			}

			:host ::ng-deep .tooltip-content {
				max-width: 400px;
			}
		`
	]
})
export class FormFieldTooltipComponent {
	@Input() fieldName!: string;

	constructor(
		private readonly translate: TranslateService,
		private readonly sanitizer: DomSanitizer
	) {}

	hasTooltip(): boolean {
		if (!this.fieldName) {
			return false;
		}
		const translationKey = `tooltips.${this.fieldName}`;
		const translatedText = this.translate.instant(translationKey);
		return translatedText !== translationKey && translatedText !== '';
	}

	getTooltipHtml(): SafeHtml {
		const translationKey = `tooltips.${this.fieldName}`;
		let translatedText = this.translate.instant(translationKey);

		// Replace <a> tags with <span> elements that have data attributes
		// This is needed because Oblique popover seems to block link clicks
		translatedText = translatedText.replace(
			/<a\s+href=["']([^"']+)["']([^>]*)>([^<]*)<\/a>/gi,
			'<span class="popover-link" data-href="$1" style="color: #007bff; text-decoration: underline; cursor: pointer;"$2>$3</span>'
		);

		// Bypass sanitization to allow HTML content from trusted translation files
		return this.sanitizer.bypassSecurityTrustHtml(translatedText);
	}
}