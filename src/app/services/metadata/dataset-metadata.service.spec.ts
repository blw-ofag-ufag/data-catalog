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

	it('should extract required fields from schema', done => {
		service.getRequiredFields().subscribe(requiredFields => {
			expect(requiredFields.length).toBeGreaterThan(0);
			expect(requiredFields).toContain('dct:title');
			expect(requiredFields).toContain('dct:description');
			expect(requiredFields).toContain('dct:publisher');
			done();
		});
	});

	it('should provide field metadata', done => {
		service.getFieldMetadata('dct:title').subscribe(fieldMetadata => {
			expect(fieldMetadata).toBeTruthy();
			expect(fieldMetadata?.required).toBe(true);
			expect(fieldMetadata?.key).toBe('dct:title');
			expect(fieldMetadata?.type).toBe('object');
			done();
		});
	});

	it('should organize fields into steps', done => {
		service.getSteps().subscribe(steps => {
			expect(steps.length).toBeGreaterThan(0);
			const basicStep = steps.find(s => s.key === 'basic');
			expect(basicStep).toBeTruthy();
			expect(basicStep?.fields).toContain('dct:title');
			expect(basicStep?.fields).toContain('dct:description');
			done();
		});
	});

	it('should identify fields for details display', done => {
		service.getDetailsFields().subscribe(detailFields => {
			expect(detailFields.length).toBeGreaterThan(0);
			// These fields should NOT be in details
			const hasExcludedField = detailFields.some(f => f.key.startsWith('schema:image') || f.key.startsWith('dct:identifier') || f.key.startsWith('dct:title'));
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

	describe('field-type detection', () => {
		const cases: Array<[string, string]> = [
			['dct:title', 'object'],
			['dct:issued', 'date'],
			['dct:accessRights', 'enum'],
			['adms:status', 'enum'],
			['dcat:landingPage', 'url'],
			['bv:archivalValue', 'boolean'],
			['dcat:version', 'string']
		];

		cases.forEach(([key, expectedType]) => {
			it(`detects ${key} as ${expectedType}`, done => {
				service.getFieldMetadata(key).subscribe(field => {
					expect(field?.type).toBe(expectedType);
					done();
				});
			});
		});

		it('records multilingual sub-fields for object language fields', done => {
			service.getFieldMetadata('dct:title').subscribe(field => {
				expect(field?.multilingualFields).toEqual(expect.arrayContaining(['de', 'fr', 'it', 'en']));
				done();
			});
		});
	});

	describe('step assignment', () => {
		const stepCases: Array<[string, number]> = [
			['dct:title', 1],
			['dct:description', 1],
			['dct:accessRights', 2],
			['adms:status', 2],
			['dct:publisher', 3],
			['dct:issued', 4],
			['prov:qualifiedAttribution', 5],
			['bv:externalCatalogs', 6],
			['dct:spatial', 7],
			['bv:itSystem', 8],
			['prov:wasDerivedFrom', 9],
			['dcat:distribution', 10]
		];

		stepCases.forEach(([key, stepId]) => {
			it(`assigns ${key} to step ${stepId}`, done => {
				service.getFieldMetadata(key).subscribe(field => {
					expect(field?.step).toBe(stepId);
					done();
				});
			});
		});

		it('sets the group to match the step key', done => {
			service.getFieldMetadata('dct:title').subscribe(field => {
				expect(field?.group).toBe('basic');
				done();
			});
		});

		it('exposes the configured steps via getSteps', done => {
			service.getSteps().subscribe(steps => {
				expect(steps.length).toBe(10);
				expect(steps.map(s => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
				const step1 = steps.find(s => s.id === 1);
				expect(step1?.key).toBe('basic');
				expect(step1?.fields).toContain('dct:title');
				done();
			});
		});
	});

	describe('recommended-flag detection', () => {
		it('flags recommended fields from the schema', done => {
			service.isFieldRecommended('dct:accessRights').subscribe(rec => {
				expect(rec).toBe(true);
				done();
			});
		});

		it('does not flag non-recommended fields', done => {
			service.isFieldRecommended('dct:title').subscribe(rec => {
				expect(rec).toBe(false);
				done();
			});
		});

		it('returns false for an unknown field', done => {
			service.isFieldRecommended('does:notExist').subscribe(rec => {
				expect(rec).toBe(false);
				done();
			});
		});

		it('reflects the recommended flag on field metadata', done => {
			service.getFieldMetadata('dct:modified').subscribe(field => {
				expect(field?.recommended).toBe(true);
				done();
			});
		});
	});

	describe('getAllFields', () => {
		it('returns metadata for every schema property', done => {
			service.getAllFields().subscribe(fields => {
				expect(fields.length).toBeGreaterThan(0);
				expect(fields.some(f => f.key === 'dct:title')).toBe(true);
				expect(fields.some(f => f.key === 'dct:identifier')).toBe(true);
				// every entry carries a key and a label
				fields.forEach(f => {
					expect(f.key).toBeTruthy();
					expect(f.label).toBe(`labels.${f.key}`);
				});
				done();
			});
		});
	});

	describe('getDetailsFields', () => {
		it('excludes the configured non-details fields', done => {
			service.getDetailsFields().subscribe(fields => {
				const keys = fields.map(f => f.key);
				['schema:image', 'dct:identifier', 'dct:title', 'dct:description', 'dct:publisher', 'prov:qualifiedAttribution', 'dcat:distribution', 'bv:externalCatalogs'].forEach(excluded => {
					expect(keys).not.toContain(excluded);
				});
				done();
			});
		});

		it('orders fields by ascending displayOrder', done => {
			service.getDetailsFields().subscribe(fields => {
				const orders = fields.map(f => f.displayOrder || 999);
				const sorted = [...orders].sort((a, b) => a - b);
				expect(orders).toEqual(sorted);
				done();
			});
		});

		it('only includes fields flagged displayInDetails', done => {
			service.getDetailsFields().subscribe(fields => {
				expect(fields.every(f => f.displayInDetails)).toBe(true);
				done();
			});
		});
	});

	describe('getFieldValidators', () => {
		it('includes Validators.required for a required field', () => {
			const validators = service.getFieldValidators('dct:publisher');
			expect(validators.length).toBeGreaterThan(0);
		});

		it('returns an empty array for an optional field', () => {
			expect(service.getFieldValidators('dcat:version')).toEqual([]);
		});

		it('returns an empty array for an unknown field', () => {
			expect(service.getFieldValidators('does:notExist')).toEqual([]);
		});
	});
});
