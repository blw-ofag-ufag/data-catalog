import {Pipe, PipeTransform} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';

@Pipe({
	name: 'org'
})
export class OrgPipe implements PipeTransform {
	constructor(private readonly translate: TranslateService) {}
	transform(value: string, ...args: unknown[]): string {
		// const mapping = new Map<string, string>();
		// mapping.set('BLW-OFAG-UFAG-FOAG', 'BLW');
		// mapping.set('BLV-OSAV-USAV-FSVO', 'BLV');
		// return mapping.get(value) || value;
		return this.translate.instant(`choices.dataset.dct:publisher.${value}`);
	}
}
