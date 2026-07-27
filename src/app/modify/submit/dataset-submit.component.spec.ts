import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of, throwError} from 'rxjs';
import {ObNotificationService} from '@oblique/oblique';
import {TranslateService} from '@ngx-translate/core';
import {DatasetSubmitComponent} from './dataset-submit.component';
import {GitHubAuthService} from '../../services/auth/github-auth.service';
import {RepositoryCredentialsService} from '../../services/auth/repository-credentials.service';
import {PublisherService} from '../../services/api/publisher.service';
import {DatasetJsonService} from '../../services/dataset-json.service';
import {FormCacheService} from '../../services/form-cache.service';
import {provideTranslateTesting} from '../../../../tests/helpers/translate-testing';
import {stubTranslateService} from '../../../../tests/helpers/service-stubs';

describe('DatasetSubmitComponent', () => {
	let component: DatasetSubmitComponent;
	let fixture: ComponentFixture<DatasetSubmitComponent>;

	const publisher = {
		id: 'BLW',
		shortId: 'BLW',
		githubRepo: 'blw-ofag-ufag/metadata',
		readBranch: 'main',
		writeBranch: 'drafts'
	};
	const generatedJson = {'dct:identifier': 'my-dataset'} as any;

	let githubAuth: any;
	let repoCreds: any;
	let publisherService: any;
	let datasetJson: any;
	let formCache: any;
	let notification: any;

	const setup = async (extra: Partial<DatasetSubmitComponent> = {}) => {
		await TestBed.configureTestingModule({
			imports: [DatasetSubmitComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				{provide: GitHubAuthService, useValue: githubAuth},
				{provide: RepositoryCredentialsService, useValue: repoCreds},
				{provide: PublisherService, useValue: publisherService},
				{provide: DatasetJsonService, useValue: datasetJson},
				{provide: FormCacheService, useValue: formCache},
				{provide: ObNotificationService, useValue: notification},
				{provide: TranslateService, useValue: stubTranslateService()}
			]
		})
			.overrideComponent(DatasetSubmitComponent, {set: {template: '<div></div>', imports: []}})
			.compileComponents();

		fixture = TestBed.createComponent(DatasetSubmitComponent);
		component = fixture.componentInstance;
		Object.assign(component, extra);
		return component;
	};

	beforeEach(() => {
		githubAuth = {
			isAuthenticated: jest.fn().mockReturnValue(true),
			commitFileToRepository: jest.fn().mockReturnValue(of({htmlUrl: 'https://github.com/x'}))
		};
		repoCreds = {
			getSelectedRepository: jest.fn().mockReturnValue('blw-ofag-ufag/metadata'),
			hasValidCredentials: jest.fn().mockReturnValue(true)
		};
		publisherService = {getPublishers: jest.fn().mockReturnValue([publisher])};
		datasetJson = {
			generateDatasetJson: jest.fn().mockReturnValue(generatedJson),
			formatJsonForDisplay: jest.fn().mockReturnValue('{"dct:identifier":"my-dataset"}'),
			generateFilePath: jest.fn().mockReturnValue('datasets/my-dataset.json'),
			createJsonBlob: jest.fn().mockReturnValue(new Blob(['{}']))
		};
		formCache = {clearFormData: jest.fn()};
		notification = {success: jest.fn(), error: jest.fn(), warning: jest.fn()};
	});

	it('should create', async () => {
		await setup();
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('initializes authentication and generates JSON on init', async () => {
		await setup({formData: {title: 'x'}});
		fixture.detectChanges();

		expect(component.selectedRepository).toBe('blw-ofag-ufag/metadata');
		expect(component.isAuthenticated).toBe(true);
		expect(component.selectedPublisher).toEqual(publisher);
		expect(datasetJson.generateDatasetJson).toHaveBeenCalledWith({title: 'x'});
		expect(component.generatedJson).toBe(generatedJson);
		expect(component.formattedJson).toBe('{"dct:identifier":"my-dataset"}');
		expect(component.filePath).toBe('datasets/my-dataset.json');
	});

	it('does not generate JSON when form data is empty', async () => {
		await setup({formData: {}});
		fixture.detectChanges();
		expect(datasetJson.generateDatasetJson).not.toHaveBeenCalled();
		expect(component.generatedJson).toBeNull();
	});

	describe('commitDirectlyToGitHub', () => {
		it('commits to the repository and clears the cache on success', async () => {
			await setup({formData: {title: 'x'}, datasetId: 'my-dataset'});
			fixture.detectChanges();

			component.commitDirectlyToGitHub();

			expect(githubAuth.commitFileToRepository).toHaveBeenCalledWith(
				'blw-ofag-ufag/metadata',
				'drafts',
				'datasets/my-dataset.json',
				'{"dct:identifier":"my-dataset"}',
				'Create dataset my-dataset',
				false
			);
			expect(component.commitSuccess).toBe(true);
			expect(component.isCommitting).toBe(false);
			expect(formCache.clearFormData).toHaveBeenCalledWith('my-dataset');
			expect(notification.success).toHaveBeenCalled();
		});

		it('uses an Update message in edit mode', async () => {
			await setup({formData: {title: 'x'}, datasetId: 'my-dataset', isEditMode: true});
			fixture.detectChanges();

			component.commitDirectlyToGitHub();

			expect(githubAuth.commitFileToRepository).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.anything(),
				expect.anything(),
				'Update dataset my-dataset',
				true
			);
		});

		it('records an error and notifies when the commit fails', async () => {
			githubAuth.commitFileToRepository.mockReturnValue(throwError(() => ({message: 'PERMISSION_DENIED'})));
			jest.spyOn(console, 'error').mockImplementation(() => {});
			await setup({formData: {title: 'x'}, datasetId: 'my-dataset'});
			fixture.detectChanges();

			component.commitDirectlyToGitHub();

			expect(component.isCommitting).toBe(false);
			expect(component.commitError).toBe('PERMISSION_DENIED');
			expect(notification.error).toHaveBeenCalledWith(expect.objectContaining({message: 'You do not have permission to write to this repository.'}));
		});

		it('warns and opens auth when not authenticated', async () => {
			repoCreds.hasValidCredentials.mockReturnValue(false);
			await setup({formData: {title: 'x'}, datasetId: 'my-dataset'});
			fixture.detectChanges();
			const openSpy = jest.spyOn(window, 'open').mockReturnValue(null);

			component.commitDirectlyToGitHub();

			expect(notification.warning).toHaveBeenCalled();
			expect(githubAuth.commitFileToRepository).not.toHaveBeenCalled();
			expect(openSpy).toHaveBeenCalled();
			openSpy.mockRestore();
		});
	});

	it('copyJsonToClipboard writes the formatted JSON and notifies', async () => {
		await setup({formData: {title: 'x'}});
		fixture.detectChanges();
		const writeText = jest.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {clipboard: {writeText}});

		component.copyJsonToClipboard();
		await Promise.resolve();

		expect(writeText).toHaveBeenCalledWith('{"dct:identifier":"my-dataset"}');
		await Promise.resolve();
		expect(notification.success).toHaveBeenCalled();
	});

	it('downloadJson creates a blob via the service', async () => {
		await setup({formData: {title: 'x'}, datasetId: 'my-dataset'});
		fixture.detectChanges();
		(window.URL as any).createObjectURL = jest.fn().mockReturnValue('blob:x');
		(window.URL as any).revokeObjectURL = jest.fn();

		component.downloadJson();

		expect(datasetJson.createJsonBlob).toHaveBeenCalledWith(generatedJson);
	});

	it('openInGitHub opens the generated url', async () => {
		githubAuth.generateCreateFileUrlForRepository = jest.fn().mockReturnValue('https://github.com/new');
		await setup({formData: {title: 'x'}, datasetId: 'my-dataset'});
		fixture.detectChanges();
		const openSpy = jest.spyOn(window, 'open').mockReturnValue(null);

		component.openInGitHub();

		expect(githubAuth.generateCreateFileUrlForRepository).toHaveBeenCalled();
		expect(openSpy).toHaveBeenCalledWith('https://github.com/new', '_blank');
		openSpy.mockRestore();
	});
});
