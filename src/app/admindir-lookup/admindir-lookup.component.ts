import { Component, Input, OnInit } from "@angular/core";
import { TranslatePipe } from "@ngx-translate/core";
import { ObAlertComponent } from "@oblique/oblique";

@Component({
	selector: 'admindir-lookup',
	imports: [TranslatePipe, ObAlertComponent],
	templateUrl: './admindir-lookup.component.html',
	styleUrl: './admindir-lookup.component.scss'
})
export class AdmindirLookupComponent implements OnInit {
	// @Input() person!: {'schema:email': string, 'schema:name': string} | {'prov:agent': string};
	@Input() person!: any;
	adminDirError: boolean = false;

	ngOnInit(): void {
		if (this.person && this.person['prov:agent']) {
			const id = this.person['prov:agent'];
			const url = `https://admindir.verzeichnisse.admin.ch/api/person/${id}`;

			fetch(url)
				.then(response => {
					if (!response.ok) {
						throw new Error('Failed to fetch person details');
					}
					return response.json();
				})
				.then(data => {
					this.person['schema:name'] = `${data.givenName} ${data.surname}`;
					this.person['schema:email'] = data.contactInformation.email;
				})
				.catch(err => {
					console.error('Error fetching person details:', err);
					this.adminDirError = true;
				});
		}
	}
}
