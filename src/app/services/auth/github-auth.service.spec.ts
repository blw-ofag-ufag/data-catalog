import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {GitHubAuthService, GitHubCredentials} from './github-auth.service';
import {RepositoryCredentialsService} from './repository-credentials.service';

const API = 'https://api.github.com';
const REPO = 'blw-ofag-ufag/metadata';
const creds: GitHubCredentials = {username: 'octocat', token: 'ghp_test'};

describe('GitHubAuthService', () => {
	let service: GitHubAuthService;
	let httpMock: HttpTestingController;
	let repoCreds: RepositoryCredentialsService;

	beforeEach(() => {
		sessionStorage.clear();
		TestBed.configureTestingModule({
			providers: [GitHubAuthService, RepositoryCredentialsService, provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(GitHubAuthService);
		httpMock = TestBed.inject(HttpTestingController);
		repoCreds = TestBed.inject(RepositoryCredentialsService);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('validateCredentials', () => {
		it('succeeds when the token is valid and the repo grants write access', done => {
			const emitted: (GitHubCredentials | null)[] = [];
			service.credentials$.subscribe(value => emitted.push(value));

			service.validateCredentials(creds).subscribe({
				next: user => {
					expect(user.login).toBe('octocat');
					// Stored as valid in the credentials service.
					expect(repoCreds.hasValidCredentials(REPO)).toBe(true);
					// Legacy BehaviorSubject emits the credentials.
					expect(emitted[emitted.length - 1]).toEqual(creds);
					done();
				},
				error: done
			});

			httpMock.expectOne(`${API}/user`).flush({login: 'octocat', name: 'Octo', email: 'o@x.io'});
			httpMock.expectOne(`${API}/repos/${REPO}`).flush({permissions: {push: true}});
		});

		it('fails with INVALID_TOKEN on a 401 from /user and marks credentials invalid', done => {
			service.validateCredentials(creds).subscribe({
				next: () => done.fail('expected an error'),
				error: err => {
					expect(err.message).toBe('INVALID_TOKEN');
					expect(repoCreds.hasValidCredentials(REPO)).toBe(false);
					expect(repoCreds.getCredentials(REPO)?.isValid).toBe(false);
					done();
				}
			});

			httpMock.expectOne(`${API}/user`).flush({message: 'Bad credentials'}, {status: 401, statusText: 'Unauthorized'});
		});

		it('fails with USERNAME_MISMATCH when the token owner differs', done => {
			service.validateCredentials(creds).subscribe({
				next: () => done.fail('expected an error'),
				error: err => {
					expect(err.message).toBe('USERNAME_MISMATCH');
					done();
				}
			});

			httpMock.expectOne(`${API}/user`).flush({login: 'someone-else', name: 'X', email: 'x@x.io'});
		});

		it('fails when the repository denies write permission', done => {
			service.validateCredentials(creds).subscribe({
				next: () => done.fail('expected an error'),
				error: err => {
					expect(err.message).toBe('NO_WRITE_PERMISSION');
					expect(repoCreds.hasValidCredentials(REPO)).toBe(false);
					done();
				}
			});

			httpMock.expectOne(`${API}/user`).flush({login: 'octocat', name: 'Octo', email: 'o@x.io'});
			httpMock.expectOne(`${API}/repos/${REPO}`).flush({permissions: {push: false}});
		});

		it('maps a 404 on the repo to REPO_NOT_FOUND', done => {
			service.validateCredentials(creds).subscribe({
				next: () => done.fail('expected an error'),
				error: err => {
					expect(err.message).toBe('REPO_NOT_FOUND');
					done();
				}
			});

			httpMock.expectOne(`${API}/user`).flush({login: 'octocat', name: 'Octo', email: 'o@x.io'});
			httpMock.expectOne(`${API}/repos/${REPO}`).flush({}, {status: 404, statusText: 'Not Found'});
		});
	});

	describe('credential state', () => {
		it('getCredentials reflects the BehaviorSubject and logout clears it', done => {
			service.validateCredentials(creds).subscribe({
				next: () => {
					expect(service.getCredentials()).toEqual(creds);
					service.logout();
					expect(service.getCredentials()).toBeNull();
					done();
				},
				error: done
			});

			httpMock.expectOne(`${API}/user`).flush({login: 'octocat', name: 'Octo', email: 'o@x.io'});
			httpMock.expectOne(`${API}/repos/${REPO}`).flush({permissions: {push: true}});
		});

		it('isAuthenticatedForRepository delegates to the credentials service', done => {
			service.validateCredentials(creds).subscribe({
				next: () => {
					expect(service.isAuthenticatedForRepository(REPO)).toBe(true);
					expect(service.getCredentialsForRepository(REPO)).toEqual(creds);
					done();
				},
				error: done
			});

			httpMock.expectOne(`${API}/user`).flush({login: 'octocat', name: 'Octo', email: 'o@x.io'});
			httpMock.expectOne(`${API}/repos/${REPO}`).flush({permissions: {push: true}});
		});
	});

	describe('url generation helpers', () => {
		it('builds a create-file url with encoded content', () => {
			const url = service.generateCreateFileUrl('data/x.json', '{"a":1}');
			expect(url).toContain(`https://github.com/${REPO}/new/main`);
			expect(url).toContain('filename=data/x.json');
			expect(url).toContain(encodeURIComponent('{"a":1}'));
		});

		it('builds an edit-file url without content', () => {
			const url = service.generateEditFileUrl('data/x.json');
			expect(url).toBe(`https://github.com/${REPO}/edit/main/data/x.json`);
		});
	});
});
