import {TestBed} from '@angular/core/testing';
import {DebugService} from './debug.service';

describe('DebugService', () => {
	let service: DebugService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(DebugService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('is disabled by default', () => {
		expect(service.isDebugEnabled()).toBe(false);
	});

	describe('toggleDebug', () => {
		it('turns debug on from the default state', () => {
			expect(service.toggleDebug()).toBe(true);
			expect(service.isDebugEnabled()).toBe(true);
		});

		it('turns debug off again on a second toggle', () => {
			service.toggleDebug();
			expect(service.toggleDebug()).toBe(false);
			expect(service.isDebugEnabled()).toBe(false);
		});
	});

	describe('isDebugEnabled$', () => {
		it('emits the current value to subscribers', () => {
			const emissions: boolean[] = [];
			service.isDebugEnabled$.subscribe(value => emissions.push(value));
			service.toggleDebug();
			service.toggleDebug();
			expect(emissions).toEqual([false, true, false]);
		});
	});
});
