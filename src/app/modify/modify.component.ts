import {Component, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {Observable, Subject, takeUntil} from 'rxjs';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ObAlertModule, ObButtonDirective, ObNotificationService, ObNotificationModule} from '@oblique/oblique';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatStepperModule} from '@angular/material/stepper';
import {MatButtonModule} from '@angular/material/button';
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
import {DatasetMetadataService} from '../services/metadata/dataset-metadata.service';

@Component({
	selector: 'modify',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		RouterModule,
		TranslatePipe,
		ObAlertModule,
		ObButtonDirective,
		ObNotificationModule,
		MatFormFieldModule,
		MatInputModule,
		MatDatepickerModule,
		MatNativeDateModule,
		MatCheckboxModule,
		MatStepperModule,
		MatButtonModule,
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
	isLinear = false;

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
		private readonly translateService: TranslateService,
		private readonly notificationService: ObNotificationService,
		private readonly metadataService: DatasetMetadataService
	) {
		this.datasetForm = this.createForm();
	}

	ngOnInit(): void {
		// Load I14Y themes
		this.i14yThemeService.loadThemes().pipe(takeUntil(this.destroy$)).subscribe();

		// Initialize form with metadata
		this.metadataService.getMetadata().pipe(takeUntil(this.destroy$)).subscribe(metadata => {
			if (metadata && this.datasetForm) {
				this.buildFormFromMetadata(this.datasetForm, metadata);
			}
		});

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
		const formGroup = this.fb.group({});

		// Subscribe to metadata to build form dynamically
		this.metadataService.getMetadata().pipe(takeUntil(this.destroy$)).subscribe(metadata => {
			if (metadata) {
				this.buildFormFromMetadata(formGroup, metadata);
			}
		});

		// Fallback form creation if metadata is not available immediately
		return this.createFallbackForm();
	}

	private createFallbackForm(): FormGroup {
		// Create a basic form structure that will be replaced when metadata loads
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

	private buildFormFromMetadata(formGroup: FormGroup, metadata: any): void {
		// Clear existing controls
		Object.keys(formGroup.controls).forEach(key => {
			formGroup.removeControl(key);
		});

		// Build controls from metadata
		metadata.fields.forEach((fieldMetadata: any, key: string) => {
			const control = this.createControlForField(key, fieldMetadata);
			formGroup.addControl(key, control);
		});

		// Replace the current form with the new one
		this.datasetForm = formGroup;
	}

	private createControlForField(key: string, fieldMetadata: any): FormControl | FormGroup | FormArray {
		const validators = fieldMetadata.validators || [];
		let defaultValue = this.getDefaultValueForField(key, fieldMetadata);

		// Handle special cases
		switch (key) {
			case 'dcat:contactPoint':
				return this.fb.group({
					'schema:name': ['', this.metadataService.getFieldValidators('schema:name')],
					'schema:email': ['', this.metadataService.getFieldValidators('schema:email')]
				});

			case 'dct:temporal':
				return this.fb.group({
					'dcat:start_date': [null],
					'dcat:end_date': [null]
				});

			case 'bv:externalCatalogs':
				return this.fb.array([]);

			case 'dcat:distribution':
				return new FormControl(null);

			default:
				return new FormControl(defaultValue, validators);
		}
	}

	private getDefaultValueForField(key: string, fieldMetadata: any): any {
		// Set appropriate default values based on field type
		switch (fieldMetadata.type) {
			case 'boolean':
				return false;
			case 'array':
				return null;
			case 'number':
				return null;
			case 'date':
				return null;
			default:
				return fieldMetadata.enum ? '' : null;
		}
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
				// Show success notification
				this.notificationService.success({
					title: 'Form Validation Complete',
					message: 'Dataset form is valid and ready for submission to GitHub'
				});
			}, 1000);
		} else {
			this.markFormGroupTouched(this.datasetForm);
			this.collectInvalidFields();

			// Show error notification
			this.notificationService.warning({
				title: 'Form Validation Failed',
				message: `Please fix ${this.invalidFields.length} required fields to continue`
			});

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

	// Step validation methods
	isStepValid(stepIndex: number): boolean {
		switch (stepIndex) {
			case 0: return this.isBasicInfoStepValid();
			case 1: return this.isAccessClassificationStepValid();
			case 2: return this.isPublisherContactStepValid();
			case 3: return this.isMetadataVersioningStepValid();
			case 4: return this.isGovernanceStepValid();
			case 5: return this.isExternalReferencesStepValid();
			case 6: return this.isCoverageLegalStepValid();
			case 7: return this.isBusinessContextStepValid();
			case 8: return this.isAdditionalMetadataStepValid();
			case 9: return this.isDistributionsStepValid();
			default: return true;
		}
	}

	private isBasicInfoStepValid(): boolean {
		const titleControl = this.datasetForm.get('dct:title');
		const descriptionControl = this.datasetForm.get('dct:description');
		return !!(titleControl?.valid && descriptionControl?.valid);
	}

	private isAccessClassificationStepValid(): boolean {
		const accessRightsControl = this.datasetForm.get('dct:accessRights');
		const statusControl = this.datasetForm.get('adms:status');
		const classificationControl = this.datasetForm.get('bv:classification');
		const personalDataControl = this.datasetForm.get('bv:personalData');
		return !!(accessRightsControl?.valid && statusControl?.valid && classificationControl?.valid && personalDataControl?.valid);
	}

	private isPublisherContactStepValid(): boolean {
		const publisherControl = this.datasetForm.get('dct:publisher');
		const contactPointControl = this.datasetForm.get('dcat:contactPoint');
		return !!(publisherControl?.valid && contactPointControl?.valid);
	}

	private isMetadataVersioningStepValid(): boolean {
		// No required fields in this step
		return true;
	}

	private isGovernanceStepValid(): boolean {
		// No required fields in this step
		return true;
	}

	private isExternalReferencesStepValid(): boolean {
		// No required fields in this step
		return true;
	}

	private isCoverageLegalStepValid(): boolean {
		// No required fields in this step
		return true;
	}

	private isBusinessContextStepValid(): boolean {
		// No required fields in this step
		return true;
	}

	private isAdditionalMetadataStepValid(): boolean {
		// No required fields in this step
		return true;
	}

	private isDistributionsStepValid(): boolean {
		// No required fields in this step
		return true;
	}

	// Helper methods for template access
	getStepFields(stepId: number): Observable<any[]> {
		return this.metadataService.getStepFields(stepId);
	}

	isFieldRequired(fieldKey: string): boolean {
		return this.metadataService.getFieldValidators(fieldKey).some(v => v === Validators.required);
	}

	getSteps(): Observable<any[]> {
		return this.metadataService.getSteps();
	}
}
