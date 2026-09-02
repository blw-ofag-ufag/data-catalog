import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslateService, TranslateStore} from '@ngx-translate/core';
import {DebugService} from '../../../../services/debug.service';

export interface ValidationMessage {
	text: string;
	source: 'translation' | 'schema' | 'hardcoded';
	key?: string;
}

export interface SchemaValidationInfo {
	schema: 'base' | 'i14y' | 'ods';
	required: boolean;
	messages: ValidationMessage[];
}

export interface FieldValidationDebugInfo {
	bySchema: SchemaValidationInfo[];
	componentMessages?: {text: string; source: 'hardcoded'}[];
}

@Component({
	selector: 'app-field-debug-overlay',
	standalone: true,
	imports: [CommonModule],
	template: `
		@if (debugService.isDebugEnabled$ | async) {
			<pre class="field-debug-overlay">
Form Field (en): {{ getEnglishLabel() }}
i18n Label Key: {{ label }}
Schema Field: {{ schemaField }}
Tooltip Key: {{ tooltipKey }}
Required: {{ getRequiredDisplay() }}
{{ getValidationDisplay() }}</pre>
		}
	`,
	styleUrl: './field-debug-overlay.component.scss'
})
export class FieldDebugOverlayComponent {
	@Input() label = '';
	@Input() fieldName = '';
	@Input() required: boolean | null = null;
	@Input() validationInfo: FieldValidationDebugInfo | null = null;

	constructor(
		public readonly debugService: DebugService,
		private readonly translate: TranslateService,
		// ngx-translate v17 removed the public `translations` map; the loaded per-language set now lives on TranslateStore.
		private readonly translateStore: TranslateStore
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
		const translations = this.translateStore.getTranslations('en') as Record<string, any>;
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

	getRequiredDisplay(): string {
		// If we have schema-based validation info, show which schemas require this field
		if (this.validationInfo?.bySchema?.length) {
			const requiredSchemas = this.validationInfo.bySchema.filter(s => s.required).map(s => s.schema);
			if (requiredSchemas.length > 0) {
				return `Yes (${requiredSchemas.join(', ')})`;
			}
			return 'No';
		}
		// Fall back to component-level required input
		if (this.required === true) {
			return 'Yes [hardcoded]';
		}
		if (this.required === false) {
			return 'No [hardcoded]';
		}
		return '-';
	}

	getValidationDisplay(): string {
		if (!this.validationInfo) {
			return '';
		}

		const lines: string[] = [];

		// Schema-based validation messages
		for (const schemaInfo of this.validationInfo.bySchema) {
			if (schemaInfo.messages.length > 0) {
				for (const msg of schemaInfo.messages) {
					const sourceTag = this.formatSourceTag(msg);
					lines.push(`Validation (${schemaInfo.schema}): ${msg.text} ${sourceTag}`);
				}
			}
		}

		// Component-level hardcoded messages
		if (this.validationInfo.componentMessages?.length) {
			for (const msg of this.validationInfo.componentMessages) {
				lines.push(`Validation (component): ${msg.text} [hardcoded]`);
			}
		}

		return lines.length > 0 ? lines.join('\n') : '';
	}

	private formatSourceTag(msg: ValidationMessage): string {
		if (msg.source === 'translation' && msg.key) {
			return `[translation: ${msg.key}]`;
		}
		if (msg.source === 'schema') {
			return '[schema]';
		}
		return '[hardcoded]';
	}
}
