import {Pipe, PipeTransform} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';

@Pipe({
	name: 'status'
})
export class StatusPipe implements PipeTransform {
	constructor(private readonly translate: TranslateService) {}

	transform(value: string, ...args: unknown[]): string {
		return this.translate.instant(`schema.dataset.status.${value}`);
	}
}
