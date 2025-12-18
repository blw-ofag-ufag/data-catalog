import {Component, Input, OnInit, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

// Oblique imports
import {ObButtonDirective, ObAlertModule, ObCollapseModule, ObNotificationService} from '@oblique/oblique';

// Material imports
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';

// Services
import {GitHubAuthService} from '../../services/auth/github-auth.service';
import {RepositoryCredentialsService} from '../../services/auth/repository-credentials.service';
import {PublisherService} from '../../services/api/publisher.service';
import {DatasetJsonService} from '../../services/dataset-json.service';
import {FormCacheService} from '../../services/form-cache.service';

// Models
import {DatasetSchema} from '../../models/schemas/dataset';
import {Publisher} from '../../models/publisher.model';

@Component({
	selector: 'app-dataset-submit',
	standalone: true,
	imports: [
		CommonModule,
		TranslateModule,
		ObButtonDirective,
		ObAlertModule,
		ObCollapseModule,
		MatIconModule,
		MatButtonModule
	],
	templateUrl: './dataset-submit.component.html'
})
export class DatasetSubmitComponent implements OnInit, OnDestroy {
	// Inputs
	@Input() formData: Record<string, unknown> = {};
	@Input() isEditMode = false;
	@Input() datasetId?: string | null;

	// State
	generatedJson: DatasetSchema | null = null;
	formattedJson = '';
	filePath = '';
	isAuthenticated = false;
	selectedRepository: string | null = null;
	selectedPublisher: Publisher | null = null;
	isCommitting = false;
	commitSuccess = false;
	commitError: string | null = null;

	// Lifecycle
	private readonly destroy$ = new Subject<void>();

	constructor(
		private readonly githubAuthService: GitHubAuthService,
		private readonly repositoryCredentialsService: RepositoryCredentialsService,
		private readonly publisherService: PublisherService,
		private readonly datasetJsonService: DatasetJsonService,
		private readonly notificationService: ObNotificationService,
		private readonly translateService: TranslateService,
		private readonly formCacheService: FormCacheService
	) {}

	ngOnInit(): void {
		this.initializeAuthentication();
		this.generateJson();
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	// Public methods for template

	copyJsonToClipboard(): void {
		if (!this.formattedJson) {
			return;
		}

		navigator.clipboard
			.writeText(this.formattedJson)
			.then(() => {
				this.notificationService.success({
					title: 'Success',
					message: 'Dataset JSON copied to clipboard'
				});
			})
			.catch(error => {
				console.error('Failed to copy to clipboard:', error);
				this.notificationService.error({
					title: 'Error',
					message: 'Failed to copy to clipboard'
				});
			});
	}

	downloadJson(): void {
		if (!this.generatedJson) {
			return;
		}

		const datasetId = this.getDatasetId();
		if (!datasetId) {
			this.notificationService.error({
				title: 'Error',
				message: 'Dataset ID not available'
			});
			return;
		}

		const blob = this.datasetJsonService.createJsonBlob(this.generatedJson);
		const filename = `${datasetId}.json`;
		this.downloadBlob(blob, filename);
	}

	openInGitHub(): void {
		if (!this.generatedJson || !this.filePath) {
			return;
		}

		const githubUrl = this.generateGitHubUrl();
		if (githubUrl) {
			window.open(githubUrl, '_blank');
		} else {
			this.notificationService.error({
				title: 'Error',
				message: 'Unable to generate GitHub URL'
			});
		}
	}

	openAuthDialog(): void {
		// Open auth in new window
		window.open('/modify/auth', '_blank', 'width=600,height=700');
	}

	commitDirectlyToGitHub(): void {
		if (!this.generatedJson || !this.filePath || !this.formattedJson) {
			this.notificationService.error({
				title: 'Error',
				message: 'Dataset data is not ready for commit'
			});
			return;
		}

		if (!this.selectedRepository || !this.selectedPublisher) {
			this.notificationService.error({
				title: 'Error',
				message: 'Repository not selected'
			});
			return;
		}

		if (!this.isAuthenticated) {
			this.notificationService.warning({
				title: 'Authentication Required',
				message: 'Please authenticate with GitHub first'
			});
			this.openAuthDialog();
			return;
		}

		// Start commit process
		this.isCommitting = true;
		this.commitSuccess = false;
		this.commitError = null;

		// Generate commit message
		const action = this.isEditMode ? 'Update' : 'Create';
		const defaultMessage = `${action} dataset ${this.getDatasetId()}`;
		const commitMessage = defaultMessage;

		// Call the commit service
		this.githubAuthService.commitFileToRepository(
			this.selectedRepository,
			this.selectedPublisher.writeBranch,
			this.filePath,
			this.formattedJson,
			commitMessage,
			this.isEditMode
		).subscribe({
			next: (response) => {
				this.isCommitting = false;
				this.commitSuccess = true;

				// Clear the form cache after successful commit
				this.formCacheService.clearFormData(this.datasetId);

				// Show success notification
				this.notificationService.success({
					title: 'Success',
					message: `Dataset successfully ${this.isEditMode ? 'updated' : 'created'} in GitHub`
				});

				// Open the file in GitHub after a short delay
				setTimeout(() => {
					if (response.htmlUrl) {
						window.open(response.htmlUrl, '_blank');
					}
				}, 1500);
			},
			error: (error) => {
				this.isCommitting = false;
				this.commitError = error.message;

				// Show error notification with specific message
				let errorMessage = 'Failed to commit to GitHub';
				switch(error.message) {
					case 'INVALID_TOKEN':
						errorMessage = 'Invalid GitHub token. Please re-authenticate.';
						break;
					case 'PERMISSION_DENIED':
						errorMessage = 'You do not have permission to write to this repository.';
						break;
					case 'VALIDATION_ERROR':
						errorMessage = 'GitHub validation error. Please check your data.';
						break;
					case 'CONFLICT_ERROR':
						errorMessage = 'File has been modified by someone else. Please refresh and try again.';
						break;
					case 'NO_VALID_CREDENTIALS':
						errorMessage = 'No valid credentials found. Please authenticate first.';
						break;
				}

				this.notificationService.error({
					title: 'Commit Failed',
					message: errorMessage
				});

				console.error('Commit error:', error);
			}
		});
	}

	// Private helper methods

	private initializeAuthentication(): void {
		this.selectedRepository = this.repositoryCredentialsService.getSelectedRepository();

		if (this.selectedRepository) {
			// Check authentication for selected repository
			this.isAuthenticated = this.repositoryCredentialsService.hasValidCredentials(this.selectedRepository);

			// Find corresponding publisher
			const publishers = this.publisherService.getPublishers();
			this.selectedPublisher = publishers.find(p => p.githubRepo === this.selectedRepository) || null;
		} else {
			// Fallback to legacy authentication check
			this.isAuthenticated = this.githubAuthService.isAuthenticated();
		}
	}

	private generateJson(): void {
		if (!this.formData || Object.keys(this.formData).length === 0) {
			return;
		}

		// Generate dataset JSON
		this.generatedJson = this.datasetJsonService.generateDatasetJson(this.formData);

		// Format for display
		this.formattedJson = this.datasetJsonService.formatJsonForDisplay(this.generatedJson);

		// Generate file path
		const datasetId = this.getDatasetId();
		if (datasetId) {
			this.filePath = this.datasetJsonService.generateFilePath(datasetId);
		}
	}

	private getDatasetId(): string | null {
		if (this.datasetId) {
			return this.datasetId;
		}

		if (this.generatedJson && this.generatedJson['dct:identifier']) {
			return this.generatedJson['dct:identifier'] as string;
		}

		return null;
	}

	private generateGitHubUrl(): string | null {
		if (!this.filePath || !this.formattedJson) {
			return null;
		}

		// Use repository-specific URL generation if available
		if (this.selectedRepository && this.selectedPublisher) {
			const branch = this.selectedPublisher.writeBranch;

			if (this.isEditMode && this.datasetId) {
				// Edit existing file - pass the new content to pre-fill the edit form
				return this.githubAuthService.generateEditFileUrlForRepository(
					this.selectedRepository,
					branch,
					this.filePath,
					this.formattedJson
				);
			} else {
				// Create new file
				return this.githubAuthService.generateCreateFileUrlForRepository(
					this.selectedRepository,
					branch,
					this.filePath,
					this.formattedJson
				);
			}
		}

		// Fallback to legacy URL generation
		if (this.isEditMode && this.datasetId) {
			// Pass the new content for edit mode as well
			return this.githubAuthService.generateEditFileUrl(this.filePath, this.formattedJson);
		} else {
			return this.githubAuthService.generateCreateFileUrl(this.filePath, this.formattedJson);
		}
	}

	private downloadBlob(blob: Blob, filename: string): void {
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;

		// Trigger download
		document.body.appendChild(link);
		link.click();

		// Cleanup
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url);
	}
}