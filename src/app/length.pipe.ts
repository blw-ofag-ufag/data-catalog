import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
	name: 'length'
})
export class LengthPipe implements PipeTransform {
	constructor() {}

	transform(value: any, ..._args: unknown[]): number {
		return value.length;
	}
}
