import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {GitHubAuthGuard} from './github-auth.guard';
import {GitHubAuthService} from './github-auth.service';

// Mutable environment mock so each test can toggle debugMode.
jest.mock('../../../environments/environment', () => ({
	environment: {production: false, debugMode: true, mockRepository: 'blw-ofag-ufag/metadata'}
}));
import {environment} from '../../../environments/environment';

describe('GitHubAuthGuard', () => {
	let guard: GitHubAuthGuard;
	let authService: jest.Mocked<Pick<GitHubAuthService, 'isAuthenticated'>>;
	let router: jest.Mocked<Pick<Router, 'navigate'>>;

	const route = {} as ActivatedRouteSnapshot;
	const state = {url: '/modify/dataset/123?foo=bar'} as RouterStateSnapshot;

	beforeEach(() => {
		authService = {isAuthenticated: jest.fn()};
		router = {navigate: jest.fn()};
		guard = new GitHubAuthGuard(authService as any, router as any);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should be created', () => {
		expect(guard).toBeTruthy();
	});

	describe('debug mode bypass', () => {
		beforeEach(() => {
			(environment as any).debugMode = true;
		});

		it('returns true and does not touch the auth service or router', () => {
			jest.spyOn(console, 'log').mockImplementation(() => {});
			expect(guard.canActivate(route, state)).toBe(true);
			expect(authService.isAuthenticated).not.toHaveBeenCalled();
			expect(router.navigate).not.toHaveBeenCalled();
		});
	});

	describe('with debug mode disabled', () => {
		beforeEach(() => {
			(environment as any).debugMode = false;
		});

		it('returns true when the user is authenticated', () => {
			authService.isAuthenticated.mockReturnValue(true);
			expect(guard.canActivate(route, state)).toBe(true);
			expect(router.navigate).not.toHaveBeenCalled();
		});

		it('redirects to the auth page and returns false when unauthenticated', () => {
			authService.isAuthenticated.mockReturnValue(false);
			expect(guard.canActivate(route, state)).toBe(false);
			expect(router.navigate).toHaveBeenCalledWith(['/modify/auth'], {
				queryParams: {returnUrl: '/modify/dataset/123?foo=bar'}
			});
		});
	});
});
