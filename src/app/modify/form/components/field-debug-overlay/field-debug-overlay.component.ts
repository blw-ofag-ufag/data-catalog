import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslateService} from '@ngx-translate/core';
import {DebugService} from '../../../../services/debug.service';

@Component({
	selector: 'app-field-debug-overlay',
	standalone: true,
	imports: [CommonModule],
	template: `
		@if (debugService.isDebugEnabled$ | async) {
			<pre class="field-debug-overlay">Form Field (en): {{ getEnglishLabel() }}
i18n Label Key: {{ label }}
Schema Field: {{ schemaField }}
Tooltip Key: {{ tooltipKey }}</pre>
		}
	`,
	styleUrl: './field-debug-overlay.component.scss'
})
export class FieldDebugOverlayComponent {
	@Input() label = '';
	@Input() fieldName = '';

	constructor(
		public readonly debugService: DebugService,
		private readonly translate: TranslateService
	) {}

	get schemaField(): string {
		// If fieldName is provided, use it directly
		if (this.fieldName) {
			return this.fieldName;
		}
		// Otherwise, derive from label (e.g., "labels.dct:title" -> "dct:title")
		if (this.label.startsWith('labels.')) {
			return this.label.replace('labels.', '');
		}
		return this.label;
	}

	get tooltipKey(): string {
		return `tooltips.${this.schemaField}`;
	}

	getEnglishLabel(): string {
		if (!this.label) {
			return '';
		}
		// Get the English translation for the label
		// Safely access translations object with optional chaining
		const translations = this.translate.translations?.['en'];
		if (translations) {
			// Navigate the translation object using the label key
			const keys = this.label.split('.');
			let value: any = translations;
			for (const key of keys) {
				value = value?.[key];
			}
			if (typeof value === 'string') {
				return value;
			}
		}
		// Fallback to current language translation
		const translation = this.translate.instant(this.label);
		return translation !== this.label ? translation : this.label;
	}
}
