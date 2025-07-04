import {AfterViewInit, Component, ElementRef, OnInit} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {marked} from 'marked';
import mermaid from 'mermaid';

@Component({
	selector: 'handbook',
	standalone: false,
	templateUrl: './handbook.component.html',
	styleUrl: './handbook.component.scss'
})
export class HandbookComponent implements OnInit, AfterViewInit {
	markdownContent: string = '';

	constructor(
		private readonly translate: TranslateService,
		private readonly elementRef: ElementRef
	) {}

	async ngOnInit() {
		// Initialize Mermaid
		mermaid.initialize({
			theme: 'default',
			startOnLoad: false,
			fontFamily: 'inherit',
			fontSize: 14,
			flowchart: {
				useMaxWidth: true,
				htmlLabels: true
			},
			suppressErrorRendering: true
		});

		await this.loadMarkdownContent();

		this.translate.onLangChange.subscribe(async () => {
			await this.loadMarkdownContent();
		});
	}

	async ngAfterViewInit() {
		// Render any existing Mermaid diagrams after view initialization
		await this.renderMermaidDiagrams();
	}

	private async loadMarkdownContent() {
		const currentLang = this.translate.currentLang || 'en';
		const filename = `handbook/${currentLang}.md`;

		try {
			const response = await fetch(`./assets/md/${filename}`);
			if (response.ok) {
				const markdownText = await response.text();
				this.markdownContent = await this.processMarkdownWithMermaid(markdownText);
			} else {
				// Fallback to English if current language file doesn't exist
				const fallbackResponse = await fetch('./assets/md/handbook/en.md');
				if (fallbackResponse.ok) {
					const markdownText = await fallbackResponse.text();
					this.markdownContent = await this.processMarkdownWithMermaid(markdownText);
				}
			}

			// Render Mermaid diagrams after content is loaded
			setTimeout(() => this.renderMermaidDiagrams(), 100);
		} catch (error) {
			console.error('Error loading markdown content:', error);
			this.markdownContent = '<p>Error loading content</p>';
		}
	}

	private async processMarkdownWithMermaid(markdownText: string): Promise<string> {
		// First, extract Mermaid code blocks and replace them with placeholders
		const mermaidBlocks: string[] = [];
		let mermaidIndex = 0;

		const processedMarkdown = markdownText.replace(/```mermaid\n([\s\S]*?)\n```/g, (match, code) => {
			mermaidBlocks.push(code.trim());
			return `<div class="mermaid-diagram" id="mermaid-${mermaidIndex++}">${code.trim()}</div>`;
		});

		// Process the markdown normally
		return await marked.parse(processedMarkdown);
	}

	private async renderMermaidDiagrams() {
		const mermaidElements = this.elementRef.nativeElement.querySelectorAll('.mermaid-diagram');

		for (let i = 0; i < mermaidElements.length; i++) {
			const element = mermaidElements[i];
			const diagramCode = element.textContent;

			if (diagramCode) {
				try {
					const {svg} = await mermaid.render(`diagram-${i}-${Date.now()}`, diagramCode);
					element.innerHTML = svg;
				} catch (error) {
					console.error('Error rendering Mermaid diagram:', error);
					element.innerHTML = `<p class="mermaid-error">Error rendering diagram: ${error}</p>`;
				}
			}
		}
	}
}
