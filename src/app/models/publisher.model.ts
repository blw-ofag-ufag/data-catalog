export interface Publisher {
	id: string; // e.g. 'BLW-OFAG-UFAG-FOAG' | 'BLV-OSAV-USAV-FSVO'
	shortId: string; // e.g. 'BLW', 'BLV'
	githubRepo: string; // e.g. 'blw-ofag-ufag/metadata'
	readBranch: string; // e.g. 'main'
	writeBranch: string; // e.g. 'drafts'
	getProcessedUrl: () => string;
	getDetailUrl: (id: string) => string;

	getKeywordUrl: () => string;
	getDimensionUrl: () => string;
}
