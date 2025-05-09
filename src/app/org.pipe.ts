import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
	name: 'org'
})
export class OrgPipe implements PipeTransform {
	transform(value: string, ...args: unknown[]): string {
		const mapping = new Map<string, string>();
		mapping.set('BLW-OFAG-UFAG-FOAG', 'BLW');
		mapping.set('BLV-OSAV-USAV-FSVO', 'BLV');
		return mapping.get(value) || value;
	}
}
