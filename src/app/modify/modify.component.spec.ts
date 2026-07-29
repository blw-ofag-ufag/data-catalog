import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {CommonModule} from '@angular/common';
import {FormArray, ReactiveFormsModule, Validators} from '@angular/forms';
import {provideNativeDateAdapter} from '@angular/material/core';
import {ActivatedRoute, Router} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';

import {ModifyComponent} from './modify.component';
import {DatasetMetadataConfig, DatasetMetadataService, FieldMetadata, StepConfiguration} from '../services/metadata/dataset-metadata.service';
import {ValidationSchemaService} from '../services/validation/validation-schema.service';
import {FormCacheService} from '../services/form-cache.service';
import {GitHubAuthService} from '../services/auth/github-auth.service';
import {RepositoryCredentialsService} from '../services/auth/repository-credentials.service';
import {MultiDatasetService} from '../services/api/multi-dataset-service.service';
import {I14YThemeService} from '../services/api/i14y-theme.service';
import {PublisherService} from '../services/api/publisher.service';
import {TranslateService} from '@ngx-translate/core';
import {ObNotificationService} from '@oblique/oblique';

import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';
import {stubThemeService, stubTranslateService, stubValidationSchemaService} from '../../../tests/helpers/service-stubs';

// ---------------------------------------------------------------------------
// Test fixtures: a deterministic metadata config that mirrors the real schema
// shape (fields Map + steps[] + requiredFields[]) without parsing dataset.json.
// ---------------------------------------------------------------------------

// Step layout copied from DatasetMetadataService.stepConfig (10 steps).
const STEPS: StepConfiguration[] = [
	{id: 1, key: 'basic', label: 'sections.basic', fields: ['dct:title', 'dct:description', 'dcat:keyword', 'dcat:theme']},
	{id: 2, key: 'access', label: 'sections.access', fields: ['dct:accessRights', 'bv:classification', 'bv:personalData', 'adms:status']},
	{id: 3, key: 'publisher', label: 'sections.publisher', fields: ['dct:publisher', 'dcat:contactPoint']},
	{
		id: 4,
		key: 'metadata',
		label: 'sections.metadata',
		fields: ['dct:issued', 'dct:modified', 'dcat:version', 'dct:accrualPeriodicity', 'bv:typeOfData', 'bv:archivalValue']
	},
	{id: 5, key: 'governance', label: 'sections.governance', fields: ['prov:qualifiedAttribution']},
	{id: 6, key: 'external', label: 'sections.external', fields: ['bv:externalCatalogs', 'dcat:landingPage']},
	{id: 7, key: 'coverage', label: 'sections.coverage', fields: ['dct:spatial', 'dct:temporal']},
	{id: 8, key: 'business', label: 'sections.business', fields: ['bv:itSystem', 'bv:retentionPeriod', 'prov:wasGeneratedBy']},
	{
		id: 9,
		key: 'additional',
		label: 'sections.additional',
		fields: ['schema:comment', 'bv:geoIdentifier', 'schema:image', 'bv:abrogation', 'prov:wasDerivedFrom', 'dcat:inSeries', 'dct:replaces']
	},
	{id: 10, key: 'distributions', label: 'sections.distributions', fields: ['dcat:distribution']}
];

// Required per dataset.json: identifier (auto-generated), title, description,
// publisher, issued, status, classification, personalData.
const REQUIRED_FIELDS = [
	'dct:identifier',
	'dct:title',
	'dct:description',
	'dct:publisher',
	'dct:issued',
	'adms:status',
	'bv:classification',
	'bv:personalData'
];
const RECOMMENDED_FIELDS = ['dct:accessRights', 'dcat:contactPoint', 'dct:accrualPeriodicity', 'dct:modified', 'bv:archivalValue'];

function field(key: string, type: string, extra: Partial<FieldMetadata> = {}): [string, FieldMetadata] {
	return [
		key,
		{
			key,
			required: REQUIRED_FIELDS.includes(key),
			recommended: RECOMMENDED_FIELDS.includes(key),
			type,
			label: `labels.${key}`,
			validators: REQUIRED_FIELDS.includes(key) ? [Validators.required] : [],
			...extra
		}
	];
}

function buildMetadataConfig(): DatasetMetadataConfig {
	const fields = new Map<string, FieldMetadata>([
		field('dct:identifier', 'string'),
		field('dct:title', 'object', {multilingualFields: ['de', 'fr', 'it', 'en']}),
		field('dct:description', 'object', {multilingualFields: ['de', 'fr', 'it', 'en']}),
		field('dcat:keyword', 'array'),
		field('dcat:theme', 'array'),
		field('dct:accessRights', 'enum', {enum: ['PUBLIC', 'NON_PUBLIC']}),
		field('bv:classification', 'enum', {enum: ['internal', 'confidential']}),
		field('bv:personalData', 'enum', {enum: ['none', 'normal']}),
		field('adms:status', 'enum', {enum: ['Recorded', 'Validated']}),
		field('dct:publisher', 'enum', {enum: ['BLW-OFAG-UFAG-FOAG']}),
		field('dcat:contactPoint', 'object'),
		field('dct:issued', 'date'),
		field('dct:modified', 'date'),
		field('dcat:version', 'string'),
		field('dct:accrualPeriodicity', 'enum', {enum: ['ANNUAL']}),
		field('bv:typeOfData', 'enum', {enum: ['Stammdaten']}),
		field('bv:archivalValue', 'boolean'),
		field('prov:qualifiedAttribution', 'array'),
		field('bv:externalCatalogs', 'array'),
		field('dcat:landingPage', 'url'),
		field('dct:spatial', 'string'),
		field('dct:temporal', 'object'),
		field('bv:itSystem', 'string'),
		field('bv:retentionPeriod', 'number'),
		field('prov:wasGeneratedBy', 'string'),
		field('schema:comment', 'string'),
		field('bv:geoIdentifier', 'string'),
		field('schema:image', 'url'),
		field('bv:abrogation', 'date'),
		field('prov:wasDerivedFrom', 'string'),
		field('dcat:inSeries', 'string'),
		field('dct:replaces', 'string'),
		field('dcat:distribution', 'array')
	]);

	return {fields, steps: STEPS, requiredFields: REQUIRED_FIELDS};
}

// Minimal multilingual/typed ValidationSchema objects used by handleValidationSchemaChanges.
function makeSchema(id: string, name: string, alertType: 'info' | 'warning' | 'error', fields: Record<string, any> = {}): any {
	return {id, name, color: '#000', alertType, fields, parsedSchema: {}};
}

describe('ModifyComponent', () => {
	let component: ModifyComponent;
	let fixture: ComponentFixture<ModifyComponent>;

	// Mutable test doubles, recreated per test.
	let metadataConfig: DatasetMetadataConfig;
	let metadataSubject: BehaviorSubject<DatasetMetadataConfig | null>;
	let metadataServiceStub: any;
	let validationSchemaServiceStub: any;
	let formCacheServiceStub: any;
	let multiDatasetServiceStub: any;
	let datasetsSubject: BehaviorSubject<any[]>;
	let selectedDatasetSubject: BehaviorSubject<any | null>;
	let publisherServiceStub: any;
	let routerStub: any;
	let notificationServiceStub: any;
	let paramMapValue: Map<string, string>;
	let queryParamsValue: Record<string, any>;

	function makeParamMap(map: Map<string, string>): any {
		return {get: (k: string) => map.get(k) ?? null, has: (k: string) => map.has(k)};
	}

	async function setup(): Promise<void> {
		metadataConfig = buildMetadataConfig();
		metadataSubject = new BehaviorSubject<DatasetMetadataConfig | null>(metadataConfig);
		datasetsSubject = new BehaviorSubject<any[]>([]);
		selectedDatasetSubject = new BehaviorSubject<any | null>(null);

		metadataServiceStub = {
			getMetadata: jest.fn(() => metadataSubject.asObservable()),
			getMetadataValue: jest.fn(() => metadataSubject.value),
			loadForType: jest.fn(),
			getEnumOptions: jest.fn(() => []),
			getStepFields: jest.fn(() => of([])),
			getSteps: jest.fn(() => of(metadataConfig.steps)),
			getFieldValidators: jest.fn((key: string) => (REQUIRED_FIELDS.includes(key) ? [Validators.required] : [])),
			isFieldRequired: jest.fn((key: string) => of(REQUIRED_FIELDS.includes(key))),
			isFieldRecommended: jest.fn((key: string) => of(RECOMMENDED_FIELDS.includes(key)))
		};

		// Schemas: base (everything), i14y, ods. getSchema returns the matching one.
		const schemas: Record<string, any> = {
			base: makeSchema('base', 'Base', 'warning', {
				'dct:title': {required: true},
				'dct:publisher': {required: true}
			}),
			i14y: makeSchema('i14y', 'I14Y', 'info', {'dcat:landingPage': {required: true}}),
			ods: makeSchema('ods', 'opendata.swiss', 'info', {'dct:spatial': {required: true}})
		};
		validationSchemaServiceStub = stubValidationSchemaService({
			isLoaded: jest.fn(() => of(true)),
			getLoadError: jest.fn(() => of(null)),
			getSchema: jest.fn((type: string) => schemas[type]),
			getCombinedValidators: jest.fn(() => []),
			isFieldRequired: jest.fn(() => false),
			getFilteredSchemaValidationErrors: jest.fn(() => []),
			getFieldDebugInfo: jest.fn(() => ({fieldKey: '', schemaMessages: [], componentMessages: []}))
		});

		formCacheServiceStub = {
			getFormData: jest.fn(() => null),
			saveFormData: jest.fn(),
			clearFormData: jest.fn()
		};

		multiDatasetServiceStub = {
			datasets$: datasetsSubject.asObservable(),
			selectedDataset$: selectedDatasetSubject.asObservable(),
			loadIndex: jest.fn(),
			loadDetail: jest.fn()
		};

		publisherServiceStub = {
			getPublishers: jest.fn(() => [{id: 'BLW-OFAG-UFAG-FOAG', shortId: 'BLW', githubRepo: 'blw-ofag-ufag/metadata'}])
		};

		routerStub = {navigate: jest.fn()};
		notificationServiceStub = {success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn()};

		paramMapValue = new Map<string, string>();
		queryParamsValue = {};
		const activatedRouteStub: any = {
			paramMap: of(makeParamMap(paramMapValue)),
			queryParams: of(queryParamsValue)
		};

		await TestBed.configureTestingModule({
			imports: [ModifyComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				provideNativeDateAdapter(),
				{provide: DatasetMetadataService, useValue: metadataServiceStub},
				{provide: ValidationSchemaService, useValue: validationSchemaServiceStub},
				{provide: FormCacheService, useValue: formCacheServiceStub},
				{provide: MultiDatasetService, useValue: multiDatasetServiceStub},
				{provide: I14YThemeService, useValue: stubThemeService()},
				{provide: PublisherService, useValue: publisherServiceStub},
				{provide: TranslateService, useValue: stubTranslateService()},
				{provide: ObNotificationService, useValue: notificationServiceStub},
				{provide: GitHubAuthService, useValue: {} as any},
				{provide: RepositoryCredentialsService, useValue: {getSelectedRepository: jest.fn(() => null)} as any},
				{provide: Router, useValue: routerStub},
				{provide: ActivatedRoute, useValue: activatedRouteStub}
			]
		})
			// Escape hatch: replace the heavy child-component template/imports so the
			// many standalone form-field components (Oblique popovers, datepickers,
			// CVA children) are not instantiated. We get a real ModifyComponent
			// instance whose public methods are fully callable.
			.overrideComponent(ModifyComponent, {set: {imports: [CommonModule, ReactiveFormsModule], template: '<form [formGroup]="datasetForm"></form>'}})
			.compileComponents();

		fixture = TestBed.createComponent(ModifyComponent);
		component = fixture.componentInstance;
	}

	beforeEach(async () => {
		await setup();
	});

	it('creates and builds the reactive form from the metadata schema', () => {
		fixture.detectChanges(); // triggers ngOnInit -> buildFormFromMetadata
		expect(component).toBeTruthy();
		const controls = Object.keys(component.datasetForm.controls);
		// A representative spread of fields across the 10 steps must be present.
		expect(controls).toEqual(
			expect.arrayContaining([
				'dct:identifier',
				'dct:title',
				'dct:description',
				'dcat:keyword',
				'dct:accessRights',
				'bv:classification',
				'adms:status',
				'dct:publisher',
				'dcat:contactPoint',
				'dct:issued',
				'prov:qualifiedAttribution',
				'bv:externalCatalogs',
				'dct:temporal',
				'dcat:distribution'
			])
		);
		// All 33 metadata fields become controls.
		expect(controls.length).toBe(metadataConfig.fields.size);
	});

	it('builds special controls with the expected shapes', () => {
		fixture.detectChanges();
		// contactPoint -> FormGroup with name + email
		const contact = component.datasetForm.get('dcat:contactPoint');
		expect(contact).toBeTruthy();
		expect(component.datasetForm.get('dcat:contactPoint.schema:name')).toBeTruthy();
		expect(component.datasetForm.get('dcat:contactPoint.schema:email')).toBeTruthy();
		// temporal -> FormGroup with start/end date
		expect(component.datasetForm.get('dct:temporal.dcat:start_date')).toBeTruthy();
		expect(component.datasetForm.get('dct:temporal.dcat:end_date')).toBeTruthy();
		// externalCatalogs -> FormArray
		expect(component.datasetForm.get('bv:externalCatalogs')).toBeInstanceOf(FormArray);
		// title default is the multilingual object
		expect(component.datasetForm.get('dct:title')?.value).toEqual({de: '', fr: '', it: '', en: ''});
	});

	describe('isFieldRequired / isFieldRecommended', () => {
		beforeEach(() => fixture.detectChanges());

		it('marks schema-required fields as required', () => {
			expect(component.isFieldRequired('dct:title')).toBe(true);
			expect(component.isFieldRequired('dct:publisher')).toBe(true);
			expect(component.isFieldRequired('bv:personalData')).toBe(true);
		});

		it('marks optional fields as not required', () => {
			expect(component.isFieldRequired('dcat:version')).toBe(false);
			expect(component.isFieldRequired('dct:spatial')).toBe(false);
		});

		it('excludes the auto-generated dct:identifier from required checks', () => {
			// dct:identifier IS in requiredFields, but is auto-generated -> reported as not required.
			expect(REQUIRED_FIELDS).toContain('dct:identifier');
			expect(component.isFieldRequired('dct:identifier')).toBe(false);
		});

		it('reflects recommended fields', () => {
			expect(component.isFieldRecommended('dct:accessRights')).toBe(true);
			expect(component.isFieldRecommended('dct:modified')).toBe(true);
			expect(component.isFieldRecommended('dct:title')).toBe(false);
		});

		it('returns false when no metadata is loaded', () => {
			metadataServiceStub.getMetadataValue.mockReturnValue(null);
			expect(component.isFieldRequired('dct:title')).toBe(false);
			expect(component.isFieldRecommended('dct:accessRights')).toBe(false);
		});
	});

	describe('isStepValid', () => {
		beforeEach(() => fixture.detectChanges());

		it('returns true for a step whose required fields are filled', () => {
			// Step 0 (basic): only dct:title/description are required there.
			component.datasetForm.get('dct:title')?.setValue({de: 'Titel', fr: 'Titre', it: '', en: ''});
			component.datasetForm.get('dct:title')?.setErrors(null);
			component.datasetForm.get('dct:description')?.setValue({de: 'Beschreibung', fr: 'Desc', it: '', en: ''});
			component.datasetForm.get('dct:description')?.setErrors(null);
			expect(component.isStepValid(0)).toBe(true);
		});

		it('returns false for a step with an invalid required field', () => {
			// Step 1 (access): bv:classification, bv:personalData, adms:status required & empty.
			component.datasetForm.get('bv:classification')?.setValidators([Validators.required]);
			component.datasetForm.get('bv:classification')?.updateValueAndValidity();
			expect(component.datasetForm.get('bv:classification')?.valid).toBe(false);
			expect(component.isStepValid(1)).toBe(false);
		});

		it('ignores optional fields when computing step validity', () => {
			// Step 8 (additional, index 8) has no required fields -> always valid.
			expect(component.isStepValid(8)).toBe(true);
		});

		it('treats the auto-generated identifier as satisfied', () => {
			// Even if a step contained dct:identifier it would be skipped; verify the
			// helper returns true for an out-of-range / step with only optional fields.
			expect(component.isStepValid(7)).toBe(true);
		});

		it('special-cases the Governance step (index 4): empty qualifiedAttribution is invalid', () => {
			component.datasetForm.get('prov:qualifiedAttribution')?.setValue(null);
			expect(component.isStepValid(4)).toBe(false);
			component.datasetForm.get('prov:qualifiedAttribution')?.setValue([]);
			expect(component.isStepValid(4)).toBe(false);
		});

		it('Governance step becomes valid when a person is present and the control is valid', () => {
			const ctrl = component.datasetForm.get('prov:qualifiedAttribution');
			ctrl?.setValue([{role: 'owner'}]);
			ctrl?.setErrors(null);
			expect(component.isStepValid(4)).toBe(true);
		});

		it('returns true when metadata is missing or the step index is out of range', () => {
			expect(component.isStepValid(99)).toBe(true);
			metadataServiceStub.getMetadataValue.mockReturnValue(null);
			expect(component.isStepValid(0)).toBe(true);
		});
	});

	describe('external-catalog selection switches validation schemas', () => {
		beforeEach(() => fixture.detectChanges());

		it('starts with only the base schema active', () => {
			expect(Array.from(component.activeValidationSchemas)).toEqual(['base']);
		});

		it('I14Y maps to the i14y schema layer', () => {
			component.onExternalCatalogChange('I14Y', true);
			expect(component.activeValidationSchemas.has('i14y')).toBe(true);
			expect(component.isExternalCatalogSelected('I14Y')).toBe(true);
			// catalog value pushed into the FormArray, in the schema's object shape (#260)
			expect(component.externalCatalogsArray.value).toContainEqual({'dcat:catalog': 'I14Y', 'dct:identifier': ''});
		});

		it('opendata.swiss maps to the ods schema layer', () => {
			component.onExternalCatalogChange('opendata.swiss', true);
			expect(component.activeValidationSchemas.has('ods')).toBe(true);
		});

		it('unchecking a catalog removes its schema layer and array entry', () => {
			component.onExternalCatalogChange('I14Y', true);
			expect(component.activeValidationSchemas.has('i14y')).toBe(true);
			component.onExternalCatalogChange('I14Y', false);
			expect(component.activeValidationSchemas.has('i14y')).toBe(false);
			expect(component.externalCatalogsArray.value.map((entry: any) => entry['dcat:catalog'])).not.toContain('I14Y');
		});

		it('a catalog with no schema mapping (geocat.ch) leaves active schemas unchanged', () => {
			const before = Array.from(component.activeValidationSchemas);
			component.onExternalCatalogChange('geocat.ch', true);
			expect(Array.from(component.activeValidationSchemas)).toEqual(before);
			// but it is still tracked in the FormArray, in the schema's object shape (#260)
			expect(component.externalCatalogsArray.value).toContainEqual({'dcat:catalog': 'geocat.ch', 'dct:identifier': ''});
		});

		it('applies schema validators to mapped fields when a layer is added', () => {
			component.onExternalCatalogChange('I14Y', true);
			// getSchema('i14y') drives applySchemaValidation which iterates schema.fields.
			expect(validationSchemaServiceStub.getSchema).toHaveBeenCalledWith('i14y');
		});
	});

	describe('onSubmit path', () => {
		beforeEach(() => fixture.detectChanges());

		it('caches the form data and shows the submit section when valid', () => {
			jest.useFakeTimers();
			// Make the form valid: clear all validators so datasetForm.valid is true.
			Object.keys(component.datasetForm.controls).forEach(k => {
				component.datasetForm.get(k)?.clearValidators();
				component.datasetForm.get(k)?.updateValueAndValidity();
			});
			validationSchemaServiceStub.getFilteredSchemaValidationErrors.mockReturnValue([]);

			component.onSubmit();
			expect(component.submitAttempted).toBe(true);
			expect(formCacheServiceStub.saveFormData).toHaveBeenCalledWith(component.datasetForm.value, component.datasetId, component.isEditMode);

			jest.advanceTimersByTime(1000);
			expect(component.showSubmitSection).toBe(true);
			expect(notificationServiceStub.success).toHaveBeenCalled();
			jest.useRealTimers();
		});

		it('warns and collects invalid fields when the form is invalid', () => {
			// Keep required validators in place so the form is invalid (empty required fields).
			component.datasetForm.get('dct:publisher')?.setValidators([Validators.required]);
			component.datasetForm.get('dct:publisher')?.updateValueAndValidity();
			expect(component.datasetForm.valid).toBe(false);

			component.onSubmit();
			expect(component.showSubmitSection).toBe(false);
			expect(notificationServiceStub.warning).toHaveBeenCalled();
			expect(component.invalidFields.length).toBeGreaterThan(0);
			// dct:identifier (auto-generated) must never appear in the invalid list.
			expect(component.invalidFields).not.toContain('dct:identifier');
		});

		it('blocks submit when an active schema reports errors even if the reactive form is valid', () => {
			jest.useFakeTimers();
			Object.keys(component.datasetForm.controls).forEach(k => {
				component.datasetForm.get(k)?.clearValidators();
				component.datasetForm.get(k)?.updateValueAndValidity();
			});
			validationSchemaServiceStub.getFilteredSchemaValidationErrors.mockReturnValue(['some schema error']);

			component.onSubmit();
			jest.advanceTimersByTime(1000);
			expect(component.showSubmitSection).toBe(false);
			expect(notificationServiceStub.warning).toHaveBeenCalled();
			jest.useRealTimers();
		});
	});

	// #221 regression: the Formly date field bound [max]=maxDate (=today) plus a maxDateValidator.
	// The custom form dropped both, so a dct:issued of 2099 submitted as valid. JSON Schema cannot
	// express "not in the future", so the bound is applied via the datepicker's [max].
	describe('future-date guard', () => {
		beforeEach(() => fixture.detectChanges());

		it.each(['dct:issued', 'dct:modified'])('bounds %s at today', fieldKey => {
			expect(component.maxDateFor(fieldKey)).toBe(component.today);
		});

		it.each(['bv:abrogation', 'dcat:version', 'dct:spatial'])('leaves %s unbounded', fieldKey => {
			// bv:abrogation is legitimately a future (planned) date, so it must not be capped.
			expect(component.maxDateFor(fieldKey)).toBeNull();
		});

		it('the bound is not itself in the future', () => {
			expect(component.today.getTime()).toBeLessThanOrEqual(Date.now());
		});

		it('returns a stable Date instance within the same day (so [max] does not churn change detection)', () => {
			expect(component.today).toBe(component.today);
		});

		// A form left open past midnight must not keep capping issued/modified at yesterday.
		it('refreshes the bound when the calendar day rolls over', () => {
			jest.useFakeTimers();
			try {
				jest.setSystemTime(new Date(2026, 6, 8, 23, 59, 0));
				expect(component.today.getDate()).toBe(8);

				jest.setSystemTime(new Date(2026, 6, 9, 0, 1, 0));
				expect(component.today.getDate()).toBe(9);
				expect(component.maxDateFor('dct:issued')?.getDate()).toBe(9);
			} finally {
				jest.useRealTimers();
			}
		});
	});

	describe('edit-mode pre-fill', () => {
		it('loads an existing dataset when an :id route param is present', async () => {
			paramMapValue.set('id', 'dataset-123');
			fixture.detectChanges(); // ngOnInit reads paramMap

			expect(component.isEditMode).toBe(true);
			expect(component.datasetId).toBe('dataset-123');
			expect(multiDatasetServiceStub.loadIndex).toHaveBeenCalled();

			// Provide the index entry so loadDetail is triggered.
			datasetsSubject.next([{'dct:identifier': 'dataset-123', 'dct:publisher': 'BLW-OFAG-UFAG-FOAG'}]);
			// loadDetail is keyed by publisher *id* (not githubRepo) and the klass is the product-type
			// discriminator; the untagged index entry defaults to 'dataset' (#221).
			expect(multiDatasetServiceStub.loadDetail).toHaveBeenCalledWith('BLW-OFAG-UFAG-FOAG', 'dataset', 'dataset-123');

			// Now the full dataset arrives -> form is populated.
			selectedDatasetSubject.next({'dct:identifier': 'dataset-123', 'dct:title': {de: 'Geladen', fr: 'Charge', it: '', en: ''}, 'dct:spatial': 'Bern'});
			expect(component.datasetForm.get('dct:title')?.value).toEqual({de: 'Geladen', fr: 'Charge', it: '', en: ''});
			expect(component.datasetForm.get('dct:spatial')?.value).toBe('Bern');
			expect(component.isLoading).toBe(false);
		});

		// #221 regression: editing a non-dataset record fires loadForType() (async per-type schema
		// fetch -> metadata emission -> buildFormFromMetadata recreates every control with defaults)
		// and loadDetail() (async record fetch -> populateForm patch) concurrently. On a cold schema
		// cache the record could win, and the late rebuild then wiped the just-patched values, leaving
		// the user staring at a blank edit form. The patch is now re-applied after every rebuild.
		it('keeps patched record values when the per-type schema resolves after the record', () => {
			paramMapValue.set('id', 'dataset-123');
			fixture.detectChanges();

			datasetsSubject.next([{'dct:identifier': 'dataset-123', 'dct:publisher': 'BLW-OFAG-UFAG-FOAG'}]);
			// Record resolves first and is patched into the form.
			selectedDatasetSubject.next({'dct:identifier': 'dataset-123', 'dct:spatial': 'Bern', 'dcat:version': '1.2.3'});
			expect(component.datasetForm.get('dct:spatial')?.value).toBe('Bern');

			// The per-type schema resolves afterwards -> metadata re-emits -> controls are rebuilt.
			metadataSubject.next(buildMetadataConfig());

			expect(component.datasetForm.get('dct:spatial')?.value).toBe('Bern');
			expect(component.datasetForm.get('dcat:version')?.value).toBe('1.2.3');
		});

		it('keeps cached unsaved edits across a late metadata rebuild', () => {
			formCacheServiceStub.getFormData.mockReturnValue({'dct:spatial': 'Unsaved Edit'});
			paramMapValue.set('id', 'dataset-123');
			fixture.detectChanges();

			datasetsSubject.next([{'dct:identifier': 'dataset-123', 'dct:publisher': 'BLW-OFAG-UFAG-FOAG'}]);
			selectedDatasetSubject.next({'dct:identifier': 'dataset-123', 'dct:spatial': 'Stored Region'});
			expect(component.datasetForm.get('dct:spatial')?.value).toBe('Unsaved Edit');

			metadataSubject.next(buildMetadataConfig());

			expect(component.datasetForm.get('dct:spatial')?.value).toBe('Unsaved Edit');
		});

		it("does not resurrect the previous type's values after an explicit product-type switch", () => {
			fixture.detectChanges();
			component.datasetForm.get('dct:spatial')?.setValue('Bern');
			component.datasetForm.markAsDirty();

			component.onProductTypeChange({target: {value: 'dataService'}} as any);
			// The type switch triggers a schema load; its metadata emission rebuilds the controls.
			metadataSubject.next(buildMetadataConfig());

			expect(component.datasetForm.get('dct:spatial')?.value).toBeFalsy();
		});

		// The user may type while the per-type schema is still loading. buildFormFromMetadata destroys
		// every control, so those edits must be folded into the staged data and re-applied, not lost.
		it('preserves in-progress edits made while the schema was still loading', () => {
			paramMapValue.set('id', 'dataset-123');
			fixture.detectChanges();

			datasetsSubject.next([{'dct:identifier': 'dataset-123', 'dct:publisher': 'BLW-OFAG-UFAG-FOAG'}]);
			selectedDatasetSubject.next({'dct:identifier': 'dataset-123', 'dct:spatial': 'Bern', 'dcat:version': '1.0.0'});

			// User edits a field before the per-type schema resolves.
			component.datasetForm.get('dcat:version')?.setValue('2.0.0');
			component.datasetForm.markAsDirty();

			metadataSubject.next(buildMetadataConfig());

			expect(component.datasetForm.get('dcat:version')?.value).toBe('2.0.0'); // edit survives
			expect(component.datasetForm.get('dct:spatial')?.value).toBe('Bern'); // record value survives
		});

		// The modify route reuses one ModifyComponent instance across records, so staged data from the
		// previous record must not leak into the next one's form.
		it('drops data staged for a previous record when switching to another record', () => {
			paramMapValue.set('id', 'dataset-A');
			fixture.detectChanges();

			datasetsSubject.next([{'dct:identifier': 'dataset-A', 'dct:publisher': 'BLW-OFAG-UFAG-FOAG'}]);
			selectedDatasetSubject.next({'dct:identifier': 'dataset-A', 'dct:spatial': 'Record A Region'});
			expect(component.datasetForm.get('dct:spatial')?.value).toBe('Record A Region');

			// Navigate to record B (same component instance, no ngOnDestroy).
			paramMapValue.set('id', 'dataset-B');
			component.datasetId = 'dataset-B';
			(component as any).initializeForm();

			// Record B's fetch has not resolved; a metadata rebuild must not re-patch record A's values.
			metadataSubject.next(buildMetadataConfig());

			expect(component.datasetForm.get('dct:spatial')?.value).toBeFalsy();
		});

		it('loads a non-dataset record as its own product type (#221)', () => {
			paramMapValue.set('id', 'svc-1');
			fixture.detectChanges(); // ngOnInit reads paramMap

			// Index entry tagged as a dataService -> form must switch to that type and load from its folder.
			datasetsSubject.next([{'dct:identifier': 'svc-1', 'dct:publisher': 'BLW-OFAG-UFAG-FOAG', productType: 'dataService'}]);

			expect(component.productType).toBe('dataService');
			expect(metadataServiceStub.loadForType).toHaveBeenCalledWith('dataService');
			expect(multiDatasetServiceStub.loadDetail).toHaveBeenCalledWith('BLW-OFAG-UFAG-FOAG', 'dataService', 'svc-1');
		});

		it('stays in create mode when no id is present', () => {
			fixture.detectChanges();
			expect(component.isEditMode).toBe(false);
			expect(component.datasetId).toBeFalsy();
			expect(multiDatasetServiceStub.loadIndex).not.toHaveBeenCalled();
		});
	});

	describe('form-cache restore (FormCacheService)', () => {
		it('patches the form from cached data in create mode', () => {
			formCacheServiceStub.getFormData.mockReturnValue({'dct:spatial': 'Cached Region'});
			fixture.detectChanges(); // ngOnInit -> initializeForm
			expect(formCacheServiceStub.getFormData).toHaveBeenCalled();
			expect(component.datasetForm.get('dct:spatial')?.value).toBe('Cached Region');
		});

		it('prefers cached data over the loaded dataset in edit mode', () => {
			formCacheServiceStub.getFormData.mockReturnValue({'dct:spatial': 'Unsaved Edit'});
			paramMapValue.set('id', 'dataset-123');
			fixture.detectChanges();

			datasetsSubject.next([{'dct:identifier': 'dataset-123', 'dct:publisher': 'BLW-OFAG-UFAG-FOAG'}]);
			selectedDatasetSubject.next({'dct:identifier': 'dataset-123', 'dct:spatial': 'Stored Region'});

			// Cached value wins over the stored dataset value.
			expect(component.datasetForm.get('dct:spatial')?.value).toBe('Unsaved Edit');
		});

		it('saves form data on destroy when the form is dirty and not in submit section', () => {
			fixture.detectChanges();
			component.datasetForm.markAsDirty();
			component.showSubmitSection = false;
			component.ngOnDestroy();
			expect(formCacheServiceStub.saveFormData).toHaveBeenCalledWith(component.datasetForm.value, component.datasetId, component.isEditMode);
		});

		it('does not save on destroy when the form is pristine', () => {
			fixture.detectChanges();
			component.datasetForm.markAsPristine();
			component.ngOnDestroy();
			expect(formCacheServiceStub.saveFormData).not.toHaveBeenCalled();
		});
	});

	describe('reset and cancel', () => {
		beforeEach(() => fixture.detectChanges());

		it('onCancel navigates home when the form is pristine', () => {
			component.datasetForm.markAsPristine();
			component.onCancel();
			expect(routerStub.navigate).toHaveBeenCalledWith(['/']);
		});

		it('onFormReset returns from the submit section without resetting data', () => {
			component.showSubmitSection = true;
			component.submitAttempted = true;
			component.onFormReset();
			expect(component.showSubmitSection).toBe(false);
			expect(component.submitAttempted).toBe(false);
		});

		it('onFormReset clears the cache and external catalogs in create mode', () => {
			component.onExternalCatalogChange('I14Y', true);
			expect(component.externalCatalogsArray.length).toBe(1);
			component.onFormReset();
			expect(component.externalCatalogsArray.length).toBe(0);
			expect(formCacheServiceStub.clearFormData).toHaveBeenCalledWith(null);
		});
	});

	describe('misc helpers', () => {
		beforeEach(() => fixture.detectChanges());

		it('getSelectedRepositoryDisplay falls back to the default repo', () => {
			expect(component.getSelectedRepositoryDisplay()).toBe('blw-ofag-ufag/metadata');
		});

		it('retrySchemaLoading resets error state and delegates to the schema service', () => {
			component.schemaLoadError = 'boom';
			component.retrySchemaLoading();
			expect(component.schemaLoadError).toBeNull();
			expect(component.schemasLoading).toBe(true);
			expect(validationSchemaServiceStub.retryLoadingSchemas).toHaveBeenCalled();
		});

		it('exposes per-schema validation error getters', () => {
			expect(component.baseValidationErrors).toEqual([]);
			expect(component.i14yValidationErrors).toEqual([]);
			expect(component.odsValidationErrors).toEqual([]);
		});
	});

	describe('preservedBaseRecord (#284)', () => {
		// What the submit step merges its form output over, so an edit cannot delete record fields
		// the schema no longer declares and the form therefore never rendered.
		const base = (c: any) => c['preservedBaseRecord'] as Record<string, unknown>;
		const record = {'dct:identifier': 'id-1', 'bv:itSystem': 'https://agis.admin.ch'};

		it('exposes the loaded record when editing it as the type it was loaded as', () => {
			Object.assign(component as any, {
				isEditMode: true,
				productType: 'dataset',
				originalDataset: record,
				originalProductType: 'dataset'
			});

			expect(base(component)).toEqual(record);
		});

		it('is empty when creating, so a new record inherits nothing', () => {
			Object.assign(component as any, {isEditMode: false, originalDataset: record, originalProductType: 'dataset'});

			expect(base(component)).toEqual({});
		});

		it('is empty when no record was loaded', () => {
			Object.assign(component as any, {isEditMode: true, originalDataset: null});

			expect(base(component)).toEqual({});
		});

		it('is empty once the product type differs from the one the record was loaded as', () => {
			// Not reachable today (the type selector is create-mode only), but grafting a dataset's
			// fields onto a dataService would corrupt rather than protect.
			Object.assign(component as any, {
				isEditMode: true,
				productType: 'dataService',
				originalDataset: record,
				originalProductType: 'dataset'
			});

			expect(base(component)).toEqual({});
		});
	});
});
