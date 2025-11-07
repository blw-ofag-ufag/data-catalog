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
import {ObNotificationService, ObNotificationModule} from '@oblique/oblique';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {GitHubAuthService, GitHubCredentials} from '../../services/auth/github-auth.service';
import {RepositoryCredentialsService} from '../../services/auth/repository-credentials.service';
import {PublisherService} from '../../services/api/publisher.service';
import {Publisher} from '../../models/publisher.model';

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
		ObNotificationModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		MatProgressSpinnerModule,
		MatCardModule,
		MatButtonModule
	],
	templateUrl: './auth.component.html',
	styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnDestroy {
	authForm: FormGroup;
	isLoading = false;
	errorMessage: string | null = null;
	publishers: Publisher[] = [];
	selectedRepository: string | null = null;
	customRepositoryMode = false;
	private readonly destroy$ = new Subject<void>();

	constructor(
		private readonly fb: FormBuilder,
		private readonly githubAuthService: GitHubAuthService,
		private readonly repositoryCredentialsService: RepositoryCredentialsService,
		private readonly publisherService: PublisherService,
		private readonly router: Router,
		private readonly notificationService: ObNotificationService
	) {
		this.publishers = this.publisherService.getPublishers();

		this.authForm = this.fb.group({
			repository: ['', [Validators.required]],
			customRepository: [''],
			username: ['', [Validators.required, Validators.minLength(1)]],
			token: ['', [Validators.required, Validators.minLength(10)]]
		});

		// Set default repository to first publisher
		if (this.publishers.length > 0) {
			this.authForm.patchValue({
				repository: this.publishers[0].githubRepo
			});
			this.selectedRepository = this.publishers[0].githubRepo;
		}
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

			// Determine which repository to authenticate for
			const repository = this.getSelectedRepository();

			this.githubAuthService
				.validateCredentialsForRepository(credentials, repository)
				.pipe(takeUntil(this.destroy$))
				.subscribe({
					next: user => {
						this.isLoading = false;
						// Set the authenticated repository as selected
						this.repositoryCredentialsService.setSelectedRepository(repository);
						// Show success notification
						this.notificationService.success({
							title: 'Authentication Successful',
							message: `Successfully authenticated with ${repository}`
						});
						// Redirect to the form (or back to original destination)
						this.router.navigate(['/modify']);
					},
					error: error => {
						this.isLoading = false;
						this.errorMessage = this.getErrorMessage(error.message);
						// Show error notification
						this.notificationService.error({
							title: 'Authentication Failed',
							message: this.getErrorMessage(error.message)
						});
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
			case 'USERNAME_MISMATCH':
				return 'modify.auth.errors.usernameMismatch';
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

	onRepositoryChange(): void {
		const value = this.authForm.value.repository;
		if (value === 'custom') {
			this.customRepositoryMode = true;
			this.authForm.get('customRepository')?.setValidators([Validators.required]);
		} else {
			this.customRepositoryMode = false;
			this.authForm.get('customRepository')?.clearValidators();
			this.selectedRepository = value;
		}
		this.authForm.get('customRepository')?.updateValueAndValidity();
	}

	getSelectedRepository(): string {
		if (this.customRepositoryMode) {
			return this.authForm.value.customRepository.trim();
		}
		return this.authForm.value.repository;
	}

	getPublisherByRepository(repository: string): Publisher | undefined {
		return this.publishers.find(p => p.githubRepo === repository);
	}
}
