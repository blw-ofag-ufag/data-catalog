/**
 * Helpers for stubbing the global `fetch` used by the data layer
 * (multi-dataset-service, keyword.service, i14y-theme.service, github-auth.service).
 */

export interface FetchMockOptions {
	ok?: boolean;
	status?: number;
}

/** Build a minimal Response-like object backed by `payload`. */
export function jsonResponse(payload: unknown, {ok = true, status = 200}: FetchMockOptions = {}): Response {
	return {
		ok,
		status,
		json: async () => payload,
		text: async () => (typeof payload === 'string' ? payload : JSON.stringify(payload)),
		headers: new Map() as unknown as Headers
	} as unknown as Response;
}

/** Spy on global.fetch returning a single JSON payload for every call. */
export function mockFetchJson(payload: unknown, options?: FetchMockOptions): jest.SpyInstance {
	return jest.spyOn(globalThis, 'fetch' as never).mockResolvedValue(jsonResponse(payload, options) as never);
}

/** Spy on global.fetch resolving the matching entry by URL substring. */
export function mockFetchByUrl(routes: Array<{match: string; payload: unknown; options?: FetchMockOptions}>): jest.SpyInstance {
	return jest.spyOn(globalThis, 'fetch' as never).mockImplementation(((input: RequestInfo | URL) => {
		const url = typeof input === 'string' ? input : input.toString();
		const route = routes.find(r => url.includes(r.match));
		if (!route) {
			return Promise.resolve(jsonResponse({}, {ok: false, status: 404}));
		}
		return Promise.resolve(jsonResponse(route.payload, route.options));
	}) as never);
}

/** Restore all fetch spies (call in afterEach). */
export function restoreFetch(): void {
	jest.restoreAllMocks();
}
