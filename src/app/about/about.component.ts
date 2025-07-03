import {Component, OnInit} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {marked} from 'marked';

@Component({
	selector: 'about',
	standalone: false,
	templateUrl: './about.component.html',
	styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
	markdownContent: string = '';

	constructor(private readonly translate: TranslateService) {}

	async ngOnInit() {
		await this.loadMarkdownContent();

		this.translate.onLangChange.subscribe(async () => {
			await this.loadMarkdownContent();
		});
	}

	private async loadMarkdownContent() {
		const currentLang = this.translate.currentLang || 'en';
		const filename = `about/${currentLang}.md`;

		try {
			const response = await fetch(`/assets/md/${filename}`);
			if (response.ok) {
				const markdownText = await response.text();
				this.markdownContent = await marked.parse(markdownText);
			} else {
				// Fallback to English if current language file doesn't exist
				const fallbackResponse = await fetch('/assets/md/about/en.md');
				if (fallbackResponse.ok) {
					const markdownText = await fallbackResponse.text();
					this.markdownContent = await marked.parse(markdownText);
				}
			}
		} catch (error) {
			console.error('Error loading markdown content:', error);
			this.markdownContent = '<p>Error loading content</p>';
		}
	}
}
