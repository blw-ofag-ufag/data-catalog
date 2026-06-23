// `marked` ships as ESM and is not transformed by the project jest config, so we
// mock it. The stub keeps any pre-built HTML (e.g. the mermaid placeholder divs
// the component injects) intact and wraps plain text in paragraphs.
jest.mock('marked', () => ({
	marked: {
		parse: jest.fn((md: string) =>
			md
				.split(/\n{2,}/)
				.map(block => {
					const trimmed = block.trim();
					if (!trimmed) {
						return '';
					}
					if (trimmed.startsWith('# ')) {
						return `<h1>${trimmed.slice(2)}</h1>`;
					}
					// Preserve HTML the component already produced.
					if (trimmed.startsWith('<')) {
						return trimmed;
					}
					return `<p>${trimmed}</p>`;
				})
				.join('\n')
		)
	}
}));

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {TranslateService} from '@ngx-translate/core';
import {HandbookComponent} from './handbook.component';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';
import {mockFetchJson, restoreFetch} from '../../../tests/helpers/fetch-mock';

describe('HandbookComponent', () => {
	let component: HandbookComponent;
	let fixture: ComponentFixture<HandbookComponent>;

	beforeEach(async () => {
		// `mermaid` is a global script dependency; jsdom has none, so stub it.
		(globalThis as any).mermaid = {
			initialize: jest.fn(),
			render: jest.fn().mockResolvedValue({svg: '<svg id="rendered"></svg>'})
		};

		await TestBed.configureTestingModule({
			declarations: [HandbookComponent],
			imports: [NoopAnimationsModule, provideTranslateTesting()]
		}).compileComponents();

		TestBed.inject(TranslateService).use('en');
		fixture = TestBed.createComponent(HandbookComponent);
		component = fixture.componentInstance;
	});

	afterEach(() => {
		restoreFetch();
		delete (globalThis as any).mermaid;
	});

	it('should create', () => {
		mockFetchJson('# Handbook');
		expect(component).toBeTruthy();
	});

	it('initializes mermaid and loads/parses markdown into HTML', async () => {
		mockFetchJson('# Handbook Title\n\nGuide text.');
		await component.ngOnInit();
		fixture.detectChanges();

		expect((globalThis as any).mermaid.initialize).toHaveBeenCalled();
		expect(component.markdownContent).toContain('<h1');
		expect(component.markdownContent).toContain('Handbook Title');

		const rendered = fixture.nativeElement.querySelector('.markdown-content') as HTMLElement;
		expect(rendered.textContent).toContain('Guide text.');
	});

	it('converts mermaid fenced blocks into mermaid-diagram divs', async () => {
		mockFetchJson('Intro\n\n```mermaid\ngraph TD; A-->B;\n```\n');
		await component.ngOnInit();
		fixture.detectChanges();

		expect(component.markdownContent).toContain('class="mermaid-diagram"');
		expect(component.markdownContent).toContain('graph TD; A-->B;');
	});

	it('requests the markdown file for the current language', async () => {
		const fetchMock = mockFetchJson('content');
		await component.ngOnInit();
		expect(fetchMock).toHaveBeenCalledWith('./assets/md/handbook/en.md');
	});

	it('sets an error message when fetch throws', async () => {
		jest.spyOn(console, 'error').mockImplementation(() => {});
		(globalThis as any).fetch = jest.fn(() => Promise.reject(new Error('network')));
		await component.ngOnInit();
		expect(component.markdownContent).toBe('<p>Error loading content</p>');
	});
});
