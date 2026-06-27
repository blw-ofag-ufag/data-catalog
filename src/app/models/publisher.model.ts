import {DataProductType} from './data-product-type';

export interface Publisher {
	id: string; // e.g. 'BLW-OFAG-UFAG-FOAG' | 'BLV-OSAV-USAV-FSVO'
	shortId: string; // e.g. 'BLW', 'BLV'
	githubRepo: string; // e.g. 'blw-ofag-ufag/metadata'
	readBranch: string; // e.g. 'main'
	writeBranch: string; // e.g. 'drafts'
	// Path builders are type-parameterized; type defaults to 'dataset' for back-compat (#221).
	getProcessedUrl: (type?: DataProductType) => string;
	getDetailUrl: (id: string, type?: DataProductType) => string;

	getKeywordUrl: () => string;
}
