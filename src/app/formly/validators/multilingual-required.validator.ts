import {AbstractControl} from '@angular/forms';
import {FormlyFieldConfig} from '@ngx-formly/core';

export interface MultilingualText {
	de: string;
	fr: string;
	it?: string;
	en?: string;
}

export function multilingualRequiredValidator(control: AbstractControl, field: FormlyFieldConfig): any {
	const value = control.value as MultilingualText;
	const requiredLanguages = field.props?.['requiredLanguages'] || [];

	if (!value || requiredLanguages.length === 0) {
		return null;
	}

	const missingLanguages: string[] = [];

	requiredLanguages.forEach((lang: string) => {
		const langValue = value[lang as keyof MultilingualText];
		if (!langValue || langValue.trim() === '') {
			missingLanguages.push(lang);
		}

		// Check pattern if specified
		if (field.props?.['pattern'] && langValue && langValue.trim() !== '') {
			const pattern = new RegExp(field.props['pattern']);
			if (!pattern.test(langValue)) {
				// Pattern validation is handled separately
				return;
			}
		}
	});

	if (missingLanguages.length > 0) {
		return {
			multilingualRequired: {
				missingLanguages,
				requiredPattern: field.props?.['pattern']
			}
		};
	}

	return null;
}