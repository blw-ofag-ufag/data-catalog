import {Injectable} from '@angular/core';
import {CanActivate, Router} from '@angular/router';
import {GitHubAuthService} from './github-auth.service';

@Injectable({
	providedIn: 'root'
})
export class GitHubAuthGuard implements CanActivate {
	constructor(
		private githubAuthService: GitHubAuthService,
		private router: Router
	) {}

	canActivate(): boolean {
		if (this.githubAuthService.isAuthenticated()) {
			return true;
		} else {
			// Redirect to auth page if not authenticated
			this.router.navigate(['/modify/auth']);
			return false;
		}
	}
}
