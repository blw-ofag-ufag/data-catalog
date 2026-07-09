import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {DateAdapter, ErrorStateMatcher} from '@angular/material/core';
import {RelationErrorStateMatcher} from '../shared/relation-error-state-matcher';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {Observable, Subject, takeUntil} from 'rxjs';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ObAlertModule, ObButtonDirective, ObIconModule, ObNotificationModule, ObNotificationService} from '@oblique/oblique';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatStepperModule} from '@angular/material/stepper';
import {MatButtonModule} from '@angular/material/button';
import {GitHubAuthService} from '../services/auth/github-auth.service';
import {RepositoryCredentialsService} from '../services/auth/repository-credentials.service';
import {DataProductType, DEFAULT_DATA_PRODUCT_TYPE} from '../models/data-product-type';
import {MultiDatasetService} from '../services/api/multi-dataset-service.service';
import {I14YThemeService} from '../services/api/i14y-theme.service';
import {PublisherService} from '../services/api/publisher.service';
import {DatasetSubmitComponent} from './submit/dataset-submit.component';
import {MultilingualTextFieldComponent} from './form/components/multilingual-text-field/multilingual-text-field.component';
import {EnumSelectFieldComponent} from './form/components/enum-select-field/enum-select-field.component';
import {ThemeSelectFieldComponent} from './form/components/theme-select-field/theme-select-field.component';
import {KeywordSelectFieldComponent} from './form/components/keyword-select-field/keyword-select-field.component';
import {AffiliatedPersonsFieldComponent} from './form/components/affiliated-persons-field/affiliated-persons-field.component';
import {DistributionFieldComponent} from './form/components/distribution-field/distribution-field.component';
import {DatasetPickerFieldComponent} from './form/components/dataset-picker-field/dataset-picker-field.component';
import {ValidationAlertComponent} from './components/validation-alert/validation-alert.component';
import {DatasetMetadataService} from '../services/metadata/dataset-metadata.service';
import {ValidationSchemaService, ValidationSchemaType} from '../services/validation/validation-schema.service';
import {ValidationGroup} from './components/validation-alert/validation-alert.component';
import {environment} from '../../environments/environment';
import {MatIconModule} from '@angular/material/icon';
import {FormCacheService} from '../services/form-cache.service';
import {FormFieldTooltipComponent} from './form/components/form-field-tooltip/form-field-tooltip.component';
import {FieldDebugOverlayComponent, FieldValidationDebugInfo} from './form/components/field-debug-overlay/field-debug-overlay.component';

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
		ObIconModule,
		MatFormFieldModule,
		MatInputModule,
		MatDatepickerModule,
		MatCheckboxModule,
		MatStepperModule,
		MatButtonModule,
		DatasetSubmitComponent,
		MultilingualTextFieldComponent,
		EnumSelectFieldComponent,
		ThemeSelectFieldComponent,
		KeywordSelectFieldComponent,
		AffiliatedPersonsFieldComponent,
		DistributionFieldComponent,
		DatasetPickerFieldComponent,
		ValidationAlertComponent,
		MatIconModule,
		FormFieldTooltipComponent,
		FieldDebugOverlayComponent
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
	submitAttempted = false;

	productType: DataProductType | null = null; // Tracks the product type being edited

	// Validation groups
	activeValidationSchemas: Set<ValidationSchemaType> = new Set(['base']);
	validationErrors: Map<ValidationSchemaType, string[]> = new Map();
	schemaLoadError: string | null = null;
	schemasLoading = true;

	// Store original dataset for reset functionality in edit mode
	private originalDataset: any = null;

	// The data that must currently be present in the form (a loaded record, or cached unsaved edits).
	// buildFormFromMetadata tears down and recreates every control whenever the product type's schema
	// emits, so this is re-applied after each rebuild to survive the schema/record fetch race (#221).
	private pendingFormData: any = null;

	// Fields that are auto-generated and should be excluded from validation
	private readonly autoGeneratedFields = ['dct:identifier'];

	// Mark the issued/modified and temporal start/end inputs red when their cross-field
	// relation is violated (the error lives on the form group, issue #231).
	private todayValue = new Date();

	/**
	 * Today, as the upper bound for dct:issued / dct:modified (those dates can't be in the future).
	 *
	 * Recomputed when the calendar day rolls over — a form left open past midnight would otherwise
	 * keep capping at yesterday and reject a legitimate same-day value. The *same* Date instance is
	 * returned within a day so the [max] binding keeps a stable reference; handing the datepicker a
	 * fresh Date on every change-detection pass would re-run its validators each cycle.
	 */
	get today(): Date {
		const now = new Date();
		if (!this.isSameDay(now, this.todayValue)) {
			this.todayValue = now;
		}
		return this.todayValue;
	}

	private isSameDay(a: Date, b: Date): boolean {
		return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
	}

	readonly issuedModifiedErrorMatcher = new RelationErrorStateMatcher(() => this.datasetForm.hasError('issuedAfterModified'));
	readonly temporalRangeErrorMatcher = new RelationErrorStateMatcher(() => !!this.datasetForm.get('dct:temporal')?.hasError('startAfterEnd'));
	private readonly defaultErrorMatcher = new ErrorStateMatcher();

	// The dynamic 'date' case covers dct:issued / dct:modified / bv:abrogation. Only issued & modified
	// participate in the cross-field relation (#231); other date fields use the default matcher.
	dateErrorMatcher(fieldKey: string): ErrorStateMatcher {
		return fieldKey === 'dct:issued' || fieldKey === 'dct:modified' ? this.issuedModifiedErrorMatcher : this.defaultErrorMatcher;
	}

	/**
	 * Upper bound for a date field, applied via the datepicker's [max] (which both disables future
	 * days in the calendar and raises `matDatepickerMax`).
	 *
	 * Only dct:issued / dct:modified are bounded: a record cannot have been issued or modified in the
	 * future. Other date fields are unbounded — bv:abrogation is legitimately a future (planned)
	 * date. JSON Schema cannot express "not in the future", so the rule lives here (#221 — restores a
	 * guard lost in the Formly → custom-form migration).
	 */
	maxDateFor(fieldKey: string): Date | null {
		return fieldKey === 'dct:issued' || fieldKey === 'dct:modified' ? this.today : null;
	}

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
		private readonly metadataService: DatasetMetadataService,
		private readonly validationSchemaService: ValidationSchemaService,
		private readonly formCacheService: FormCacheService,
		private readonly dateAdapter: DateAdapter<Date>,
		private readonly cdr: ChangeDetectorRef
	) {
		this.datasetForm = this.createForm();
	}

	ngOnInit(): void {
		// Load I14Y themes
		this.i14yThemeService.loadThemes().pipe(takeUntil(this.destroy$)).subscribe();

		// Wait for validation schemas to be loaded
		this.validationSchemaService
			.isLoaded()
			.pipe(takeUntil(this.destroy$))
			.subscribe(loaded => {
				if (loaded) {
					// Apply base schema validation immediately
					this.applySchemaValidation('base');
				}
				// Note: the loading flag is cleared in the metadata subscription below, once the
				// form controls actually exist. Revealing the form here (before build) would render
				// the stepper against missing controls (_rawValidators of null) and leave it blank
				// until a stray click (see #237).
				this.cdr.detectChanges();
			});

		// Monitor schema load errors
		this.validationSchemaService
			.getLoadError()
			.pipe(takeUntil(this.destroy$))
			.subscribe(error => {
				this.schemaLoadError = error;
				if (error) {
					this.notificationService.error(error);
				}
				this.cdr.detectChanges();
			});

		// Initialize form with metadata
		this.metadataService
			.getMetadata()
			.pipe(takeUntil(this.destroy$))
			.subscribe(metadata => {
				if (metadata && this.datasetForm) {
					// buildFormFromMetadata recreates every control with default values, so anything the
					// form is currently showing must be re-applied afterwards. The per-type schema fetch
					// and the record fetch race on a cold cache; re-patching makes the outcome independent
					// of which one resolves first (#221).
					//
					// Fold any in-progress edits into the staged data first: the user may have typed while
					// the schema was still loading, and those edits die with the old controls otherwise.
					const wasDirty = this.datasetForm.dirty;
					if (wasDirty) {
						this.pendingFormData = {...(this.pendingFormData ?? {}), ...this.datasetForm.value};
					}

					this.buildFormFromMetadata(this.datasetForm, metadata);

					if (this.pendingFormData) {
						this.patchIntoForm(this.pendingFormData);
						if (wasDirty) {
							this.datasetForm.markAsDirty();
						}
					}
					// Apply base validation after form is built
					if (this.validationSchemaService.getSchema('base')) {
						this.applySchemaValidation('base');
					}
					// Reveal the form only now that its controls exist, then force change
					// detection so it renders without requiring a stray click (see #237).
					this.schemasLoading = false;
					this.cdr.detectChanges();
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
			// Update validation errors when form status changes
			if (this.datasetForm.touched) {
				this.updateValidationErrors();
			}
		});
	}



	/**
	 * Handle product type selection change in form
	 * Loads appropriate schema and form structure for the selected type
	 */
	onProductTypeChange(event: any): void {
		const newType = event?.target?.value || this.productType;
		if (newType) {
			this.productType = newType;
			// The user deliberately switched type: drop the staged data and clear the form BEFORE loading
			// the new schema. A cached schema emits synchronously, and the metadata subscription folds any
			// still-dirty values back into pendingFormData — which would resurrect the previous type's
			// values the switch was meant to discard (#221).
			this.pendingFormData = null;
			this.datasetForm.reset();
			this.metadataService.loadForType(newType);
		}
	}

	ngOnDestroy(): void {
		// Save form state when component is destroyed (e.g., navigating away)
		// Only save if we have unsaved changes and we're not in submit section
		if (this.datasetForm.dirty && !this.showSubmitSection) {
			this.formCacheService.saveFormData(
				this.datasetForm.value,
				this.datasetId,
				this.isEditMode
			);
		}

		this.destroy$.next();
		this.destroy$.complete();
	}

	/**
	 * Minimal form to bind against until the schema-driven metadata arrives; the ngOnInit metadata
	 * subscription then rebuilds it in place.
	 *
	 * Note: this used to register a *second* getMetadata() subscription that rebuilt a different
	 * FormGroup and reassigned this.datasetForm. It ran before the ngOnInit handler, so every
	 * emission rebuilt the form twice and swapped in a pristine group — discarding the dirty state
	 * (and any in-progress edits) before the ngOnInit handler could preserve them.
	 */
	private createForm(): FormGroup {
		return this.createFallbackForm();
	}

	private createFallbackForm(): FormGroup {
		// Create a minimal form structure that will be replaced when metadata loads
		return this.fb.group({
			'dct:identifier': [''],
			'dct:title': [{de: '', fr: '', it: '', en: ''}],
			'dct:description': [{de: '', fr: '', it: '', en: ''}]
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

		// Enforce date relations: issued <= modified, temporal start <= end (issue #231)
		formGroup.addValidators(this.dateRelationValidator());
		const temporal = formGroup.get('dct:temporal');
		if (temporal) {
			temporal.addValidators(this.temporalRangeValidator());
		}

		// Replace the current form with the new one
		this.datasetForm = formGroup;
	}

	// dct:issued must be on or before dct:modified (issue #231).
	private dateRelationValidator() {
		return (group: AbstractControl): ValidationErrors | null => {
			const issued = group.get('dct:issued')?.value as Date | null;
			const modified = group.get('dct:modified')?.value as Date | null;
			if (issued && modified && this.dateAdapter.compareDate(issued, modified) > 0) {
				return {issuedAfterModified: true};
			}
			return null;
		};
	}

	// dcat:start_date must be on or before dcat:end_date (issue #231).
	private temporalRangeValidator() {
		return (group: AbstractControl): ValidationErrors | null => {
			const start = group.get('dcat:start_date')?.value as Date | null;
			const end = group.get('dcat:end_date')?.value as Date | null;
			if (start && end && this.dateAdapter.compareDate(start, end) > 0) {
				return {startAfterEnd: true};
			}
			return null;
		};
	}

	private createControlForField(key: string, fieldMetadata: any): FormControl | FormGroup | FormArray {
		const validators = fieldMetadata.validators || [];
		const defaultValue = this.getDefaultValueForField(key, fieldMetadata);

		// Handle special cases
		switch (key) {
			case 'dcat:contactPoint':
				return this.fb.group({
					'schema:name': ['', this.metadataService.getFieldValidators('schema:name')],
					'schema:email': ['', this.emailOrBlankValidator()]
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

			case 'prov:qualifiedAttribution':
				return new FormControl(null, validators);

			default:
				return new FormControl(defaultValue, validators);
		}
	}

	private getDefaultValueForField(key: string, fieldMetadata: any): any {
		// Handle multilingual fields
		if (key === 'dct:title' || key === 'dct:description') {
			return {de: '', fr: '', it: '', en: ''};
		}

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
		// The router reuses this component across records (/modify?dataset=A -> ?dataset=B) without
		// destroying it, so data staged for the previous record must be dropped here. Otherwise a
		// metadata rebuild would re-patch record A's values into record B's form — and if B's fetch
		// fails, the user would silently be editing A's values under B's identifier (#221).
		this.pendingFormData = null;

		// Check for cached form data first
		const cachedData = this.formCacheService.getFormData(this.datasetId);

		if (this.isEditMode && this.datasetId) {
			// Load the dataset index
			this.datasetService.loadIndex();
			this.isLoading = true;

			// Subscribe to datasets to find the one we need to edit
			this.datasetService.datasets$.pipe(takeUntil(this.destroy$)).subscribe(datasets => {
				if (datasets && datasets.length > 0) {
					// Find the dataset with matching identifier
					const foundDataset = datasets.find(d => d['dct:identifier'] === this.datasetId);
					if (foundDataset) {
						// Get publisher ID from dataset (it's a string like 'BLW-OFAG-UFAG-FOAG')
						const publisherId = foundDataset['dct:publisher'];

						// Find the publisher configuration by ID
						const publisherConfig = this.publisherService.getPublishers().find(p => p.id === publisherId);

						if (publisherConfig && this.datasetId) {
							// Edit the record as its own product type (#221): the index item is tagged with
							// productType at load time. This schema switch and the record fetch below race on
							// a cold cache; ordering is not relied upon — the metadata subscription re-applies
							// pendingFormData after each rebuild, so a late rebuild can't wipe patched values.
							const type = (foundDataset['productType'] as DataProductType) || DEFAULT_DATA_PRODUCT_TYPE;
							if (this.productType !== type) {
								this.productType = type;
								this.metadataService.loadForType(type);
							}

							// Load full record details. loadDetail resolves the per-type detail URL and keys
							// its URL map by publisher *id* (passing githubRepo would yield undefined). The
							// klass is the type discriminator ('dataset'|'dataService'|'datasetSeries').
							this.datasetService.loadDetail(publisherConfig.id, type, this.datasetId);
						}
					}
				}
			});

			// Subscribe to selected dataset to populate the form once it's loaded
			this.datasetService.selectedDataset$.pipe(takeUntil(this.destroy$)).subscribe(dataset => {
				if (dataset && dataset['dct:identifier'] === this.datasetId) {
					// If we have cached data, use it instead of the loaded dataset
					// This preserves user's unsaved changes when navigating back from submit
					if (cachedData && !this.showSubmitSection) {
						this.patchIntoForm(cachedData);
						// Store the original dataset for reset functionality
						this.originalDataset = {...dataset};
					} else {
						this.populateForm(dataset);
					}
					this.isLoading = false;
					// loadDetail uses native fetch() (outside Angular's zone), so patched values
					// would not render until a stray click without an explicit CD pass (see #237).
					this.cdr.detectChanges();
				}
			});
		} else {
			// For new datasets, check if there's cached data
			if (cachedData && !this.showSubmitSection) {
				this.patchIntoForm(cachedData);
			}
		}
	}

	private populateForm(dataset: any): void {
		// Store original dataset for reset functionality
		this.originalDataset = {...dataset};
		this.patchIntoForm(dataset);
	}

	/**
	 * Patch data into the form, keeping it as the data to restore after a metadata rebuild.
	 * Only keys that exist as controls are patched: the form's shape depends on the product type,
	 * so a record may legitimately carry fields the active type's schema doesn't declare (#221).
	 */
	private patchIntoForm(data: any): void {
		this.pendingFormData = data;

		const patchData: any = {};
		Object.keys(this.datasetForm.controls).forEach(key => {
			if (Object.prototype.hasOwnProperty.call(data, key)) {
				patchData[key] = data[key];
			}
		});

		this.datasetForm.patchValue(patchData);
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
		this.submitAttempted = true;

		// Update validation errors for all active schemas
		this.updateValidationErrors();

		// Check both form validation and schema validation
		const isFormValid = this.datasetForm.valid;
		const hasSchemaErrors = Array.from(this.activeValidationSchemas).some(schemaType => {
			const errors = this.validationSchemaService.getFilteredSchemaValidationErrors(schemaType, this.datasetForm.value);
			return errors.length > 0;
		});

		if (isFormValid && !hasSchemaErrors) {
			this.isLoading = true;

			// Save form data to cache before showing submit section
			this.formCacheService.saveFormData(
				this.datasetForm.value,
				this.datasetId,
				this.isEditMode
			);

			// Simulate processing time
			setTimeout(() => {
				this.isLoading = false;
				this.showSubmitSection = true;
				// Show success notification
				this.notificationService.success({
					title: this.translateService.instant('validation.formStatus.complete.title'),
					message: this.translateService.instant('validation.formStatus.complete.message')
				});
				// Force change detection so the submit section renders without
				// requiring a user interaction (see #237).
				this.cdr.detectChanges();
			}, 1000);
		} else {
			this.markFormGroupTouched(this.datasetForm);
			this.collectInvalidFields();

			console.log('Invalid Fields List:', this.invalidFields);

			// Show error notification
			this.notificationService.warning({
				title: this.translateService.instant('validation.formStatus.failed.title'),
				message: this.translateService.instant('validation.formStatus.failed.message', {count: this.invalidFields.length})
			});

			// Scroll to first error
			this.scrollToFirstError();
		}
	}

	onFormReset(): void {
		// When returning from submit section to form, don't reset the data
		// The cached data is already loaded, just hide the submit section
		if (this.showSubmitSection) {
			this.showSubmitSection = false;
			this.submitAttempted = false;

			// Form data is already cached and will be preserved
			return;
		}

		// This is an actual reset (from the Reset button on the form)
		this.submitAttempted = false;


		if (this.isEditMode && this.originalDataset) {
			// For edit mode: restore original dataset state
			this.populateForm(this.originalDataset);
			// Mark form as pristine and untouched to reflect "no changes"
			this.resetFormState();
		} else {
			// For create mode: clear the form. Drop the staged data too, so a later metadata
			// rebuild doesn't restore what the user just reset away (#221).
			this.pendingFormData = null;
			this.datasetForm.reset();
			// Reset external catalogs FormArray
			const externalCatalogsArray = this.datasetForm.get('bv:externalCatalogs') as FormArray;
			if (externalCatalogsArray) {
				externalCatalogsArray.clear();
			}
			// Clear the cache for new datasets when explicitly resetting
			this.formCacheService.clearFormData(null);
		}
	}

	private resetFormState(): void {
		// Mark the form and all its controls as pristine and untouched
		this.datasetForm.markAsPristine();
		this.datasetForm.markAsUntouched();

		Object.keys(this.datasetForm.controls).forEach(key => {
			const control = this.datasetForm.get(key);
			control?.markAsPristine();
			control?.markAsUntouched();

			if (control instanceof FormGroup) {
				this.resetFormGroupState(control);
			} else if (control instanceof FormArray) {
				control.markAsPristine();
				control.markAsUntouched();
				control.controls.forEach(arrayControl => {
					arrayControl.markAsPristine();
					arrayControl.markAsUntouched();
					if (arrayControl instanceof FormGroup) {
						this.resetFormGroupState(arrayControl);
					}
				});
			}
		});
	}

	private resetFormGroupState(formGroup: FormGroup): void {
		formGroup.markAsPristine();
		formGroup.markAsUntouched();
		Object.keys(formGroup.controls).forEach(key => {
			const control = formGroup.get(key);
			control?.markAsPristine();
			control?.markAsUntouched();
		});
	}

	private markFormGroupTouched(formGroup: FormGroup): void {
		Object.keys(formGroup.controls).forEach(key => {
			const control = formGroup.get(key);
			control?.markAsTouched();
			if (control instanceof FormGroup) {
				this.markFormGroupTouched(control);
			} else if (control instanceof FormArray) {
				control.markAsTouched();
				control.controls.forEach(arrayControl => {
					arrayControl.markAsTouched();
					if (arrayControl instanceof FormGroup) {
						this.markFormGroupTouched(arrayControl);
					}
				});
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

		// Handle validation schema changes
		this.handleValidationSchemaChanges(catalogValue, isChecked);
	}

	private handleValidationSchemaChanges(catalogValue: string, isChecked: boolean): void {
		const schemaMap: Record<string, ValidationSchemaType> = {
			I14Y: 'i14y',
			'opendata.swiss': 'ods'
		};

		const schemaType = schemaMap[catalogValue];
		if (!schemaType) return;

		if (isChecked) {
			this.activeValidationSchemas.add(schemaType);
			this.applySchemaValidation(schemaType);
		} else {
			this.activeValidationSchemas.delete(schemaType);
			this.removeSchemaValidation(schemaType);
		}

		// Update validation errors
		this.updateValidationErrors();
	}

	private applySchemaValidation(schemaType: ValidationSchemaType): void {
		const schema = this.validationSchemaService.getSchema(schemaType);
		if (!schema) return;

		// Apply validators to form fields
		Object.keys(schema.fields).forEach(fieldKey => {
			const control = this.datasetForm.get(fieldKey);
			if (control) {
				// Check if this is a multilingual field
				const fieldValue = control.value;
				const isMultilingual =
					fieldValue && typeof fieldValue === 'object' && ('de' in fieldValue || 'fr' in fieldValue || 'it' in fieldValue || 'en' in fieldValue);

				if (isMultilingual) {
					// For multilingual fields, only apply required validator at the object level
					// Pattern and other validators are handled by the MultilingualTextFieldComponent
					const fieldValidation = schema.fields[fieldKey];
					if (fieldValidation?.required) {
						control.setValidators([Validators.required]);
					} else {
						control.clearValidators();
					}
				} else {
					// For non-multilingual fields, apply all validators
					const validators = this.validationSchemaService.getCombinedValidators(fieldKey, Array.from(this.activeValidationSchemas));
					control.setValidators(validators);
				}
				control.updateValueAndValidity();
			}
		});
	}

	private removeSchemaValidation(schemaType: ValidationSchemaType): void {
		const schema = this.validationSchemaService.getSchema(schemaType);
		if (!schema) return;

		// Reapply only remaining schema validators
		Object.keys(schema.fields).forEach(fieldKey => {
			const control = this.datasetForm.get(fieldKey);
			if (control) {
				// Check if this is a multilingual field
				const fieldValue = control.value;
				const isMultilingual =
					fieldValue && typeof fieldValue === 'object' && ('de' in fieldValue || 'fr' in fieldValue || 'it' in fieldValue || 'en' in fieldValue);

				if (isMultilingual) {
					// For multilingual fields, check if still required in remaining schemas
					const isRequired = this.validationSchemaService.isFieldRequired(fieldKey, Array.from(this.activeValidationSchemas));
					if (isRequired) {
						control.setValidators([Validators.required]);
					} else {
						control.clearValidators();
					}
				} else {
					// For non-multilingual fields, apply all remaining validators
					const validators = this.validationSchemaService.getCombinedValidators(fieldKey, Array.from(this.activeValidationSchemas));
					control.setValidators(validators);
				}
				control.updateValueAndValidity();
			}
		});
	}

	private updateValidationErrors(): void {
		this.validationErrors.clear();

		// Evaluate base plus both strict profiles regardless of activation: base is always
		// blocking, while i14y/ods are advisory until their matching external catalog is
		// selected (see the validationGroups getter and onSubmit's blocking check).
		const allSchemaTypes: ValidationSchemaType[] = ['base', 'i14y', 'ods'];
		allSchemaTypes.forEach(schemaType => {
			const errors = this.validationSchemaService.getFilteredSchemaValidationErrors(schemaType, this.datasetForm.value);

			// For the base schema, also include form validation errors
			if (schemaType === 'base' && this.datasetForm.invalid) {
				const formErrors = this.getFormValidationErrors();
				this.validationErrors.set(schemaType, [...errors, ...formErrors]);
			} else {
				this.validationErrors.set(schemaType, errors);
			}
		});
	}

	private getFormValidationErrors(): string[] {
		const errors: string[] = [];

		// Cross-field date relation errors (issue #231) live on the form group / temporal group.
		if (this.datasetForm.errors?.['issuedAfterModified']) {
			errors.push(this.translateService.instant('modify.auth.form.validation.dateOrderIssuedModified'));
		}
		if (this.datasetForm.get('dct:temporal')?.errors?.['startAfterEnd']) {
			errors.push(this.translateService.instant('modify.auth.form.validation.dateOrderStartEnd'));
		}

		const labelMap: {[key: string]: string} = {
			'dct:title': this.translateService.instant('labels.dct:title'),
			'dct:description': this.translateService.instant('labels.dct:description'),
			'dct:accessRights': this.translateService.instant('labels.dct:accessRights'),
			'dct:publisher': this.translateService.instant('labels.dct:publisher'),
			'dcat:contactPoint.schema:name': this.translateService.instant('modify.auth.form.contactName'),
			'dcat:contactPoint.schema:email': this.translateService.instant('modify.auth.form.contactEmail'),
			'adms:status': this.translateService.instant('labels.adms:status'),
			'bv:classification': this.translateService.instant('labels.bv:classification'),
			'bv:personalData': this.translateService.instant('labels.bv:personalData'),
			'prov:qualifiedAttribution': this.translateService.instant('labels.prov:qualifiedAttribution') || 'Qualified Attribution',
			'dcat:distribution': this.translateService.instant('labels.dcat:distribution') || 'Distributions'
		};

		// Collect form validation errors
		Object.keys(this.datasetForm.controls).forEach(key => {
			// Skip auto-generated fields
			if (this.autoGeneratedFields.includes(key)) {
				return;
			}

			const control = this.datasetForm.get(key);
			if (control?.invalid) {
				if (control instanceof FormGroup) {
					// Handle nested form groups (like contactPoint)
					Object.keys(control.controls).forEach(nestedKey => {
						const fullNestedKey = `${key}.${nestedKey}`;
						if (this.autoGeneratedFields.includes(fullNestedKey)) {
							return;
						}

						const nestedControl = control.get(nestedKey);
						if (nestedControl?.invalid) {
							errors.push(labelMap[fullNestedKey] || fullNestedKey);
						}
					});
				} else {
					// Handle custom validators that provide error messages
					const controlErrors = control.errors;
					if (controlErrors) {
						// Check for custom error messages
						if (controlErrors['message']) {
							// Handle fields that provide a custom message
							errors.push(controlErrors['message']);
						} else if (controlErrors['dataOwnerCount']) {
							errors.push(controlErrors['dataOwnerCount'].message);
						} else if (controlErrors['dataStewardCount']) {
							errors.push(controlErrors['dataStewardCount'].message);
						} else {
							// Default error message
							errors.push(labelMap[key] || key);
						}
					} else {
						errors.push(labelMap[key] || key);
					}
				}
			}
		});

		return errors;
	}

	// Getter methods for template
	get baseValidationErrors(): string[] {
		return this.validationErrors.get('base') || [];
	}

	get i14yValidationErrors(): string[] {
		return this.validationErrors.get('i14y') || [];
	}

	get odsValidationErrors(): string[] {
		return this.validationErrors.get('ods') || [];
	}

	// Get validation groups for template. Includes base (always) plus i14y/ods whenever they
	// have issues; i14y/ods render as advisory (non-blocking) unless their matching external
	// catalog is selected, in which case they block submission (see onSubmit).
	get validationGroups(): ValidationGroup[] {
		const groups: ValidationGroup[] = [];
		const allSchemaTypes: ValidationSchemaType[] = ['base', 'i14y', 'ods'];

		allSchemaTypes.forEach(schemaType => {
			const schema = this.validationSchemaService.getSchema(schemaType);
			const errors = this.validationErrors.get(schemaType) || [];
			if (!schema || errors.length === 0) {
				return;
			}

			const advisory = !this.activeValidationSchemas.has(schemaType);
			groups.push({
				name: schema.name,
				color: schema.color,
				alertType: advisory ? 'info' : schema.alertType,
				errors,
				icon: this.getSchemaIcon(schemaType),
				advisory
			});
		});

		return groups;
	}

	private getSchemaIcon(schemaType: ValidationSchemaType): string {
		const icons: Record<ValidationSchemaType, string> = {
			base: 'warning-triangle',
			i14y: 'info-circle',
			ods: 'checkmark-circle'
		};
		return icons[schemaType] || 'info-circle';
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
			'bv:personalData': this.translateService.instant('labels.bv:personalData'),
			'prov:qualifiedAttribution': this.translateService.instant('labels.prov:qualifiedAttribution') || 'Qualified Attribution'
		};

		// Collect form validation errors
		Object.keys(this.datasetForm.controls).forEach(key => {
			// Skip auto-generated fields
			if (this.autoGeneratedFields.includes(key)) {
				return;
			}

			const control = this.datasetForm.get(key);
			if (control?.invalid) {
				if (control instanceof FormGroup) {
					// Handle nested form groups (like contactPoint)
					Object.keys(control.controls).forEach(nestedKey => {
						const fullNestedKey = `${key}.${nestedKey}`;
						if (this.autoGeneratedFields.includes(fullNestedKey)) {
							return;
						}

						const nestedControl = control.get(nestedKey);
						if (nestedControl?.invalid) {
							this.invalidFields.push(labelMap[fullNestedKey] || fullNestedKey);
						}
					});
				} else {
					// Handle custom validators that provide error messages
					const errors = control.errors;
					if (errors) {
						// Check for custom error messages
						if (errors['message']) {
							// Handle fields that provide a custom message
							this.invalidFields.push(errors['message']);
						} else if (errors['dataOwnerCount']) {
							this.invalidFields.push(errors['dataOwnerCount'].message);
						} else if (errors['dataStewardCount']) {
							this.invalidFields.push(errors['dataStewardCount'].message);
						} else {
							// Default error message
							this.invalidFields.push(labelMap[key] || key);
						}
					} else {
						this.invalidFields.push(labelMap[key] || key);
					}
				}
			}
		});

		// Also collect schema validation errors
		Array.from(this.activeValidationSchemas).forEach(schemaType => {
			const errors = this.validationSchemaService.getFilteredSchemaValidationErrors(schemaType, this.datasetForm.value);
			// Add unique errors that aren't already in the list
			errors.forEach(error => {
				if (!this.invalidFields.some(field => field === error)) {
					this.invalidFields.push(error);
				}
			});
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

	isDebugMode(): boolean {
		return environment.debugMode;
	}

	// Step validation methods - now dynamic based on metadata
	isStepValid(stepIndex: number): boolean {
		const metadata = this.metadataService.getMetadataValue();
		if (!metadata) return true;

		const step = metadata.steps[stepIndex];
		if (!step) return true;

		// Special handling for the Governance step: detect it by its field (not a numeric index),
		// since step counts/order differ per product type (#221).
		if (step.fields.includes('prov:qualifiedAttribution')) {
			const qualifiedAttrControl = this.datasetForm.get('prov:qualifiedAttribution');
			const value = qualifiedAttrControl?.value;
			// Check if the field has at least one person
			if (!value || (Array.isArray(value) && value.length === 0)) {
				return false;
			}
			// Also check if the control itself is valid (role requirements met)
			return qualifiedAttrControl?.valid ?? false;
		}

		// Cross-field date relations (issue #231) aren't attached to a single control,
		// so reflect them on the step that contains the involved fields.
		if (step.fields.includes('dct:modified') && this.datasetForm.hasError('issuedAfterModified')) {
			return false;
		}
		if (step.fields.includes('dct:temporal') && this.datasetForm.get('dct:temporal')?.hasError('startAfterEnd')) {
			return false;
		}

		// Check if all required fields in this step are valid
		return step.fields.every(fieldKey => {
			// Skip auto-generated fields
			if (this.autoGeneratedFields.includes(fieldKey)) {
				return true;
			}

			// Check if field is required
			const fieldMetadata = metadata.fields.get(fieldKey);
			if (!fieldMetadata?.required) {
				return true; // Optional fields don't affect step validity
			}

			// Check if the control is valid
			const control = this.datasetForm.get(fieldKey);
			return control?.valid ?? true;
		});
	}

	// Helper methods for template access
	getStepFields(stepId: number): Observable<any[]> {
		return this.metadataService.getStepFields(stepId);
	}

	// Schema-derived enum option list for a dropdown field (empty-string filtered).
	getEnumOptions(fieldKey: string): string[] {
		return this.metadataService.getEnumOptions(fieldKey);
	}

	isFieldRequired(fieldKey: string): boolean {
		// Exclude auto-generated fields from validation requirements
		if (this.autoGeneratedFields.includes(fieldKey)) {
			return false;
		}

		const metadata = this.metadataService.getMetadataValue();
		if (!metadata) return false;

		const fieldMetadata = metadata.fields.get(fieldKey);
		return fieldMetadata?.required === true;
	}

	isFieldRecommended(fieldKey: string): boolean {
		const metadata = this.metadataService.getMetadataValue();
		if (!metadata) return false;

		const fieldMetadata = metadata.fields.get(fieldKey);
		return fieldMetadata?.recommended === true;
	}

	getFieldValidationDebugInfo(fieldKey: string): FieldValidationDebugInfo {
		return this.validationSchemaService.getFieldDebugInfo(fieldKey);
	}

	// --- Dynamic stepper support (#221) -------------------------------------------------
	// The stepper renders whatever the active product type's layout declares, rather than a
	// hardcoded dataset form. Steps come from the per-type form-layout; fields dispatch to a
	// widget via fieldKind().

	/** Steps for the active product type (empty until metadata is loaded). */
	get steps(): any[] {
		return this.metadataService.getMetadataValue()?.steps ?? [];
	}

	/** A step's fields, restricted to those actually present in the loaded schema (layout may
	 *  list fields a given type doesn't have — those are skipped so no orphan control is bound). */
	stepFields(step: any): string[] {
		const metadata = this.metadataService.getMetadataValue();
		if (!metadata || !step?.fields) return [];
		return step.fields.filter((key: string) => metadata.fields.has(key));
	}

	/** Decide which form widget renders a field. Composite/known fields dispatch by key; the rest
	 *  fall back to the schema-derived field type (multilingual object, enum, boolean, date, text). */
	fieldKind(fieldKey: string): string {
		switch (fieldKey) {
			// Container member-dataset arrays (datasetSeries / dataService) render as a tile picker (#221).
			case 'dcat:dataset':
			case 'dcat:servesDataset':
				return 'datasetPicker';
			case 'dcat:contactPoint':
				return 'contactPoint';
			case 'dct:temporal':
				return 'temporal';
			case 'bv:externalCatalogs':
				return 'externalCatalogs';
			case 'prov:qualifiedAttribution':
				return 'affiliated';
			case 'dcat:distribution':
				return 'distribution';
			case 'dcat:keyword':
				return 'keyword';
			case 'dcat:theme':
				return 'theme';
			case 'schema:comment':
				return 'textarea';
		}
		const field = this.metadataService.getMetadataValue()?.fields.get(fieldKey);
		if (field?.multilingualFields?.length) return 'multilingual';
		if (field?.type === 'enum') return 'enum';
		if (field?.type === 'boolean') return 'boolean';
		if (field?.type === 'date') return 'date';
		return 'text';
	}

	getSteps(): Observable<any[]> {
		return this.metadataService.getSteps();
	}

	retrySchemaLoading(): void {
		this.schemaLoadError = null;
		this.schemasLoading = true;
		this.validationSchemaService.retryLoadingSchemas();
	}

	/**
	 * Custom validator for email field that allows blank values
	 * but validates email format when a value is provided
	 */
	private emailOrBlankValidator() {
		return [(control: FormControl) => {
			const value = control.value;
			// Allow blank/empty values
			if (!value || value.trim() === '') {
				return null;
			}
			// Validate email format when value is provided
			const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
			return emailRegex.test(value) ? null : { email: true };
		}];
	}
}
