import {DatasetDescription, DatasetIdentifier, DatasetSchema, DatasetTitle} from '../models/schemas/dataset';
// usage
// const metadataElements = filterAndNormalizeMetadata(dataset);

export interface NormalizedMetadataElement {
	label: string;
	data: any;
}

export function filterAndNormalizeMetadata(dataset: DatasetSchema): NormalizedMetadataElement[] {
	const metadata = Object.fromEntries(Object.entries(dataset).filter(([key]) => isKeyMetadata(key)));

	const normalizedMetadata = Object.entries(metadata).map(([key, value]) => ({
		label: key,
		data: value
	}))
		.filter(x => x.data != null) as NormalizedMetadataElement[];
	return normalizedMetadata;
}

export function isKeyMetadata(key: string): boolean {
	return !(
		key.startsWith('schema:image') ||
		key.startsWith('dct:identifier') ||
		key.startsWith('dct:title') ||
		key.startsWith('dct:description') ||
		key.startsWith('dct:publisher') ||
		key.startsWith('prov:qualifiedAttribution') ||
		key.startsWith('dcat:distribution') ||
		key.startsWith('schemaViolations') ||
		key.startsWith('schemaViolationMessages') ||
		key.startsWith('bv:externalCatalogs')
	);
}

export function isKeyInDistributionPropertyList(key: string): boolean {
	return !(
		key.startsWith('dct:title') ||
		key.startsWith('dct:description')
	);
}
