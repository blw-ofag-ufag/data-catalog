import {Injectable} from '@angular/core';
import {CanActivate, Router} from '@angular/router';
import {GitHubAuthService} from './github-auth.service';
import {environment} from '../../../environments/environment';

@Injectable({
	providedIn: 'root'
})
export class GitHubAuthGuard implements CanActivate {
	constructor(
		private githubAuthService: GitHubAuthService,
		private router: Router
	) {}

	canActivate(): boolean {
		// Bypass auth in debug mode
		if (environment.debugMode) {
			console.log('🛠️ Debug mode: Bypassing GitHub authentication');
			return true;
		}

		if (this.githubAuthService.isAuthenticated()) {
			return true;
		} else {
			// Redirect to auth page if not authenticated
			this.router.navigate(['/modify/auth']);
			return false;
		}
	}
}
