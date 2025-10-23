import {Pipe, PipeTransform} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {TextOrTranslatable} from './models/types/TextOrTranslatable';

@Pipe({
	name: 'translateField',
	pure: false
})
export class TranslateFieldPipe implements PipeTransform {
	constructor(private readonly translate: TranslateService) {}

	transform([label, data]: [string, TextOrTranslatable | undefined], ...args: unknown[]): string {
		if (typeof data === 'string') {
			const trans = this.translate.instant(`choices.dataset.${label}.${data}`);
			const untrans = `choices.dataset.${label}.${data}`;
			return trans === untrans ? data || '' : trans;
		}

		if (typeof data === 'object' && data !== null && data !== undefined) {
			const lang = this.translate.currentLang;
			const dataObj = data as any;

			// Try current language first, then fallback chain
			return dataObj[lang] || dataObj['en'] || dataObj['de'] || dataObj['fr'] || dataObj['it'] || '';
		}

		return '';
	}
}
