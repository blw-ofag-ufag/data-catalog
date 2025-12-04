import {NgModule, Inject} from '@angular/core';
import {ConfigOption, FormlyModule} from '@ngx-formly/core';
import {FormlyMaterialModule} from '@ngx-formly/material';
import {TranslateService} from '@ngx-translate/core';
import {MultilingualFieldType} from './field-types/multilingual-field.type';
import {EnumSelectFieldType} from './field-types/enum-select-field.type';
import {ThemeSelectFieldType} from './field-types/theme-select-field.type';
import {KeywordArrayFieldType} from './field-types/keyword-array-field.type';
import {AffiliatedPersonsFieldType} from './field-types/affiliated-persons-field.type';
import {DistributionFieldType} from './field-types/distribution-field.type';
import {DateFieldType} from './field-types/date-field.type';
import {TextFieldType} from './field-types/text-field.type';
import {multilingualRequiredValidator} from './validators/multilingual-required.validator';
import {minDateValidator} from './validators/min-date.validator';
import {maxDateValidator} from './validators/max-date.validator';

export function formlyConfigFactory(translateService: TranslateService): ConfigOption {
	return {
		types: [
			{name: 'multilingual', component: MultilingualFieldType},
			{name: 'enum-select', component: EnumSelectFieldType},
			{name: 'theme-select', component: ThemeSelectFieldType},
			{name: 'keyword-array', component: KeywordArrayFieldType},
			{name: 'affiliated-persons', component: AffiliatedPersonsFieldType},
			{name: 'distribution', component: DistributionFieldType},
			{name: 'date', component: DateFieldType},
			{name: 'text', component: TextFieldType}
		],
		validators: [
			{name: 'multilingual-required', validation: multilingualRequiredValidator},
			{name: 'min-date', validation: minDateValidator},
			{name: 'max-date', validation: maxDateValidator}
		],
		validationMessages: [
			{
				name: 'required',
				message: () => translateService.instant('modify.auth.form.validation.required')
			},
			{
				name: 'pattern',
				message: (error: any, field: any) => {
					// Special handling for title field pattern
					if (field?.key === 'dct:title') {
						return translateService.instant('modify.auth.form.validation.titlePattern');
					}
					return translateService.instant('modify.auth.form.validation.pattern');
				}
			},
			{
				name: 'minlength',
				message: (error: any, field: any) => {
					const minLength = field?.props?.minLength || error?.requiredLength;
					return translateService.instant('modify.auth.form.validation.minLength', {minLength});
				}
			},
			{
				name: 'maxlength',
				message: () => translateService.instant('modify.auth.form.validation.maxLength')
			},
			{
				name: 'multilingualRequired',
				message: (error: any) => {
					const langs = error?.missingLanguages?.map((l: string) => l.toUpperCase()).join(', ');
					return translateService.instant('modify.auth.form.help.multilingualRequired', {languages: langs});
				}
			}
		]
	};
}

@NgModule({
	imports: [
		FormlyMaterialModule,
		FormlyModule.forRoot({
			types: [
				{name: 'multilingual', component: MultilingualFieldType},
				{name: 'enum-select', component: EnumSelectFieldType},
				{name: 'theme-select', component: ThemeSelectFieldType},
				{name: 'keyword-array', component: KeywordArrayFieldType},
				{name: 'affiliated-persons', component: AffiliatedPersonsFieldType},
				{name: 'distribution', component: DistributionFieldType},
				{name: 'date', component: DateFieldType},
				{name: 'text', component: TextFieldType}
			],
			validators: [
				{name: 'multilingual-required', validation: multilingualRequiredValidator},
				{name: 'min-date', validation: minDateValidator},
				{name: 'max-date', validation: maxDateValidator}
			]
		})
	],
	exports: [FormlyModule, FormlyMaterialModule]
})
export class FormlyConfigModule {
	constructor(@Inject(TranslateService) private translateService: TranslateService) {
		// Configure validation messages with translations
		const config = formlyConfigFactory(translateService);
		// Note: Validation messages need to be set dynamically after module initialization
		// This is a limitation of Angular's module system
	}
}