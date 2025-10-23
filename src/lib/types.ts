// TypeScript types for Leaflet blocks and AT Protocol structures

export interface LeafletFacetIndex {
	byteStart: number;
	byteEnd: number;
}

export interface LeafletFacetFeature {
	$type: string;
	uri?: string;
}

export interface LeafletFacet {
	index: LeafletFacetIndex;
	features: LeafletFacetFeature[];
}

export interface LeafletTextBlock {
	$type: 'pub.leaflet.blocks.text';
	plaintext: string;
	facets?: LeafletFacet[];
}

export interface LeafletHeaderBlock {
	$type: 'pub.leaflet.blocks.header';
	level: number;
	plaintext: string;
	facets?: LeafletFacet[];
}

export interface LeafletBlockquoteBlock {
	$type: 'pub.leaflet.blocks.blockquote';
	plaintext: string;
	facets?: LeafletFacet[];
}

export interface LeafletCodeBlock {
	$type: 'pub.leaflet.blocks.code';
	plaintext: string;
	language?: string;
}

export interface LeafletHorizontalRuleBlock {
	$type: 'pub.leaflet.blocks.horizontalRule';
}

export interface LeafletImageBlock {
	$type: 'pub.leaflet.blocks.image';
	image: {
		$type: 'blob';
		ref: {
			$link: string;
		};
		mimeType: string;
		size: number;
	};
	alt?: string;
	aspectRatio: {
		width: number;
		height: number;
	};
}

export type LeafletBlockType = 
	| LeafletTextBlock 
	| LeafletHeaderBlock 
	| LeafletBlockquoteBlock 
	| LeafletCodeBlock 
	| LeafletHorizontalRuleBlock
	| LeafletImageBlock;

export interface LeafletBlock {
	$type: 'pub.leaflet.pages.linearDocument#block';
	block: LeafletBlockType;
	alignment?: string;
}

export interface LeafletPage {
	$type: 'pub.leaflet.pages.linearDocument';
	blocks: LeafletBlock[];
}

export interface LeafletThemeColor {
	$type: 'pub.leaflet.theme.color#rgb';
	r: number;
	g: number;
	b: number;
}

export interface LeafletTheme {
	primary?: LeafletThemeColor;
	backgroundColor?: LeafletThemeColor;
	pageBackground?: LeafletThemeColor;
	showPageBackground?: boolean;
	accentBackground?: LeafletThemeColor;
	accentText?: LeafletThemeColor;
}

export interface LeafletPublicationPreferences {
	showInDiscover?: boolean;
	showComments?: boolean;
}

export interface LeafletPublicationRecord {
	$type: 'pub.leaflet.publication';
	name: string;
	base_path?: string;
	description?: string;
	preferences?: LeafletPublicationPreferences;
	theme?: LeafletTheme;
}

export interface LeafletDocumentRecord {
	$type: 'pub.leaflet.document';
	title: string;
	description?: string;
	author: string;
	publication: string;
	publishedAt?: string;
	pages: LeafletPage[];
}

export interface WhiteWindEntry {
	uri?: string;
	cid?: string;
	value?: {
		content?: string;
		title?: string;
		subtitle?: string;
		createdAt?: string;
		visibility?: string;
	};
	content?: string;
	title?: string;
	subtitle?: string;
	createdAt?: string;
}
