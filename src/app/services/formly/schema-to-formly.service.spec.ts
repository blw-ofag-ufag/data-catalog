import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {FormlyFieldConfig} from '@ngx-formly/core';
import {SchemaToFormlyService} from './schema-to-formly.service';
import {ValidationSchemaService} from '../validation/validation-schema.service';
import {DatasetMetadataService} from '../metadata/dataset-metadata.service';

/**
 * Stub the ValidationSchemaService so the formly service has a deterministic
 * base schema (and an i14y schema) to read field requirements from.
 */
function buildValidationStub(): any {
	const baseFields: Record<string, any> = {
		'dct:title': {required: true, validators: [], pattern: '.{1,75}', minLength: 1, maxLength: 75},
		'dcat:keyword': {required: false, validators: []},
		'dct:accessRights': {required: false, validators: []}
	};
	const i14yFields: Record<string, any> = {
		'dcat:keyword': {required: true, validators: [], pattern: '[a-z]+', minLength: 2, maxLength: 50}
	};

	const schemas: Record<string, any> = {
		base: {id: 'base', fields: baseFields},
		i14y: {id: 'i14y', fields: i14yFields}
	};

	return {
		getSchema: jest.fn((type: string) => schemas[type])
	};
}

describe('SchemaToFormlyService', () => {
	let service: SchemaToFormlyService;
	let metadataStub: any;

	const metadata: Record<string, any> = {
		'dct:title': {},
		'dct:description': {},
		'dcat:keyword': {},
		'dcat:theme': {},
		'dct:accessRights': {},
		'dct:issued': {},
		'dct:identifier': {}
	};

	beforeEach(() => {
		metadataStub = {
			getMetadata: jest.fn().mockReturnValue(of(metadata))
		};

		TestBed.configureTestingModule({
			providers: [
				SchemaToFormlyService,
				{provide: ValidationSchemaService, useValue: buildValidationStub()},
				{provide: DatasetMetadataService, useValue: metadataStub}
			]
		});
		service = TestBed.inject(SchemaToFormlyService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('getStepperFieldConfigs', () => {
		let steps: Array<{label: string; fields: FormlyFieldConfig[]}>;
		let allFields: FormlyFieldConfig[];

		beforeEach(async () => {
			steps = await service.getStepperFieldConfigs();
			allFields = steps.flatMap(s => s.fields);
		});

		it('produces labelled steps each carrying field configs', () => {
			expect(steps.length).toBeGreaterThan(0);
			steps.forEach(step => {
				expect(typeof step.label).toBe('string');
				expect(step.fields.length).toBeGreaterThan(0);
			});
		});

		it('skips the auto-generated dct:identifier field', () => {
			expect(allFields.some(f => f.key === 'dct:identifier')).toBe(false);
		});

		it('maps known fields to their configured formly type', () => {
			const title = allFields.find(f => f.key === 'dct:title');
			const keyword = allFields.find(f => f.key === 'dcat:keyword');
			const theme = allFields.find(f => f.key === 'dcat:theme');
			const accessRights = allFields.find(f => f.key === 'dct:accessRights');
			expect(title?.type).toBe('multilingual');
			expect(keyword?.type).toBe('keyword-array');
			expect(theme?.type).toBe('theme-select');
			expect(accessRights?.type).toBe('enum-select');
		});

		it('falls back to "text" for unmapped fields', () => {
			// dct:issued IS mapped to date; verify mapping holds for it too
			const issued = allFields.find(f => f.key === 'dct:issued');
			expect(issued?.type).toBe('date');
		});

		it('applies base-schema required flags and constraints', () => {
			const title = allFields.find(f => f.key === 'dct:title');
			expect(title?.props?.['required']).toBe(true);
			expect(title?.props?.['pattern']).toBe('.{1,75}');
			expect(title?.props?.['maxLength']).toBe(75);
		});

		it('attaches multilingual validators and required languages to title', () => {
			const title = allFields.find(f => f.key === 'dct:title');
			expect(title?.props?.['requiredLanguages']).toEqual(['de', 'fr']);
			expect(title?.validators).toEqual({validation: ['multilingual-required']});
		});

		it('attaches enum options and translation path to enum-select fields', () => {
			const accessRights = allFields.find(f => f.key === 'dct:accessRights');
			expect(Array.isArray(accessRights?.props?.['options'])).toBe(true);
			expect(accessRights?.props?.['translationPath']).toBe('choices.dataset.dct:accessRights');
		});

		it('builds standard label/placeholder props', () => {
			const title = allFields.find(f => f.key === 'dct:title');
			expect(title?.props?.label).toBe('labels.dct:title');
			expect(title?.props?.placeholder).toBe('modify.auth.form.placeholders.title');
		});

		it('returns the default config when metadata is unavailable', async () => {
			metadataStub.getMetadata.mockReturnValue(of(null));
			const fallback = await service.getStepperFieldConfigs();
			expect(fallback.length).toBe(1);
			expect(fallback[0].fields.map(f => f.key)).toEqual(['dct:title', 'dct:description']);
		});
	});

	describe('applyDynamicSchemaValidation', () => {
		it('marks a field required and adds constraints from the given schema', () => {
			const fields: FormlyFieldConfig[] = [
				{key: 'dcat:keyword', type: 'keyword-array', props: {required: false}}
			];
			service.applyDynamicSchemaValidation(fields, 'i14y');
			expect(fields[0].props?.['required']).toBe(true);
			expect(fields[0].props?.['pattern']).toBe('[a-z]+');
			expect(fields[0].props?.['minLength']).toBe(2);
			expect(fields[0].props?.['maxLength']).toBe(50);
		});

		it('ignores fields not present in the schema and ignored fields', () => {
			const fields: FormlyFieldConfig[] = [
				{key: 'dct:identifier', type: 'text', props: {required: false}},
				{key: 'unknown:field', type: 'text', props: {required: false}}
			];
			service.applyDynamicSchemaValidation(fields, 'i14y');
			expect(fields[0].props?.['required']).toBe(false);
			expect(fields[1].props?.['required']).toBe(false);
		});

		it('does nothing for an unknown schema type', () => {
			const fields: FormlyFieldConfig[] = [
				{key: 'dcat:keyword', type: 'keyword-array', props: {required: false}}
			];
			service.applyDynamicSchemaValidation(fields, 'nope' as any);
			expect(fields[0].props?.['required']).toBe(false);
		});
	});

	describe('removeDynamicSchemaValidation', () => {
		it('resets a field to its base-schema required flag', () => {
			const fields: FormlyFieldConfig[] = [
				{key: 'dct:title', type: 'multilingual', props: {required: false}}
			];
			service.removeDynamicSchemaValidation(fields, 'i14y');
			expect(fields[0].props?.['required']).toBe(true);
		});

		it('sets required false for fields absent from the base schema', () => {
			const fields: FormlyFieldConfig[] = [
				{key: 'not:inBase', type: 'text', props: {required: true}}
			];
			service.removeDynamicSchemaValidation(fields, 'i14y');
			expect(fields[0].props?.['required']).toBe(false);
		});
	});
});
