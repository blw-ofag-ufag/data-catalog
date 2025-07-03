import {Component, Input} from '@angular/core';
import {DistributionItemComponent} from './distribution-item.component';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
	selector: 'distribution',
	template: `
		<table class="ob-table ob-table-plain">
			<tbody>
				@for (field of getDistributionFields(); track field.label) {
					@if (field.data !== null && field.data !== undefined && field.data !== '') {
						<tr>
							<td>{{ "labels." + field.label | translate }}</td>
							<td>
								<distribution-item [label]="field.label" [data]="field.data"></distribution-item>
							</td>
						</tr>
					}
				}
			</tbody>
		</table>
	`,
	styleUrl: '../details.component.scss',
	imports: [DistributionItemComponent, TranslatePipe],
	standalone: true
})
export class DistributionComponent {
	@Input() distribution: any = {};

	getDistributionFields() {
		if (!this.distribution) return [];

		const fields = [
			{ label: 'dct:identifier', data: this.distribution['dct:identifier'] },
			{ label: 'dct:title', data: this.distribution['dct:title'] },
			{ label: 'dct:description', data: this.distribution['dct:description'] },
			{ label: 'dcat:accessURL', data: this.distribution['dcat:accessURL'] },
			{ label: 'dcat:downloadURL', data: this.distribution['dcat:downloadURL'] },
			{ label: 'adms:status', data: this.distribution['adms:status'] },
			{ label: 'dcatap:availability', data: this.distribution['dcatap:availability'] },
			{ label: 'dct:format', data: this.distribution['dct:format'] },
			{ label: 'dct:modified', data: this.distribution['dct:modified'] },
			{ label: 'dct:conformsTo', data: this.distribution['dct:conformsTo'] },
			{ label: 'dct:license', data: this.distribution['dct:license'] },
			{ label: 'schema:comment', data: this.distribution['schema:comment'] },
			{ label: 'dcat:accessService', data: this.distribution['dcat:accessService'] }
		];

		return fields.filter(field => 
			field.data !== null && 
			field.data !== undefined && 
			field.data !== '' &&
			!(typeof field.data === 'object' && Object.keys(field.data).length === 0)
		);
	}
}