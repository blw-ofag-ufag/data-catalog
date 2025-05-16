export interface Publisher {
	id: string; // e.g. 'BLW-OFAG-UFAG-FOAG' | 'BLV-OSAV-USAV-FSVO'
	shortId: string; // e.g. 'BLW', 'BLV'
	githubRepo: string; // e.g. 'blw-ofag-ufag/metadata'
	branch: string; // e.g. 'main'
	getProcessedUrl: () => string;
	getDetailUrl: (id: string) => string;
}
