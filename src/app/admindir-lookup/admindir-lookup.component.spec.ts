import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AdmindirLookupComponent} from './admindir-lookup.component';
import {provideTranslateTesting} from '../../../tests/helpers/translate-testing';
import {mockFetchJson, restoreFetch} from '../../../tests/helpers/fetch-mock';

describe('AdmindirLookupComponent', () => {
	let component: AdmindirLookupComponent;
	let fixture: ComponentFixture<AdmindirLookupComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AdmindirLookupComponent, NoopAnimationsModule, provideTranslateTesting()]
		}).compileComponents();

		fixture = TestBed.createComponent(AdmindirLookupComponent);
		component = fixture.componentInstance;
	});

	afterEach(() => restoreFetch());

	it('should create', () => {
		component.person = {'schema:name': 'Jane Doe', 'schema:email': 'jane@example.com'};
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('renders a mailto link with name and email when no prov:agent is present', () => {
		component.person = {'schema:name': 'Jane Doe', 'schema:email': 'jane@example.com'};
		fixture.detectChanges();
		const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
		expect(link.getAttribute('href')).toBe('mailto:jane@example.com');
		expect(link.textContent).toContain('Jane Doe');
	});

	it('renders the admindir link and looks the agent up when prov:agent is present', async () => {
		const fetchMock = mockFetchJson({
			givenName: 'John',
			surname: 'Smith',
			contactInformation: {email: 'john.smith@admin.ch'}
		});
		component.person = {'prov:agent': '12345'};
		fixture.detectChanges();

		// ngOnInit fires the lookup against the admindir API.
		expect(fetchMock).toHaveBeenCalledWith('https://admindir.verzeichnisse.admin.ch/api/person/12345');

		// flush the promise chain.
		// flush the full microtask queue (fetch -> json() -> then), robust across jest versions.
		await new Promise(resolve => setTimeout(resolve));

		expect(component.person['schema:name']).toBe('John Smith');
		expect(component.person['schema:email']).toBe('john.smith@admin.ch');
		expect(component.adminDirError).toBe(false);

		const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
		expect(link.getAttribute('href')).toContain('https://admindir.verzeichnisse.admin.ch/person/12345');
	});

	it('sets adminDirError when the lookup fails', async () => {
		mockFetchJson({}, {ok: false, status: 500});
		jest.spyOn(console, 'error').mockImplementation(() => {});
		component.person = {'prov:agent': '999'};
		fixture.detectChanges();

		// flush the full microtask queue (fetch -> json() -> then), robust across jest versions.
		await new Promise(resolve => setTimeout(resolve));

		expect(component.adminDirError).toBe(true);
	});
});
