import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {GitHubAuthService} from './github-auth.service';
import {environment} from '../../../environments/environment';

@Injectable({
	providedIn: 'root'
})
export class GitHubAuthGuard implements CanActivate {
	constructor(
		private readonly githubAuthService: GitHubAuthService,
		private readonly router: Router
	) {}

	canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
		// Bypass auth in debug mode
		if (environment.debugMode) {
			console.log('🛠️ Debug mode: Bypassing GitHub authentication');
			return true;
		}

		if (this.githubAuthService.isAuthenticated()) {
			return true;
		}

		// Store the attempted URL for redirecting after authentication
		// Include the full URL with query parameters
		const returnUrl = state.url;

		// Redirect to auth page with return URL
		this.router.navigate(['/modify/auth'], {
			queryParams: {returnUrl}
		});
		return false;
	}
}
