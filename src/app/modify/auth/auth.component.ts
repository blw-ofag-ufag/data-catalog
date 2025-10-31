import {Component, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe} from '@ngx-translate/core';
import {ObButtonDirective} from '@oblique/oblique';
import {ObErrorMessagesModule} from '@oblique/oblique';
import {ObAlertModule} from '@oblique/oblique';
import {ObSpinnerModule} from '@oblique/oblique';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {GitHubAuthService, GitHubCredentials} from '../../services/auth/github-auth.service';

@Component({
	selector: 'app-auth',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		TranslatePipe,
		ObButtonDirective,
		ObErrorMessagesModule,
		ObAlertModule,
		ObSpinnerModule,
		MatFormFieldModule,
		MatInputModule,
		MatProgressSpinnerModule
	],
	templateUrl: './auth.component.html',
	styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnDestroy {
	authForm: FormGroup;
	isLoading = false;
	errorMessage: string | null = null;
	private readonly destroy$ = new Subject<void>();

	constructor(
		private readonly fb: FormBuilder,
		private readonly githubAuthService: GitHubAuthService,
		private readonly router: Router
	) {
		this.authForm = this.fb.group({
			username: ['', [Validators.required, Validators.minLength(1)]],
			token: ['', [Validators.required, Validators.minLength(10)]]
		});
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	onSubmit(): void {
		if (this.authForm.valid) {
			this.isLoading = true;
			this.errorMessage = null;

			const credentials: GitHubCredentials = {
				username: this.authForm.value.username.trim(),
				token: this.authForm.value.token.trim()
			};

			this.githubAuthService
				.validateCredentials(credentials)
				.pipe(takeUntil(this.destroy$))
				.subscribe({
					next: user => {
						this.isLoading = false;
						// Redirect to the form
						this.router.navigate(['/modify/form']);
					},
					error: error => {
						this.isLoading = false;
						this.errorMessage = this.getErrorMessage(error.message);
					}
				});
		} else {
			this.markFormGroupTouched();
		}
	}

	private getErrorMessage(errorCode: string): string {
		switch (errorCode) {
			case 'INVALID_TOKEN':
				return 'modify.auth.errors.invalidToken';
			case 'TOKEN_EXPIRED':
				return 'modify.auth.errors.tokenExpired';
			case 'NO_WRITE_PERMISSION':
				return 'modify.auth.errors.noWritePermission';
			case 'REPO_NOT_FOUND':
				return 'modify.auth.errors.repoNotFound';
			case 'NO_REPO_ACCESS':
				return 'modify.auth.errors.noRepoAccess';
			case 'NETWORK_ERROR':
				return 'modify.auth.errors.networkError';
			default:
				return 'modify.auth.errors.unknown';
		}
	}

	private markFormGroupTouched(): void {
		Object.keys(this.authForm.controls).forEach(key => {
			const control = this.authForm.get(key);
			control?.markAsTouched();
		});
	}

	get usernameControl() {
		return this.authForm.get('username');
	}

	get tokenControl() {
		return this.authForm.get('token');
	}

	onCancel(): void {
		this.router.navigate(['/']);
	}
}
