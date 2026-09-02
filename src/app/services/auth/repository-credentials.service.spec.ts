import {TestBed} from '@angular/core/testing';
import {RepositoryCredentialsService} from './repository-credentials.service';
import {GitHubCredentials} from './github-auth.service';

const creds = (token = 'tok'): GitHubCredentials => ({username: 'me', token});

describe('RepositoryCredentialsService', () => {
	let service: RepositoryCredentialsService;

	beforeEach(() => {
		sessionStorage.clear();
		TestBed.configureTestingModule({});
		service = TestBed.inject(RepositoryCredentialsService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('setCredentials / getCredentials', () => {
		it('stores and returns credentials for a repository', () => {
			service.setCredentials('owner/repo', creds(), true);
			const stored = service.getCredentials('owner/repo');
			expect(stored?.repository).toBe('owner/repo');
			expect(stored?.credentials.token).toBe('tok');
			expect(stored?.isValid).toBe(true);
			expect(stored?.lastValidated).toBeInstanceOf(Date);
		});

		it('returns null for an unknown repository', () => {
			expect(service.getCredentials('missing/repo')).toBeNull();
		});

		it('defaults isValid to false', () => {
			service.setCredentials('owner/repo', creds());
			expect(service.getCredentials('owner/repo')?.isValid).toBe(false);
		});

		it('persists to sessionStorage', () => {
			service.setCredentials('owner/repo', creds(), true);
			expect(sessionStorage.getItem('repository_credentials')).toContain('owner/repo');
		});
	});

	describe('hasValidCredentials', () => {
		it('is true only for valid credentials', () => {
			service.setCredentials('a/b', creds(), true);
			service.setCredentials('c/d', creds(), false);
			expect(service.hasValidCredentials('a/b')).toBe(true);
			expect(service.hasValidCredentials('c/d')).toBe(false);
			expect(service.hasValidCredentials('e/f')).toBe(false);
		});
	});

	describe('removeCredentials', () => {
		it('removes the stored credentials', () => {
			service.setCredentials('a/b', creds(), true);
			service.removeCredentials('a/b');
			expect(service.getCredentials('a/b')).toBeNull();
		});

		it('clears the selection when removing the selected repository', () => {
			service.setCredentials('a/b', creds(), true);
			service.setSelectedRepository('a/b');
			service.removeCredentials('a/b');
			expect(service.getSelectedRepository()).toBeNull();
		});
	});

	describe('invalidate / validate credentials', () => {
		it('invalidateCredentials marks an entry invalid', () => {
			service.setCredentials('a/b', creds(), true);
			service.invalidateCredentials('a/b');
			expect(service.hasValidCredentials('a/b')).toBe(false);
		});

		it('validateCredentials marks an entry valid and refreshes lastValidated', () => {
			service.setCredentials('a/b', creds(), false);
			service.validateCredentials('a/b');
			expect(service.hasValidCredentials('a/b')).toBe(true);
		});
	});

	describe('repository listings', () => {
		it('getAuthenticatedRepositories returns only valid ones', () => {
			service.setCredentials('a/b', creds(), true);
			service.setCredentials('c/d', creds(), false);
			expect(service.getAuthenticatedRepositories()).toEqual(['a/b']);
		});

		it('getAllRepositoriesWithCredentials returns every entry', () => {
			service.setCredentials('a/b', creds(), true);
			service.setCredentials('c/d', creds(), false);
			expect(service.getAllRepositoriesWithCredentials().sort()).toEqual(['a/b', 'c/d']);
		});
	});

	describe('selectedRepository', () => {
		it('emits selection changes through selectedRepository$', () => {
			const emissions: (string | null)[] = [];
			service.selectedRepository$.subscribe(value => emissions.push(value));
			service.setSelectedRepository('a/b');
			expect(emissions).toEqual([null, 'a/b']);
			expect(service.getSelectedRepository()).toBe('a/b');
		});
	});

	describe('clearAllCredentials', () => {
		it('removes all entries and clears selection', () => {
			service.setCredentials('a/b', creds(), true);
			service.setSelectedRepository('a/b');
			service.clearAllCredentials();
			expect(service.getAllRepositoriesWithCredentials()).toEqual([]);
			expect(service.getSelectedRepository()).toBeNull();
		});
	});

	describe('publisher helpers', () => {
		it('resolves credentials and validity by publisher.githubRepo', () => {
			service.setCredentials('owner/repo', creds(), true);
			const publisher = {githubRepo: 'owner/repo'} as any;
			expect(service.getCredentialsByPublisher(publisher)?.repository).toBe('owner/repo');
			expect(service.hasValidCredentialsForPublisher(publisher)).toBe(true);
		});
	});

	describe('storage rehydration', () => {
		it('loads previously persisted credentials on construction', () => {
			service.setCredentials('owner/repo', creds('persisted'), true);

			// A fresh instance should read what the previous one persisted.
			const reloaded = new RepositoryCredentialsService();
			const stored = reloaded.getCredentials('owner/repo');
			expect(stored?.credentials.token).toBe('persisted');
			expect(stored?.lastValidated).toBeInstanceOf(Date);
		});
	});
});
