import {Component, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {ObButtonDirective} from '@oblique/oblique';
import {ObAlertModule} from '@oblique/oblique';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {GitHubAuthService} from '../../services/auth/github-auth.service';
import {RepositoryCredentialsService} from '../../services/auth/repository-credentials.service';
import {PublisherService} from '../../services/api/publisher.service';
import {DatasetJsonService} from '../../services/dataset-json.service';
import {DatasetSchema} from '../../models/schemas/dataset';
import {Publisher} from '../../models/publisher.model';

@Component({
	selector: 'app-dataset-submit',
	standalone: true,
	imports: [CommonModule, TranslatePipe, ObButtonDirective, ObAlertModule, MatIconModule, MatButtonModule],
	templateUrl: './dataset-submit.component.html',
	styleUrl: './dataset-submit.component.scss'
})
export class DatasetSubmitComponent implements OnInit {
	@Input() formData: any = {};
	@Input() isEditMode = false;
	@Input() datasetId?: string | null;

	generatedJson: DatasetSchema | null = null;
	formattedJson = '';
	filePath = '';
	isAuthenticated = false;
	showJsonPreview = false;
	selectedRepository: string | null = null;
	selectedPublisher: Publisher | null = null;

	constructor(
		private readonly githubAuthService: GitHubAuthService,
		private readonly repositoryCredentialsService: RepositoryCredentialsService,
		private readonly publisherService: PublisherService,
		private readonly datasetJsonService: DatasetJsonService
	) {}

	ngOnInit(): void {
		// Get the selected repository
		this.selectedRepository = this.repositoryCredentialsService.getSelectedRepository();

		// Check if authenticated for the selected repository
		if (this.selectedRepository) {
			this.isAuthenticated = this.repositoryCredentialsService.hasValidCredentials(this.selectedRepository);
			this.selectedPublisher = this.publisherService.getPublishers().find(p => p.githubRepo === this.selectedRepository) || null;
		} else {
			// Fallback to legacy authentication
			this.isAuthenticated = this.githubAuthService.isAuthenticated();
		}

		this.generateJson();
	}

	generateJson(): void {
		if (Object.keys(this.formData).length > 0) {
			this.generatedJson = this.datasetJsonService.generateDatasetJson(this.formData);
			this.formattedJson = this.datasetJsonService.formatJsonForDisplay(this.generatedJson);
			const id = this.datasetId || this.generatedJson['dct:identifier'];
			this.filePath = this.datasetJsonService.generateFilePath(id);
		}
	}

	toggleJsonPreview(): void {
		this.showJsonPreview = !this.showJsonPreview;
	}

	copyJsonToClipboard(): void {
		if (this.formattedJson) {
			navigator.clipboard.writeText(this.formattedJson).then(() => {
				// Could show a toast notification here
				console.log('JSON copied to clipboard');
			});
		}
	}

	downloadJson(): void {
		if (this.generatedJson) {
			const blob = this.datasetJsonService.createJsonBlob(this.generatedJson);
			const id = this.datasetId || this.generatedJson['dct:identifier'];
			const filename = `${id}.json`;

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			link.click();
			window.URL.revokeObjectURL(url);
		}
	}

	openInGitHub(): void {
		if (this.generatedJson && this.filePath) {
			let githubUrl: string;

			if (this.selectedRepository && this.selectedPublisher) {
				// Use selected repository and publisher configuration
				if (this.isEditMode && this.datasetId) {
					// Edit existing file
					githubUrl = this.githubAuthService.generateEditFileUrlForRepository(
						this.selectedRepository,
						this.selectedPublisher.branch,
						this.filePath
					);
				} else {
					// Create new file
					githubUrl = this.githubAuthService.generateCreateFileUrlForRepository(
						this.selectedRepository,
						this.selectedPublisher.branch,
						this.filePath,
						this.formattedJson
					);
				}
			} else {
				// Fallback to legacy method
				if (this.isEditMode && this.datasetId) {
					githubUrl = this.githubAuthService.generateEditFileUrl(this.filePath);
				} else {
					githubUrl = this.githubAuthService.generateCreateFileUrl(this.filePath, this.formattedJson);
				}
			}

			window.open(githubUrl, '_blank');
		}
	}

	openAuthDialog(): void {
		// Navigate to auth component or open in modal
		window.open('/modify/auth', '_blank', 'width=600,height=700');
	}
}
