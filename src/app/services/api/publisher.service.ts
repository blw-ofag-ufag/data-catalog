import {Injectable} from '@angular/core';
import * as publisherData from '../../codegen/publishers.json';
import {Publisher} from '../../models/publisher.model';

@Injectable({
	providedIn: 'root'
})
export class PublisherService {
	private readonly publishers: Publisher[];

	constructor() {
		this.publishers = (publisherData as any).default as Publisher[];
		for (const publisher of this.publishers) {
			publisher.getProcessedUrl = () => `https://raw.githubusercontent.com/${publisher.githubRepo}/refs/heads/${publisher.branch}/data/processed/datasets.json`;
			publisher.getKeywordUrl = () => `https://raw.githubusercontent.com/${publisher.githubRepo}/refs/heads/${publisher.branch}/data/processed/keywords.json`;
			publisher.getDetailUrl = id => `https://raw.githubusercontent.com/${publisher.githubRepo}/refs/heads/${publisher.branch}/data/raw/datasets/${id}.json`;
		}
	}

	getPublishers(): Publisher[] {
		return this.publishers;
	}
}
