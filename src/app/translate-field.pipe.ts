import {Pipe, PipeTransform} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {TextOrTranslatable} from './models/types/TextOrTranslatable';
import { Deutsch, English, Francais, Italiano } from "./models/schemas/dataset";

@Pipe({
	name: 'translateField'
})
export class TranslateFieldPipe implements PipeTransform {
	constructor(private readonly translate: TranslateService) {}

	transform([label, data]: [string, TextOrTranslatable], ...args: unknown[]): string {
		if (typeof data === 'string') {
			let trans = this.translate.instant("schema.dataset." + label + "." + data);
			let untrans= "schema.dataset." + label + "." + data;
			return trans === untrans ? (data || "") : trans;
		}
		const lang = this.translate.currentLang;
		// @ts-ignore
		return data?.[lang];
	}
}
