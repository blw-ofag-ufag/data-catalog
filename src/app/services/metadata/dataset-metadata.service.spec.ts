import {TestBed} from '@angular/core/testing';
import {DatasetMetadataService} from './dataset-metadata.service';

describe('DatasetMetadataService', () => {
	let service: DatasetMetadataService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(DatasetMetadataService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('should extract required fields from schema', (done) => {
		service.getRequiredFields().subscribe(requiredFields => {
			expect(requiredFields.length).toBeGreaterThan(0);
			expect(requiredFields).toContain('dct:title');
			expect(requiredFields).toContain('dct:description');
			expect(requiredFields).toContain('dct:accessRights');
			done();
		});
	});

	it('should provide field metadata', (done) => {
		service.getFieldMetadata('dct:title').subscribe(fieldMetadata => {
			expect(fieldMetadata).toBeTruthy();
			expect(fieldMetadata?.required).toBe(true);
			expect(fieldMetadata?.key).toBe('dct:title');
			expect(fieldMetadata?.type).toBe('object');
			done();
		});
	});

	it('should organize fields into steps', (done) => {
		service.getSteps().subscribe(steps => {
			expect(steps.length).toBeGreaterThan(0);
			const basicStep = steps.find(s => s.key === 'basic');
			expect(basicStep).toBeTruthy();
			expect(basicStep?.fields).toContain('dct:title');
			expect(basicStep?.fields).toContain('dct:description');
			done();
		});
	});

	it('should identify fields for details display', (done) => {
		service.getDetailsFields().subscribe(detailFields => {
			expect(detailFields.length).toBeGreaterThan(0);
			// These fields should NOT be in details
			const hasExcludedField = detailFields.some(f =>
				f.key.startsWith('schema:image') ||
				f.key.startsWith('dct:identifier') ||
				f.key.startsWith('dct:title')
			);
			expect(hasExcludedField).toBe(false);
			done();
		});
	});

	it('should generate validators for fields', () => {
		const requiredValidators = service.getFieldValidators('dct:title');
		expect(requiredValidators.length).toBeGreaterThan(0);

		const optionalValidators = service.getFieldValidators('dcat:version');
		expect(optionalValidators.length).toBe(0);
	});
});