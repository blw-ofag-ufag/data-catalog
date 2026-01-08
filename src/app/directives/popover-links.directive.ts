import {Directive, ElementRef, OnInit, Renderer2, OnDestroy} from '@angular/core';
import {Router} from '@angular/router';

@Directive({
	selector: '[appPopoverLinks]',
	standalone: true
})
export class PopoverLinksDirective implements OnInit, OnDestroy {
	private clickListener?: () => void;

	constructor(
		private readonly el: ElementRef,
		private readonly renderer: Renderer2,
		private readonly router: Router
	) {}

	ngOnInit() {
		console.log('PopoverLinksDirective initialized');
		// Use MutationObserver to detect when innerHTML content is added
		const observer = new MutationObserver((mutations) => {
			console.log('Mutations detected in popover');
			// Check if there are any links in the content
			const links = this.el.nativeElement.querySelectorAll('a');
			console.log('Found links:', links.length);
			if (links.length > 0) {
				this.attachLinkHandlers();
				observer.disconnect(); // Stop observing once we've attached handlers
			}
		});

		// Start observing for changes
		observer.observe(this.el.nativeElement, {
			childList: true,
			subtree: true,
			characterData: true
		});

		// Also try immediate attachment and with timeout
		this.attachLinkHandlers();
		setTimeout(() => {
			this.attachLinkHandlers();
		}, 100);
	}

	private attachLinkHandlers() {
		console.log('Attaching link handlers to element:', this.el.nativeElement);

		// Clear any existing listeners
		if (this.clickListener) {
			this.clickListener();
			this.clickListener = undefined;
		}

		// Find all popover-link spans and regular links
		const linkElements = this.el.nativeElement.querySelectorAll('.popover-link, a');
		console.log('Found link elements:', linkElements.length);

		// Try multiple event types to see what gets through
		const handleLinkClick = (event: Event) => {
			const target = event.target as HTMLElement;
			console.log(`Event ${event.type} detected, target:`, target.className, target.tagName);

			// Check if clicked element is our custom link span
			if (target.classList.contains('popover-link') || target.closest('.popover-link')) {
				const linkElement = target.classList.contains('popover-link') ? target : target.closest('.popover-link');
				const href = linkElement?.getAttribute('data-href');

				console.log('Popover link clicked, href:', href);

				if (href) {
					event.preventDefault();
					event.stopPropagation();

					// Handle the navigation
					if (href.startsWith('http://') || href.startsWith('https://')) {
						console.log('Opening external link:', href);
						window.open(href, '_blank', 'noopener,noreferrer');
					} else if (href.startsWith('/')) {
						console.log('Navigating to internal route:', href);
						this.router.navigate([href]);
					} else {
						// Treat as external URL if no protocol
						const url = href.includes('://') ? href : `https://${href}`;
						console.log('Opening as external link:', url);
						window.open(url, '_blank', 'noopener,noreferrer');
					}
				}
			}
		};

		// Try multiple event types
		const listeners: (() => void)[] = [];

		// Try click
		listeners.push(this.renderer.listen(this.el.nativeElement, 'click', handleLinkClick));

		// Try mousedown (might fire before popover intercepts)
		listeners.push(this.renderer.listen(this.el.nativeElement, 'mousedown', (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			console.log('Mousedown detected on:', target.className);
			if (target.classList.contains('popover-link')) {
				// Store the href for mouseup
				(target as any)._pendingHref = target.getAttribute('data-href');
			}
		}));

		// Try mouseup
		listeners.push(this.renderer.listen(this.el.nativeElement, 'mouseup', (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			console.log('Mouseup detected on:', target.className);
			if ((target as any)._pendingHref) {
				const href = (target as any)._pendingHref;
				delete (target as any)._pendingHref;

				if (href) {
					if (href.startsWith('http://') || href.startsWith('https://')) {
						console.log('Opening on mouseup:', href);
						setTimeout(() => window.open(href, '_blank', 'noopener,noreferrer'), 0);
					} else if (href.startsWith('/')) {
						setTimeout(() => this.router.navigate([href]), 0);
					} else {
						const url = href.includes('://') ? href : `https://${href}`;
						setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), 0);
					}
				}
			}
		}));

		// Try pointerup (newer event type)
		listeners.push(this.renderer.listen(this.el.nativeElement, 'pointerup', handleLinkClick));

		// Store cleanup function
		this.clickListener = () => {
			listeners.forEach(listener => listener());
		};
	}

	ngOnDestroy() {
		if (this.clickListener) {
			this.clickListener();
		}
	}
}