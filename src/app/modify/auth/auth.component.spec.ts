import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, provideRouter, Router} from '@angular/router';
import {of, throwError} from 'rxjs';
import {ObNotificationService} from '@oblique/oblique';
import {AuthComponent} from './auth.component';
import {GitHubAuthService} from '../../services/auth/github-auth.service';
import {RepositoryCredentialsService} from '../../services/auth/repository-credentials.service';
import {PublisherService} from '../../services/api/publisher.service';
import {provideTranslateTesting} from '../../../../tests/helpers/translate-testing';

describe('AuthComponent', () => {
	let component: AuthComponent;
	let fixture: ComponentFixture<AuthComponent>;

	const publishers = [
		{id: 'BLW', shortId: 'BLW', githubRepo: 'blw-ofag-ufag/metadata', readBranch: 'main', writeBranch: 'drafts'},
		{id: 'BLV', shortId: 'BLV', githubRepo: 'blv-osav-usav/metadata', readBranch: 'main', writeBranch: 'drafts'}
	];

	let githubAuth: any;
	let repoCreds: any;
	let publisherService: any;
	let notification: any;
	let router: Router;

	beforeEach(async () => {
		githubAuth = {
			validateCredentialsForRepository: jest.fn().mockReturnValue(of({login: 'octocat'}))
		};
		repoCreds = {setSelectedRepository: jest.fn()};
		publisherService = {getPublishers: jest.fn().mockReturnValue(publishers)};
		notification = {success: jest.fn(), error: jest.fn()};

		await TestBed.configureTestingModule({
			imports: [AuthComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				provideRouter([]),
				{provide: ActivatedRoute, useValue: {queryParams: of({})}},
				{provide: GitHubAuthService, useValue: githubAuth},
				{provide: RepositoryCredentialsService, useValue: repoCreds},
				{provide: PublisherService, useValue: publisherService},
				{provide: ObNotificationService, useValue: notification}
			]
		})
			// Drop the heavy Oblique-laden template; we test component logic.
			.overrideComponent(AuthComponent, {set: {template: '<form></form>', imports: []}})
			.compileComponents();

		fixture = TestBed.createComponent(AuthComponent);
		component = fixture.componentInstance;
		router = TestBed.inject(Router);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('seeds the form with the first publisher repository', () => {
		expect(component.authForm.get('repository')?.value).toBe('blw-ofag-ufag/metadata');
		expect(component.selectedRepository).toBe('blw-ofag-ufag/metadata');
	});

	it('does not submit when the form is invalid', () => {
		component.onSubmit();
		expect(githubAuth.validateCredentialsForRepository).not.toHaveBeenCalled();
		expect(component.usernameControl?.touched).toBe(true);
		expect(component.tokenControl?.touched).toBe(true);
	});

	it('validates credentials and navigates on successful submit', () => {
		const navSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
		component.authForm.patchValue({username: 'octocat', token: 'a-valid-token-123'});

		component.onSubmit();

		expect(githubAuth.validateCredentialsForRepository).toHaveBeenCalledWith(
			{username: 'octocat', token: 'a-valid-token-123'},
			'blw-ofag-ufag/metadata'
		);
		expect(repoCreds.setSelectedRepository).toHaveBeenCalledWith('blw-ofag-ufag/metadata');
		expect(notification.success).toHaveBeenCalled();
		expect(navSpy).toHaveBeenCalledWith('/modify');
		expect(component.isLoading).toBe(false);
	});

	it('maps error codes to messages and notifies on failed submit', () => {
		githubAuth.validateCredentialsForRepository.mockReturnValue(throwError(() => ({message: 'INVALID_TOKEN'})));
		component.authForm.patchValue({username: 'octocat', token: 'a-valid-token-123'});

		component.onSubmit();

		expect(component.isLoading).toBe(false);
		expect(component.errorMessage).toBe('modify.auth.errors.invalidToken');
		expect(notification.error).toHaveBeenCalled();
	});

	describe('repository selection', () => {
		it('switches to custom repository mode', () => {
			component.authForm.patchValue({repository: 'custom'});
			component.onRepositoryChange();
			expect(component.customRepositoryMode).toBe(true);
			expect(component.authForm.get('customRepository')?.hasError('required')).toBe(true);
		});

		it('updates selectedRepository for a concrete repository', () => {
			component.authForm.patchValue({repository: 'blv-osav-usav/metadata'});
			component.onRepositoryChange();
			expect(component.customRepositoryMode).toBe(false);
			expect(component.selectedRepository).toBe('blv-osav-usav/metadata');
		});

		it('getSelectedRepository returns the custom value in custom mode', () => {
			component.customRepositoryMode = true;
			component.authForm.patchValue({customRepository: ' owner/repo '});
			expect(component.getSelectedRepository()).toBe('owner/repo');
		});
	});

	it('getPublisherByRepository finds a matching publisher', () => {
		expect(component.getPublisherByRepository('blv-osav-usav/metadata')?.shortId).toBe('BLV');
		expect(component.getPublisherByRepository('nope/repo')).toBeUndefined();
	});

	it('onCancel navigates to home', () => {
		const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
		component.onCancel();
		expect(navSpy).toHaveBeenCalledWith(['/']);
	});
});
