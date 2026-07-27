const mock = (): Partial<Storage> => {
	let storage: Record<string, string> = {};
	return {
		getItem: (key: string) => (key in storage ? storage[key] : null),
		setItem: (key: string, value: string) => (storage[key] = value || ''),
		removeItem: (key: string) => delete storage[key],
		clear: () => (storage = {})
	};
};

/* eslint-disable @typescript-eslint/no-empty-function */
console.error = jest.fn().mockImplementation(() => {});
console.warn = jest.fn().mockImplementation(() => {});
console.info = jest.fn().mockImplementation(() => {});
/* eslint-enable @typescript-eslint/no-empty-function */

global.ResizeObserver = jest.fn().mockImplementation(() => ({
	observe: jest.fn(),
	unobserve: jest.fn(),
	disconnect: jest.fn()
}));

// jsdom ships no `fetch`, but several services call it directly rather than through
// HttpClient — DimensionService loads the dimension glossary as soon as DatasetService is
// constructed (#92), and detail loads bypass Angular's zone on purpose (#237). Without a
// default stub, merely instantiating those services in a TestBed throws. Specs that care
// about the payload override this with jest.spyOn(global, 'fetch').
global.fetch = jest.fn().mockResolvedValue({
	ok: true,
	status: 200,
	json: () => Promise.resolve({}),
	text: () => Promise.resolve('')
}) as unknown as typeof fetch;

Object.defineProperty(window, 'localStorage', {value: mock()});
Object.defineProperty(window, 'sessionStorage', {value: mock()});
Object.defineProperty(window, 'scrollIntoView', {value: mock()});
Object.defineProperty(window, 'getComputedStyle', {
	value: () => ['-webkit-appearance']
});
// eslint-disable-next-line @typescript-eslint/no-empty-function
(window as any).HTMLElement.prototype.scrollIntoView = function () {};
