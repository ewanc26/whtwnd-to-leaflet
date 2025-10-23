// Conversion utilities using improved markdown parser
import { parseMarkdownToBlocks } from './markdown-parser';
import type { 
	LeafletDocumentRecord, 
	LeafletPublicationRecord, 
	WhiteWindEntry,
	LeafletBlock
} from './types';

const BASE32_SORTABLE = '234567abcdefghijklmnopqrstuvwxyz';

function generateClockId() {
	return Math.floor(Math.random() * 1024);
}

function toBase32Sortable(num: bigint) {
	if (num === 0n) return '2222222222222';
	let result = '';
	while (num > 0n) {
		result = BASE32_SORTABLE[Number(num % 32n)] + result;
		num = num / 32n;
	}
	return result.padStart(13, '2');
}

export function generateTID() {
	const nowMs = Date.now();
	const nowMicroseconds = BigInt(nowMs * 1000);
	const clockId = generateClockId();
	const tidBigInt = (nowMicroseconds << 10n) | BigInt(clockId);
	return toBase32Sortable(tidBigInt);
}

export function hexToRgb(hex: string) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
		: null;
}

/**
 * Create a Leaflet publication record
 */
export function createPublicationRecord(
	name: string,
	authorDid: string,
	options: {
		basePath?: string;
		description?: string;
		showInDiscover?: boolean;
		showComments?: boolean;
		primaryColor?: string;
		backgroundColor?: string;
		pageBackground?: string;
		showPageBackground?: boolean;
	} = {}
): { rkey: string; record: LeafletPublicationRecord } {
	const rkey = generateTID();
	
	// Convert hex colors to RGB
	const primaryRgb = options.primaryColor ? hexToRgb(options.primaryColor) : null;
	const backgroundRgb = options.backgroundColor ? hexToRgb(options.backgroundColor) : null;
	const pageBackgroundRgb = options.pageBackground ? hexToRgb(options.pageBackground) : null;

	const record: LeafletPublicationRecord = {
		$type: 'pub.leaflet.publication',
		name,
		...(options.basePath && { base_path: options.basePath }),
		...(options.description && { description: options.description }),
		preferences: {
			showInDiscover: options.showInDiscover ?? true,
			showComments: options.showComments ?? true
		},
		theme: {
			...(primaryRgb && {
				primary: {
					$type: 'pub.leaflet.theme.color#rgb',
					...primaryRgb
				}
			}),
			...(backgroundRgb && {
				backgroundColor: {
					$type: 'pub.leaflet.theme.color#rgb',
					...backgroundRgb
				}
			}),
			...(pageBackgroundRgb && {
				pageBackground: {
					$type: 'pub.leaflet.theme.color#rgb',
					...pageBackgroundRgb
				}
			}),
			showPageBackground: options.showPageBackground ?? false
		}
	};

	return { rkey, record };
}

/**
 * Convert a WhiteWind entry to a Leaflet document record
 */
export function convertEntryToDocument(
	entry: WhiteWindEntry,
	publicationUri: string,
	authorDid: string
): { rkey: string; record: LeafletDocumentRecord } {
	const content = entry.value?.content || entry.content || '';
	const title = entry.value?.title || entry.title || 'Untitled Post';
	const subtitle = entry.value?.subtitle || entry.subtitle;
	const createdAt = entry.value?.createdAt || entry.createdAt;

	if (!content) {
		throw new Error('WhiteWind entry is missing a "content" field');
	}

	// Parse markdown to blocks
	const blockTypes = parseMarkdownToBlocks(content, authorDid);
	
	// Wrap blocks in the proper structure
	const blocks: LeafletBlock[] = blockTypes.map(blockType => ({
		$type: 'pub.leaflet.pages.linearDocument#block' as const,
		block: blockType.block
	}));

	const rkey = generateTID();

	const record: LeafletDocumentRecord = {
		$type: 'pub.leaflet.document',
		title,
		...(subtitle && { description: subtitle }),
		author: authorDid,
		publication: publicationUri,
		...(createdAt && { publishedAt: createdAt }),
		pages: [
			{
				$type: 'pub.leaflet.pages.linearDocument',
				blocks
			}
		]
	};

	return { rkey, record };
}

/**
 * Convert multiple WhiteWind entries to Leaflet documents
 */
export function convertEntriesToDocuments(
	entries: WhiteWindEntry[],
	publicationUri: string,
	authorDid: string
): Array<{ rkey: string; record: LeafletDocumentRecord }> {
	return entries.map(entry => convertEntryToDocument(entry, publicationUri, authorDid));
}
