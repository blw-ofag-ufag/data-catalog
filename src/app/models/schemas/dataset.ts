/**
 * URL for an image to be displayed in the data catalog. Choose an image that is related to the dataset's content.
 */
export type ImageURL = string | null;
/**
 * Unique identifier for the dataset. If left empty, it is automatically assigned.
 */
export type DatasetIdentifier = string;
export type Deutsch = string;
export type Francais = string;
export type Italiano = string;
export type English = string;
/**
 * Defines the accessibility of the dataset (e.g., public, internal, etc.). You can find more information here: <a href='https://www.dcat-ap.ch/releases/3.0_workingdraft/dcat-ap-ch_3.0_workingdraft.html#bib-vocab-eu-access-right'>DCAT-AP CH 3.0 – Access Rights Vocabulary</a>.
 */
export const AccessRights = ['', 'CONFIDENTIAL', 'NON_PUBLIC', 'PUBLIC', 'RESTRICTED', 'SENSITIVE'];
export type AccessRight = (typeof AccessRights)[number];
/**
 * Federal Office responsible for the data object
 */
export const Publishers = ['', 'BLW-OFAG-UFAG-FOAG', 'BLV-OSAV-USAV-FSVO'];
export type Publisher = (typeof Publishers)[number];
export type ContactPointName = string;
export type ContactPointEmailAddress = string;
/**
 * Date when the dataset was formally issued for the first time. If unknown, you may select the date of the first publication of this metadata.
 */
export type IssuedDate = string | null;
/**
 * This property indicates how long it is planned to keep the Dataset available. You can find the available values here: <a href='http://publications.europa.eu/resource/authority/planned-availability'>Planned availability</a>.
 */
export const DatasetAvailabilities = ['', 'AVAILABLE', 'EXPERIMENTAL', 'STABLE', 'TEMPORARY'] as const;

export type DatasetAvailability = (typeof DatasetAvailabilities)[number];
/**
 * Keywords describing the dataset.
 */
export type Keywords = string[] | null;
/**
 * Frequency with which dataset is updated (e.g., 'Annual'). More information here: <a href='https://www.dcat-ap.ch/releases/3.0_workingdraft/dcat-ap-ch_3.0_workingdraft.html#bib-vocab-eu-frequency'>Available frequencies</a>.
 */
export const AccrualPeriocicites = [
	'',
	'OTHER',
	'HOURLY',
	'UNKNOWN',
	'QUARTERLY',
	'NEVER',
	'MONTHLY',
	'ANNUAL',
	'DAILY',
	'AS_NEEDED',
	'WEEKLY',
	'IRREG',
	'CONT'
];
export type AccrualPeriodicity = (typeof AccrualPeriocicites)[number];

/**
 * Last modification date of the data in the dataset.
 */
export type LastModificationDate = string | null;
/**
 * The version indicator following a Major.Minor.Patch schema (example: 2.1.4).
 */
export type Version = string;
/**
 * List of affiliated people, their contact address and respective roles.
 */
export type AffiliatedPersons = [
	{
		'prov:agent': AdminDirPersonID;
		'schema:name'?: Name;
		'schema:email'?: Email;
		'dcat:hadRole': Role;
		[k: string]: unknown;
	},
	...{
		'prov:agent': AdminDirPersonID;
		'schema:name'?: Name;
		'schema:email'?: Email;
		'dcat:hadRole': Role;
		[k: string]: unknown;
	}[]
];
/**
 * The AdminDir ID is shown as the URL slug of a person's AdminDir page. For example, on the page <https://admindir.verzeichnisse.admin.ch/person/p-2959456>, the AdminDir ID is `p-2959456`.
 */
export type AdminDirPersonID = string;
export type Name = string;
export type Email = string;
/**
 * Role this person has for this dataset.
 */
export type Role = 'businessDataOwner' | 'dataSteward' | 'dataCustodian';
/**
 * Current status of the dataset.
 */
export const Statuses = ['', 'workInProgress', 'validated', 'published', 'deleted', 'archived'];
export type Status = (typeof Statuses)[number];
/**
 * Classification level of the dataset according to the Swiss Informationssicherheitsgesetz, ISG. For information regarding the categorization, consult <a https://www.fedlex.admin.ch/eli/cc/2022/232/de#art_13'>the Swiss Informationssicherheitsgesetz article 13</a>
 */
export const ClassificationLevels = ['', 'none', 'internal', 'confidential', 'secret'];
export type ClassificationLevel = (typeof ClassificationLevels)[number];
/**
 * Categorization regarding the Swiss data protection act. For information regarding the categorization, consult <a href='https://www.fedlex.admin.ch/eli/oc/2022/491/de#art_5'>the Swiss data protection act article 5</a>.
 */
export const CategorizationsDSG = ['', 'none', 'personalData', 'sensitivePersonalData'];
export type CategorizationDSG = (typeof CategorizationsDSG)[number];
/**
 * Specifies the type of data in the dataset (master data, reference data, thematic data or unstructured data).
 */
export const DataTypes = ['', 'primaryThematicData', 'secondaryThematicData', 'referenceData', 'masterData', 'unstructuredData'];
export type DataType = (typeof DataTypes)[number];
/**
 * Indicates if this dataset has archival value and must be sent to the BAR.
 */
export type ArchivalValue = boolean;
/**
 * External catalogs where the data object is published
 */
export type ExternalCatalogs =
	| {
			'dcat:catalog': ReferenceToExternalCatalog;
			'dct:identifier'?: IDInTheExternalCatalog;
	  }[]
	| null;
/**
 * Reference to the external catalogs the data object should be pubished to. Adding a catalog here triggers metadata validation and an automatic push to the listed catalog.
 */
export type ReferenceToExternalCatalog = '' | 'I14Y' | 'opendata.swiss' | 'geocat.ch';
/**
 * This field should be automatically filled at first publication with the ID assigned by the external catalog. It is a hidden field in the edit form.
 */
export type IDInTheExternalCatalog = string;
/**
 * This attribute classifies the dataset into one or more broad thematics. Proper classification allow other users interested in the topic to find the dataset without knowing its name or description. Those are opendata.swiss themes, which are then mapped to EU themes. For the mapping, please consult <a href='https://dcat-ap.ch/vocabulary/themes/20231122.html'>this page</a>.
 */
export const DatasetThemes = [
	'',
	'work',
	'construction',
	'population',
	'education',
	'energy',
	'finances',
	'geography',
	'legislation',
	'health',
	'trade',
	'industry',
	'crime',
	'culture',
	'agriculture',
	'mobility',
	'public-order',
	'politics',
	'prices',
	'territory',
	'social-security',
	'statistical-basis',
	'tourism',
	'administration',
	'national-economy'
];
export type DatasetTheme = (typeof DatasetThemes)[number];
/**
 * Landing page or homepage for the dataset.
 */
export type LandingPage = string | null;
/**
 * Spatial/geographical coverage of the dataset.
 */
export type SpatialCoverage = string;
/**
 * Start date of the temporal coverage for the dataset.
 */
export type StartDate = string | null;
/**
 * End date of the temporal coverage for the dataset.
 */
export type EndDate = string | null;
/**
 * The legislation that mandates or allows the creation or management of the dataset (as URI, e.g. https://www.fedlex.admin.ch/eli/oc/2022/491/de#art_5).
 */
export type ApplicableLegislation = URI[] | null;
export type URI = string | null;
/**
 * Related business process or context.
 */
export type BusinessProcess = string[] | null;
/**
 * Retention period for the dataset. That is, the time that the dataset must legally be available after the end of its active use.
 */
export type RetentionPeriod = number;
/**
 * Indicates in which catalog this dataset is available.
 */
export type Catalog = string;
/**
 * Links to other datasets from which this dataset was derived.
 */
export type DerivedFrom = string[] | null;
/**
 * Identifier for the dataset according to the GeoIV.
 */
export type GeoIdentifier = string;
/**
 * Any related page, document or resource.
 */
export type RelatedResources =
	| {
			alias?: PageAlias;
			uri: URL;
	  }[]
	| null;
/**
 * Alias to be showed in the interface for this link.
 */
export type PageAlias = string;
/**
 * URL for the page, document or resource
 */
export type URL = string | null;
/**
 * Additional comments about the dataset.
 */
export type Comments = string;
/**
 * Indicates when the dataset was abrogated or replaced.
 */
export type Abrogation = string | null;
/**
 * Name of the IT system managing this dataset.
 */
export type ITSystem = string;
/**
 * Reference to the dataset series this dataset is integrated into.
 */
export type InDatasetSeries = string[] | null;
/**
 * ID of datasets replaced by this one
 */
export type Replaces = string[] | null;
/**
 * Distribution info describing how and where to access the dataset. This class describes a specific, final, and ready-to-use format in which a dataset is made available to users. For example, the same data may be available as both a CSV file and an Excel file, each representing a separate distribution of the same dataset. Each distribution must be part of a dataset and should point to a reachable source (e.g. an URL for download). All distributions within a dataset must maintain the same level of timeliness across all channels. This means, for instance, that the 2021 CSV file should be published simultaneously with the Excel file, and vice versa.
 */
export type Distribution =
	| {
			'dct:identifier': DistributionIdentifier;
			'dcat:accessURL': AccessURL;
			'adms:status': Status1;
			'dcatap:availability'?: DistributionAvailability;
			'dct:format': FileFormat;
			'dct:modified': LastModificationDate1;
			'dcat:downloadURL'?: DownloadURL;
			'dct:title'?: DistributionTitle;
			'dct:description'?: DistributionDescription;
			'dct:conformsTo'?: ConformsTo;
			'dct:license'?: License;
			'schema:comment'?: Comments1;
			'dcat:accessService'?: AccessService;
	  }[]
	| null;
/**
 * Identifier for this distribution. If left empty, it will be automatically assigned.
 */
export type DistributionIdentifier = string;
/**
 * URL to a page for accessing this distribution. This must not be a direct download URL but, for example, a link to a webpage containing download links.
 */
export type AccessURL = string;
/**
 * Current status of the distribution.
 */
export type Status1 = '' | 'workInProgress' | 'validated' | 'published' | 'deleted' | 'archived';
/**
 * This property indicates how long it is planned to keep the Distribution available. You can find the available values here: <a href='http://publications.europa.eu/resource/authority/planned-availability'>Planned availability</a>.
 */
export type DistributionAvailability = '' | 'AVAILABLE' | 'EXPERIMENTAL' | 'STABLE' | 'TEMPORARY';
/**
 * File format for this distribution (e.g., CSV, JSON).
 */
export type FileFormat = string;
/**
 * Last modification date of the data in this distribution.
 */
export type LastModificationDate1 = string | null;
/**
 * Direct download URL of the distribution file. This link must directly point to the file.
 */
export type DownloadURL = string | null;
/**
 * Reference to a standard or specification the distribution conforms to.
 */
export type ConformsTo = string;
/**
 * License under which this distribution is released. This is mandatory for opendata.swiss publications.
 */
export type License = '' | 'terms_open' | 'terms_by' | 'terms_ask' | 'terms_by_ask' | 'cc-zero' | 'cc-by/4.0' | 'cc-by-sa/4.0';
/**
 * Additional comments about the distribution.
 */
export type Comments1 = string;
/**
 * Reference to data services used to provide access to the data.
 */
export type AccessService = string[] | null;

/**
 * A JSON schema for a dataset file in the data catalog.
 */
export interface DatasetSchema {
	'schema:image'?: ImageURL;
	'dct:identifier': DatasetIdentifier;
	'dct:title': DatasetTitle;
	'dct:description': DatasetDescription;
	'dct:accessRights': AccessRight;
	'dct:publisher': Publisher;
	'dcat:contactPoint': ContactPoint;
	'dct:issued': IssuedDate;
	'dcatap:availability'?: DatasetAvailability;
	'dcat:keyword'?: Keywords;
	'dct:accrualPeriodicity': AccrualPeriodicity;
	'dct:modified': LastModificationDate;
	'dcat:version'?: Version;
	'prov:qualifiedAttribution': AffiliatedPersons;
	'adms:status': Status;
	'bv:classification': ClassificationLevel;
	'bv:personalData': CategorizationDSG;
	'bv:typeOfData'?: DataType;
	'bv:archivalValue': ArchivalValue;
	'bv:externalCatalogs'?: ExternalCatalogs;
	'dcat:theme'?: DatasetTheme;
	'dcat:landingPage'?: LandingPage;
	'dct:spatial'?: SpatialCoverage;
	'dct:temporal'?: TemporalCoverage;
	'dcatap:applicableLegislation'?: ApplicableLegislation;
	'prov:wasGeneratedBy'?: BusinessProcess;
	'bv:retentionPeriod'?: RetentionPeriod;
	'dcat:catalog'?: Catalog;
	'prov:wasDerivedFrom'?: DerivedFrom;
	'bv:geoIdentifier'?: GeoIdentifier;
	'foaf:page'?: RelatedResources;
	'schema:comment'?: Comments;
	'bv:abrogation'?: Abrogation;
	'bv:itSystem'?: ITSystem;
	'dcat:inSeries'?: InDatasetSeries;
	'dct:replaces'?: Replaces;
	'dcat:distribution'?: Distribution;

	[k: string]: unknown;
}

/**
 * Title of the dataset.
 */
export interface DatasetTitle {
	de: Deutsch;
	fr: Francais;
	it?: Italiano;
	en?: English;

	[k: string]: unknown;
}

/**
 * Description of the dataset. Should go into details about the dataset content and help a non-specialist to understand what is the dataset about.
 */
export interface DatasetDescription {
	de: Deutsch;
	fr: Francais;
	it?: Italiano;
	en?: English;

	[k: string]: unknown;
}

/**
 * Contact information for potential inquiries about the dataset.
 */
export interface ContactPoint {
	'schema:name': ContactPointName;
	'schema:email': ContactPointEmailAddress;

	[k: string]: unknown;
}

/**
 * Temporal coverage of the dataset. For example, the first and last measurement years for a timeseries.
 */
export interface TemporalCoverage {
	'dcat:start_date'?: StartDate;
	'dcat:end_date'?: EndDate;
}

/**
 * Title for the distribution, in multiple languages.
 */
export interface DistributionTitle {
	de: Deutsch;
	fr: Francais;
	it?: Italiano;
	en?: English;

	[k: string]: unknown;
}

/**
 * Description for the distribution, in multiple languages.
 */
export interface DistributionDescription {
	de: Deutsch;
	fr: Francais;
	it?: Italiano;
	en?: English;

	[k: string]: unknown;
}

export const enumTypes = [
	'dct:accessRights',
	'dct:publisher',
	'dcatap:availability',
	'dct:accrualPeriodicity',
	'adms:status',
	'bv:classification',
	'bv:personalData',
	'bv:typeOfData',
	'dcat:keyword',
	'dcat:theme'
];
