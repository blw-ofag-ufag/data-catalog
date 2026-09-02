import {TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {Observable, of} from 'rxjs';

/**
 * A TranslateLoader that returns an empty catalog so the `translate` pipe simply
 * echoes the key back. Lets specs assert on i18n keys without wiring HttpBackend.
 */
export class FakeTranslateLoader implements TranslateLoader {
	getTranslation(): Observable<Record<string, string>> {
		return of({});
	}
}

/** Drop-in TranslateModule for TestBed imports (no HTTP, keys echo through). */
export function provideTranslateTesting(): ReturnType<typeof TranslateModule.forRoot> {
	return TranslateModule.forRoot({
		loader: {provide: TranslateLoader, useClass: FakeTranslateLoader}
	});
}
