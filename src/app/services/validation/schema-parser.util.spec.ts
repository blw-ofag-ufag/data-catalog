import {Validators} from '@angular/forms';
import {ParsedValidationSchema, SchemaParserUtil} from './schema-parser.util';

describe('SchemaParserUtil', () => {
	describe('parseSchema', () => {
		it('returns empty results for an empty schema', () => {
			const parsed = SchemaParserUtil.parseSchema({});
			expect(parsed.requiredFields).toEqual([]);
			expect(parsed.recommendedFields).toEqual([]);
			expect(parsed.fields.size).toBe(0);
		});

		it('exposes required and recommended field lists', () => {
			const parsed = SchemaParserUtil.parseSchema({
				required: ['a'],
				recommended: ['b'],
				properties: {a: {type: 'string'}, b: {type: 'string'}}
			});
			expect(parsed.requiredFields).toEqual(['a']);
			expect(parsed.recommendedFields).toEqual(['b']);
		});

		it('marks a field as required when listed in required', () => {
			const parsed = SchemaParserUtil.parseSchema({
				required: ['a'],
				properties: {a: {type: 'string'}, b: {type: 'string'}}
			});
			expect(parsed.fields.get('a')!.required).toBe(true);
			expect(parsed.fields.get('b')!.required).toBe(false);
		});

		it('copies pattern/minLength/maxLength onto the parsed field', () => {
			const parsed = SchemaParserUtil.parseSchema({
				properties: {a: {type: 'string', pattern: '[a-z]+', minLength: 2, maxLength: 5}}
			});
			const field = parsed.fields.get('a')!;
			expect(field.pattern).toBe('[a-z]+');
			expect(field.minLength).toBe(2);
			expect(field.maxLength).toBe(5);
		});

		describe('getFieldType (via parsed field.type)', () => {
			const cases: [string, any, string][] = [
				['array', {type: 'array'}, 'array'],
				['object', {type: 'object'}, 'object'],
				['boolean', {type: 'boolean'}, 'boolean'],
				['number', {type: 'number'}, 'number'],
				['integer', {type: 'integer'}, 'number'],
				['date format', {format: 'date'}, 'date'],
				['uri format', {format: 'uri'}, 'url'],
				['url format', {format: 'url'}, 'url'],
				['enum', {enum: ['x', 'y']}, 'enum'],
				['default string', {type: 'string'}, 'string'],
				['no type at all', {}, 'string']
			];

			cases.forEach(([name, prop, expected]) => {
				it(`resolves ${name} to "${expected}"`, () => {
					const parsed = SchemaParserUtil.parseSchema({properties: {f: prop}});
					expect(parsed.fields.get('f')!.type).toBe(expected);
				});
			});
		});
	});

	describe('generated validators (via parsed field.validators)', () => {
		function validate(prop: any, value: any, required = false) {
			const schema: any = {properties: {f: prop}};
			if (required) {
				schema.required = ['f'];
			}
			const parsed = SchemaParserUtil.parseSchema(schema);
			const validators = parsed.fields.get('f')!.validators;
			const fn = Validators.compose(validators);
			return fn ? fn({value} as any) : null;
		}

		it('adds required validator only when the field is required', () => {
			expect(validate({type: 'string'}, '', false)).toBeNull();
			expect(validate({type: 'string'}, '', true)).toEqual({required: true});
		});

		describe('email', () => {
			it('applies email validation for schema:email key', () => {
				const parsed = SchemaParserUtil.parseSchema({properties: {'schema:email': {type: 'string'}}});
				const fn = Validators.compose(parsed.fields.get('schema:email')!.validators)!;
				expect(fn({value: 'not-an-email'} as any)).toEqual({email: true});
				expect(fn({value: 'user@example.com'} as any)).toBeNull();
			});

			it('applies email validation when format is email', () => {
				expect(validate({type: 'string', format: 'email'}, 'bad')).toEqual({email: true});
				expect(validate({type: 'string', format: 'email'}, 'a@b.com')).toBeNull();
			});
		});

		describe('url', () => {
			it('requires an http(s) URL for format uri', () => {
				expect(validate({format: 'uri'}, 'ftp://x')).toEqual({pattern: expect.anything()});
				expect(validate({format: 'uri'}, 'https://example.com')).toBeNull();
			});

			it('requires an http(s) URL for format url', () => {
				expect(validate({format: 'url'}, 'example.com')).toEqual({pattern: expect.anything()});
				expect(validate({format: 'url'}, 'http://example.com')).toBeNull();
			});
		});

		describe('pattern', () => {
			it('enforces the schema pattern', () => {
				expect(validate({type: 'string', pattern: '^[0-9]+$'}, 'abc')).toEqual({pattern: expect.anything()});
				expect(validate({type: 'string', pattern: '^[0-9]+$'}, '123')).toBeNull();
			});
		});

		describe('multilingual pattern is anchored (#221)', () => {
			const titleProp = {
				type: 'object',
				required: ['de', 'fr'],
				properties: {
					de: {type: 'string', pattern: '[a-zA-Z0-9_\\-\\s]{10,75}'},
					fr: {type: 'string', pattern: '[a-zA-Z0-9_\\-\\s]{10,75}'}
				}
			};

			const titleErrors = (value: any) => {
				const parsed = SchemaParserUtil.parseSchema({type: 'object', required: ['dct:title'], properties: {'dct:title': titleProp}});
				const field = parsed.fields.get('dct:title')!;
				return field.validators.map(v => v({value} as any)).filter(Boolean);
			};

			it('rejects a title longer than the 75 characters the pattern allows', () => {
				const tooLong = 'a'.repeat(90);
				expect(titleErrors({de: tooLong, fr: tooLong})).not.toEqual([]);
			});

			it('rejects a title whose disallowed characters sit outside the matched substring', () => {
				// Unanchored, this passed on the substring "Portail de donn".
				expect(titleErrors({de: 'Datenportal der Schweiz', fr: "Portail de données de l'agriculture suisse"})).not.toEqual([]);
			});

			it('still accepts a conforming title', () => {
				expect(titleErrors({de: 'Datenportal der Schweiz', fr: 'Portail de donnees agricoles'})).toEqual([]);
			});
		});

		describe('minLength / maxLength', () => {
			it('enforces minLength', () => {
				expect(validate({type: 'string', minLength: 3}, 'ab')).toEqual({minlength: expect.anything()});
				expect(validate({type: 'string', minLength: 3}, 'abc')).toBeNull();
			});

			it('enforces maxLength', () => {
				expect(validate({type: 'string', maxLength: 3}, 'abcd')).toEqual({maxlength: expect.anything()});
				expect(validate({type: 'string', maxLength: 3}, 'abc')).toBeNull();
			});
		});

		it('does NOT apply pattern/length validators to multilingual object fields', () => {
			const prop = {
				type: 'object',
				pattern: '^[0-9]+$',
				minLength: 100,
				maxLength: 1,
				properties: {de: {type: 'string'}, fr: {type: 'string'}}
			};
			// A plain string value would fail pattern/length if those validators were applied.
			expect(validate(prop, 'abc')).toBeNull();
		});
	});

	describe('multilingual handling', () => {
		function parseMultilingual(required?: string[], langProps?: any): ParsedValidationSchema {
			return SchemaParserUtil.parseSchema({
				properties: {
					'dct:title': {
						type: 'object',
						required,
						properties: langProps || {de: {type: 'string'}, fr: {type: 'string'}, it: {type: 'string'}, en: {type: 'string'}}
					}
				}
			});
		}

		it('detects multilingual fields and records the language keys', () => {
			const field = parseMultilingual().fields.get('dct:title')!;
			expect(field.multilingualFields).toEqual(['de', 'fr', 'it', 'en']);
		});

		it('does not flag a non-multilingual object as multilingual', () => {
			const parsed = SchemaParserUtil.parseSchema({
				properties: {addr: {type: 'object', properties: {street: {type: 'string'}}}}
			});
			expect(parsed.fields.get('addr')!.multilingualFields).toBeUndefined();
		});

		it('does not add a multilingual validator or message when no languages are required', () => {
			const field = parseMultilingual([]).fields.get('dct:title')!;
			expect(field.customMessage).toBeUndefined();
		});

		it('adds a custom message when languages are required', () => {
			const field = parseMultilingual(['de', 'fr']).fields.get('dct:title')!;
			expect(field.customMessage).toBe('dct:title must have DE and FR text');
		});

		it('includes pattern info in the custom message when the first lang has a pattern', () => {
			const field = parseMultilingual(['de'], {
				de: {type: 'string', pattern: '[a-zA-Z0-9_\\-\\s]{10,75}'}
			}).fields.get('dct:title')!;
			expect(field.customMessage).toBe('dct:title must have DE text (10-75 characters, only letters A-Z, numbers 0-9, spaces, hyphens and underscores)');
		});

		describe('multilingual validator', () => {
			function runValidator(required: string[], value: any, langProps?: any) {
				const validators = parseMultilingual(required, langProps).fields.get('dct:title')!.validators;
				const multilingual = validators[validators.length - 1];
				return multilingual({value} as any);
			}

			it('returns null when control has no value', () => {
				expect(runValidator(['de', 'fr'], null)).toBeNull();
				expect(runValidator(['de', 'fr'], undefined)).toBeNull();
			});

			it('reports all missing required languages', () => {
				const result = runValidator(['de', 'fr'], {de: '', fr: ''});
				expect(result).toEqual({
					multilingualRequired: {missingLanguages: ['de', 'fr'], requiredPattern: ''}
				});
			});

			it('reports only the languages that are missing', () => {
				const result = runValidator(['de', 'fr'], {de: 'Titel', fr: ''});
				expect(result.multilingualRequired.missingLanguages).toEqual(['fr']);
			});

			it('returns null when all required languages are filled', () => {
				expect(runValidator(['de', 'fr'], {de: 'Titel', fr: 'Titre'})).toBeNull();
			});

			it('treats a value failing the per-language pattern as missing', () => {
				const langProps = {
					de: {type: 'string', pattern: '^[0-9]+$'},
					fr: {type: 'string'}
				};
				const result = runValidator(['de', 'fr'], {de: 'abc', fr: 'Titre'}, langProps);
				expect(result.multilingualRequired.missingLanguages).toEqual(['de']);
			});

			it('accepts a value that satisfies the per-language pattern', () => {
				const langProps = {
					de: {type: 'string', pattern: '^[0-9]+$'},
					fr: {type: 'string'}
				};
				expect(runValidator(['de', 'fr'], {de: '123', fr: 'Titre'}, langProps)).toBeNull();
			});

			it('includes the extracted pattern info in the error payload', () => {
				const langProps = {
					de: {type: 'string', pattern: '[a-zA-Z0-9_\\-\\s]{10,75}'},
					fr: {type: 'string'}
				};
				const result = runValidator(['de', 'fr'], {de: '', fr: 'Titre'}, langProps);
				expect(result.multilingualRequired.requiredPattern).toBe('10-75 characters, only letters A-Z, numbers 0-9, spaces, hyphens and underscores');
			});
		});
	});

	describe('extractPatternInfo (via custom message)', () => {
		function messageFor(pattern: string): string {
			const field = SchemaParserUtil.parseSchema({
				properties: {
					f: {
						type: 'object',
						required: ['de'],
						properties: {de: {type: 'string', pattern}, fr: {type: 'string'}}
					}
				}
			}).fields.get('f')!;
			return field.customMessage!;
		}

		it('describes the exact known character pattern', () => {
			expect(messageFor('[a-zA-Z0-9_\\-\\s]{10,75}')).toContain('10-75 characters, only letters A-Z, numbers 0-9, spaces, hyphens and underscores');
		});

		it('describes a {10,75} range pattern generically', () => {
			expect(messageFor('foo{10,75}')).toContain('(10-75 characters)');
		});

		it('describes a {10,} minimum pattern', () => {
			expect(messageFor('foo{10,500}')).toContain('(minimum 10 characters)');
		});

		it('omits the parenthetical when the pattern is not recognized', () => {
			const msg = messageFor('^[0-9]+$');
			expect(msg).toBe('f must have DE text');
			expect(msg).not.toContain('(');
		});
	});
});
