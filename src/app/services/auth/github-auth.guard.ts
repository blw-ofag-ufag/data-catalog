import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

@Injectable({
	providedIn: 'root'
})
export class GitHubAuthGuard implements CanActivate {
	// Authentication is now optional - always allow access
	// The form will show auth status and let users proceed either way
	canActivate(): boolean {
		return true;
	}
}
