import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {PopoverLinksDirective} from './popover-links.directive';

@Component({
	standalone: true,
	imports: [PopoverLinksDirective],
	template: `<div appPopoverLinks><span class="popover-link" [attr.data-href]="href">link</span></div>`
})
class HostComponent {
	href = '';
}

describe('PopoverLinksDirective', () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;
	let router: {navigate: jest.Mock};

	beforeEach(() => {
		router = {navigate: jest.fn()};
		TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [{provide: Router, useValue: router}]
		});
		jest.spyOn(console, 'log').mockImplementation(() => {});
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function clickLink(): void {
		const span = fixture.nativeElement.querySelector('.popover-link') as HTMLElement;
		span.dispatchEvent(new MouseEvent('click', {bubbles: true}));
	}

	it('creates the host with the directive applied', () => {
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('[appPopoverLinks]')).toBeTruthy();
	});

	it('navigates to an internal route when a popover-link with an absolute path is clicked', () => {
		host.href = '/datasets/abc';
		fixture.detectChanges();
		clickLink();
		expect(router.navigate).toHaveBeenCalledWith(['/datasets/abc']);
	});

	it('opens an external http(s) link in a new tab', () => {
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
		host.href = 'https://example.com';
		fixture.detectChanges();
		clickLink();
		expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
		expect(router.navigate).not.toHaveBeenCalled();
	});

	it('treats a protocol-less href as an external link with https prefix', () => {
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
		host.href = 'example.org/page';
		fixture.detectChanges();
		clickLink();
		expect(openSpy).toHaveBeenCalledWith('https://example.org/page', '_blank', 'noopener,noreferrer');
	});

	it('does nothing for a click outside a popover-link', () => {
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
		fixture.detectChanges();
		const container = fixture.nativeElement.querySelector('[appPopoverLinks]') as HTMLElement;
		container.dispatchEvent(new MouseEvent('click', {bubbles: true}));
		expect(router.navigate).not.toHaveBeenCalled();
		expect(openSpy).not.toHaveBeenCalled();
	});

	it('cleans up listeners on destroy without errors', () => {
		fixture.detectChanges();
		expect(() => fixture.destroy()).not.toThrow();
	});
});
