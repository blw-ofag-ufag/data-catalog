import {Injectable} from '@angular/core';
import * as publisherData from '../../codegen/publishers.json';
import {Publisher} from '../../models/publisher.model';
import {DataProductType, DEFAULT_DATA_PRODUCT_TYPE, DATA_PRODUCT_TYPE_REGISTRY} from '../../models/data-product-type';

@Injectable({
	providedIn: 'root'
})
export class PublisherService {
	private readonly publishers: Publisher[];

	constructor() {
		this.publishers = (publisherData as any).default as Publisher[];
		for (const publisher of this.publishers) {
			const raw = (path: string) => `https://raw.githubusercontent.com/${publisher.githubRepo}/refs/heads/${publisher.readBranch}/${path}`;
			// Path segment is per product type (default 'dataset'); only 'datasets' exists today (#221).
			const segment = (type: DataProductType = DEFAULT_DATA_PRODUCT_TYPE) => DATA_PRODUCT_TYPE_REGISTRY[type].segment;
			publisher.getProcessedUrl = (type: DataProductType = DEFAULT_DATA_PRODUCT_TYPE) => raw(`data/processed/${segment(type)}.json`);
			publisher.getKeywordUrl = () => raw('data/schemas/keywords.json');
			publisher.getDetailUrl = (id: string, type: DataProductType = DEFAULT_DATA_PRODUCT_TYPE) => raw(`data/raw/${segment(type)}/${id}.json`);
		}
	}

	getPublishers(): Publisher[] {
		return this.publishers;
	}
}
