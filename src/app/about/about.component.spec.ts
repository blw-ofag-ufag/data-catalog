// `marked` ships as ESM and is not transformed by the project jest config, so we
// mock it with a tiny markdown-to-HTML stub good enough to assert rendering.
jest.mock('marked', () => ({
	marked: {
		parse: jest.fn((md: string) =>
			md
				.split(/\n{2,}/)
				.map(block => {
					const trimmed = block.trim();
					if (trimmed.startsWith('# ')) {
						return `<h1>${trimmed.slice(2)}</h1>`;
					}
					return trimmed ? `<p>${trimmed}</p>` : '';
				})
				.join('\n')
		)
	}
}));

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {TranslateService} from '@ngx-translate/core';
import {AboutComponent} from './about.component';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';
import {mockFetchJson, restoreFetch} from '../../../tests/helpers/fetch-mock';

describe('AboutComponent', () => {
	let component: AboutComponent;
	let fixture: ComponentFixture<AboutComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [AboutComponent],
			imports: [NoopAnimationsModule, provideTranslateTesting()]
		}).compileComponents();

		TestBed.inject(TranslateService).use('en');
		fixture = TestBed.createComponent(AboutComponent);
		component = fixture.componentInstance;
	});

	afterEach(() => restoreFetch());

	it('should create', () => {
		mockFetchJson('# Hello');
		expect(component).toBeTruthy();
	});

	it('loads markdown, parses it via marked and renders it as HTML', async () => {
		mockFetchJson('# About Heading\n\nSome paragraph.');
		await component.ngOnInit();
		fixture.detectChanges();

		expect(component.markdownContent).toContain('<h1');
		expect(component.markdownContent).toContain('About Heading');

		const rendered = fixture.nativeElement.querySelector('.markdown-content') as HTMLElement;
		expect(rendered.querySelector('h1')?.textContent).toContain('About Heading');
		expect(rendered.textContent).toContain('Some paragraph.');
	});

	it('requests the markdown file for the current language', async () => {
		const fetchMock = mockFetchJson('content');
		await component.ngOnInit();
		expect(fetchMock).toHaveBeenCalledWith('./assets/md/about/en.md');
	});

	it('falls back to English when the language file is missing', async () => {
		let call = 0;
		(globalThis as any).fetch = jest.fn(() => {
			call++;
			// First request (current lang) fails, fallback to en succeeds.
			return Promise.resolve({
				ok: call > 1,
				status: call > 1 ? 200 : 404,
				text: async () => '# Fallback'
			} as Response);
		});
		TestBed.inject(TranslateService).use('rm');
		await component.ngOnInit();
		expect(component.markdownContent).toContain('Fallback');
	});

	it('sets an error message when fetch throws', async () => {
		jest.spyOn(console, 'error').mockImplementation(() => {});
		(globalThis as any).fetch = jest.fn(() => Promise.reject(new Error('network')));
		await component.ngOnInit();
		expect(component.markdownContent).toBe('<p>Error loading content</p>');
	});
});
