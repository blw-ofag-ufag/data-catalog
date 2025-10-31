import {Component, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ObButtonDirective} from '@oblique/oblique';
import {ObAlertModule} from '@oblique/oblique';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {GitHubAuthService} from '../services/auth/github-auth.service';
import {RepositoryCredentialsService} from '../services/auth/repository-credentials.service';
import {MultiDatasetService} from '../services/api/multi-dataset-service.service';
import {I14YThemeService} from '../services/api/i14y-theme.service';
import {PublisherService} from '../services/api/publisher.service';
import {DatasetSubmitComponent} from './submit/dataset-submit.component';
import {MultilingualTextFieldComponent} from './form/components/multilingual-text-field/multilingual-text-field.component';
import {EnumSelectFieldComponent} from './form/components/enum-select-field/enum-select-field.component';
import {ThemeSelectFieldComponent} from './form/components/theme-select-field/theme-select-field.component';
import {KeywordArrayFieldComponent} from './form/components/keyword-array-field/keyword-array-field.component';
import {AffiliatedPersonsFieldComponent} from './form/components/affiliated-persons-field/affiliated-persons-field.component';
import {DistributionFieldComponent} from './form/components/distribution-field/distribution-field.component';
import {
	AccessRights,
	AccrualPeriocicites,
	CategorizationsDSG,
	ClassificationLevels,
	DataTypes,
	DatasetAvailabilities,
	DatasetThemes,
	Publishers,
	Statuses
} from '../models/schemas/dataset';

@Component({
	selector: 'modify',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		RouterModule,
		TranslatePipe,
		ObButtonDirective,
		ObAlertModule,
		MatFormFieldModule,
		MatInputModule,
		MatDatepickerModule,
		MatNativeDateModule,
		MatCheckboxModule,
		DatasetSubmitComponent,
		MultilingualTextFieldComponent,
		EnumSelectFieldComponent,
		ThemeSelectFieldComponent,
		KeywordArrayFieldComponent,
		AffiliatedPersonsFieldComponent,
		DistributionFieldComponent
	],
	templateUrl: './modify.component.html',
	styleUrl: './modify.component.scss'
})
export class ModifyComponent implements OnInit, OnDestroy {
	datasetForm: FormGroup;
	isEditMode = false;
	datasetId: string | null = null;
	isLoading = false;
	showSubmitSection = false;
	invalidFields: string[] = [];

	// Enum options for dropdowns
	readonly publishers = Publishers;
	readonly accessRights = AccessRights;
	readonly statuses = Statuses;
	readonly classificationLevels = ClassificationLevels;
	readonly personalDataCategories = CategorizationsDSG;
	readonly availabilities = DatasetAvailabilities;
	readonly themes = DatasetThemes;
	readonly accrualPeriocicites = AccrualPeriocicites;
	readonly dataTypes = DataTypes;

	private readonly destroy$ = new Subject<void>();

	constructor(
		private readonly fb: FormBuilder,
		private readonly route: ActivatedRoute,
		private readonly router: Router,
		private readonly githubAuthService: GitHubAuthService,
		private readonly repositoryCredentialsService: RepositoryCredentialsService,
		private readonly datasetService: MultiDatasetService,
		private readonly i14yThemeService: I14YThemeService,
		private readonly publisherService: PublisherService,
		private readonly translateService: TranslateService
	) {
		this.datasetForm = this.createForm();
	}

	ngOnInit(): void {
		// Load I14Y themes
		this.i14yThemeService.loadThemes().pipe(takeUntil(this.destroy$)).subscribe();

		// Check if we're in edit mode - check both route params and query params
		this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
			const routeDatasetId = params.get('id');

			// Also check query params for dataset ID
			this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(queryParams => {
				// Priority: route param first, then query param
				this.datasetId = routeDatasetId || queryParams['dataset'];
				this.isEditMode = !!this.datasetId;
				this.initializeForm();
			});
		});

		// Track form changes and update tab state
		this.datasetForm.statusChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
			this.updateTabUnsavedState();
		});
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	private createForm(): FormGroup {
		return this.fb.group({
			'dct:title': [null, Validators.required],
			'dct:description': [null, Validators.required],
			'dct:accessRights': ['', Validators.required],
			'dct:publisher': ['', Validators.required],
			'dcat:contactPoint': this.fb.group({
				'schema:name': ['', Validators.required],
				'schema:email': ['', [Validators.required, Validators.email]]
			}),
			'adms:status': ['', Validators.required],
			'bv:classification': ['', Validators.required],
			'bv:personalData': ['', Validators.required],
			'dcat:keyword': [null],
			'dcat:theme': [''],
			'dcatap:availability': [''],
			'dcat:landingPage': [''],
			// Temporal & Version fields
			'dct:issued': [null],
			'dct:modified': [null],
			'dcat:version': [''],
			'dct:accrualPeriodicity': [''],
			// Data type & archival fields
			'bv:typeOfData': [''],
			'bv:archivalValue': [false],
			// Governance fields
			'prov:qualifiedAttribution': [null],
			// External references
			'bv:externalCatalogs': this.fb.array([]),
			'foaf:page': [null],
			// Coverage & Legal
			'dct:spatial': [''],
			'dct:temporal': this.fb.group({
				'dcat:start_date': [null],
				'dcat:end_date': [null]
			}),
			'dcatap:applicableLegislation': [null],
			// Business Context
			'prov:wasGeneratedBy': [null],
			'bv:retentionPeriod': [null],
			'bv:itSystem': [''],
			// Additional Metadata
			'schema:comment': [''],
			'bv:abrogation': [null],
			'bv:geoIdentifier': [''],
			'schema:image': [''],
			// Relationships
			'prov:wasDerivedFrom': [null],
			'dcat:inSeries': [null],
			'dct:replaces': [null],
			// Distributions
			'dcat:distribution': [null]
		});
	}

	private initializeForm(): void {
		if (this.isEditMode && this.datasetId) {

			// First, ensure data is loaded if needed
			this.datasetService.datasets$.pipe(takeUntil(this.destroy$)).subscribe(datasets => {
				if (datasets && datasets.length > 0) {
					const foundDataset = datasets.find(d => d['dct:identifier'] === this.datasetId);
					if (foundDataset) {
							this.populateForm(foundDataset);
					}
				} else {
					// If no datasets loaded yet, trigger loading
					this.datasetService.loadIndex();
				}
			});

			// Also subscribe to the selected dataset from the service
			this.datasetService.selectedDataset$.pipe(takeUntil(this.destroy$)).subscribe(dataset => {
				if (dataset && dataset['dct:identifier'] === this.datasetId) {
						this.populateForm(dataset);
				}
			});
		}
	}

	private populateForm(dataset: any): void {
		// Populate the form with dataset values
		this.datasetForm.patchValue({
			'dct:title': dataset['dct:title'],
			'dct:description': dataset['dct:description'],
			'dct:accessRights': dataset['dct:accessRights'],
			'dct:publisher': dataset['dct:publisher'],
			'dcat:contactPoint': dataset['dcat:contactPoint'],
			'adms:status': dataset['adms:status'],
			'bv:classification': dataset['bv:classification'],
			'bv:personalData': dataset['bv:personalData'],
			'dcat:keyword': dataset['dcat:keyword'],
			'dcat:theme': dataset['dcat:theme'],
			'dcatap:availability': dataset['dcatap:availability'],
			'dcat:landingPage': dataset['dcat:landingPage'],
			'dct:issued': dataset['dct:issued'],
			'dct:modified': dataset['dct:modified'],
			'dcat:version': dataset['dcat:version'],
			'dct:accrualPeriodicity': dataset['dct:accrualPeriodicity'],
			'bv:typeOfData': dataset['bv:typeOfData'],
			'bv:archivalValue': dataset['bv:archivalValue'],
			'prov:qualifiedAttribution': dataset['prov:qualifiedAttribution'],
			'bv:externalCatalogs': dataset['bv:externalCatalogs'],
			'foaf:page': dataset['foaf:page'],
			'dct:spatial': dataset['dct:spatial'],
			'dct:temporal': dataset['dct:temporal'],
			'dcatap:applicableLegislation': dataset['dcatap:applicableLegislation'],
			'prov:wasGeneratedBy': dataset['prov:wasGeneratedBy'],
			'bv:retentionPeriod': dataset['bv:retentionPeriod'],
			'bv:itSystem': dataset['bv:itSystem'],
			'schema:comment': dataset['schema:comment'],
			'bv:abrogation': dataset['bv:abrogation'],
			'bv:geoIdentifier': dataset['bv:geoIdentifier'],
			'schema:image': dataset['schema:image'],
			'prov:wasDerivedFrom': dataset['prov:wasDerivedFrom'],
			'dcat:inSeries': dataset['dcat:inSeries'],
			'dct:replaces': dataset['dct:replaces'],
			'dcat:distribution': dataset['dcat:distribution']
		});
	}

	onCancel(): void {
		// Check if form has been modified
		if (this.datasetForm.dirty) {
			const message = this.translateService.instant('modify.auth.form.confirmation.unsavedChanges');
			if (confirm(message)) {
				this.closeCurrentTab();
			}
		} else {
			this.closeCurrentTab();
		}
	}

	private closeCurrentTab(): void {
		// Navigate back to the index page
		this.router.navigate(['/']);
	}

	private updateTabUnsavedState(): void {
		// Tab functionality removed - this method is now a no-op
		// Originally tracked unsaved changes in tab state
	}

	onSubmit(): void {

		if (this.datasetForm.valid) {
			this.isLoading = true;
			// Simulate processing time
			setTimeout(() => {
				this.isLoading = false;
				this.showSubmitSection = true;
			}, 1000);
		} else {
			this.markFormGroupTouched(this.datasetForm);
			this.collectInvalidFields();

			// Scroll to first error
			this.scrollToFirstError();
		}
	}

	onFormReset(): void {
		this.showSubmitSection = false;
		this.datasetForm.reset();
		// Reset external catalogs FormArray
		const externalCatalogsArray = this.datasetForm.get('bv:externalCatalogs') as FormArray;
		externalCatalogsArray.clear();
	}

	private markFormGroupTouched(formGroup: FormGroup): void {
		Object.keys(formGroup.controls).forEach(key => {
			const control = formGroup.get(key);
			control?.markAsTouched();
			if (control instanceof FormGroup) {
				this.markFormGroupTouched(control);
			}
		});
	}

	get externalCatalogsArray(): FormArray {
		return this.datasetForm.get('bv:externalCatalogs') as FormArray;
	}

	onExternalCatalogChange(catalogValue: string, isChecked: boolean): void {
		const formArray = this.externalCatalogsArray;

		if (isChecked) {
			// Add the catalog to the array if it's not already there
			if (!formArray.value.includes(catalogValue)) {
				formArray.push(new FormControl(catalogValue));
			}
		} else {
			// Remove the catalog from the array
			const index = formArray.value.indexOf(catalogValue);
			if (index >= 0) {
				formArray.removeAt(index);
			}
		}
	}

	isExternalCatalogSelected(catalogValue: string): boolean {
		return this.externalCatalogsArray.value.includes(catalogValue);
	}

	private collectInvalidFields(): void {
		this.invalidFields = [];
		const labelMap: {[key: string]: string} = {
			'dct:title': this.translateService.instant('labels.dct:title'),
			'dct:description': this.translateService.instant('labels.dct:description'),
			'dct:accessRights': this.translateService.instant('labels.dct:accessRights'),
			'dct:publisher': this.translateService.instant('labels.dct:publisher'),
			'dcat:contactPoint.schema:name': this.translateService.instant('modify.auth.form.contactName'),
			'dcat:contactPoint.schema:email': this.translateService.instant('modify.auth.form.contactEmail'),
			'adms:status': this.translateService.instant('labels.adms:status'),
			'bv:classification': this.translateService.instant('labels.bv:classification'),
			'bv:personalData': this.translateService.instant('labels.bv:personalData')
		};

		Object.keys(this.datasetForm.controls).forEach(key => {
			const control = this.datasetForm.get(key);
			if (control?.invalid) {
				if (control instanceof FormGroup) {
					// Handle nested form groups (like contactPoint)
					Object.keys(control.controls).forEach(nestedKey => {
						const nestedControl = control.get(nestedKey);
						if (nestedControl?.invalid) {
							const fullKey = `${key}.${nestedKey}`;
							this.invalidFields.push(labelMap[fullKey] || fullKey);
						}
					});
				} else {
					this.invalidFields.push(labelMap[key] || key);
				}
			}
		});
	}

	private scrollToFirstError(): void {
		setTimeout(() => {
			const firstErrorElement = document.querySelector('.ng-invalid:not(form):not(fieldset)');
			if (firstErrorElement) {
				firstErrorElement.scrollIntoView({behavior: 'smooth', block: 'center'});
			}
		}, 100);
	}

	getSelectedRepositoryDisplay(): string {
		const selectedRepo = this.repositoryCredentialsService.getSelectedRepository();
		if (selectedRepo) {
			const publisher = this.publisherService.getPublishers().find(p => p.githubRepo === selectedRepo);
			return publisher ? `${publisher.shortId} (${selectedRepo})` : selectedRepo;
		}
		return 'blw-ofag-ufag/metadata'; // Default fallback
	}
}
