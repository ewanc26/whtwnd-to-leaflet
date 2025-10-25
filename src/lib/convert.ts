// Conversion utilities with remark-based markdown parsing
// Fully compliant with Leaflet lexicons

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import type {
	Root,
	PhrasingContent,
	Heading,
	Paragraph,
	Code,
	Blockquote,
	ThematicBreak,
	Image,
	List,
	ListItem,
	Link,
	Text,
	Strong,
	Emphasis,
	InlineCode
} from 'mdast';

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
 * Extracts CID from various blob URL formats
 */
function extractCid(url: string): string | null {
	// Handle XRPC getBlob URLs: xrpc/com.atproto.sync.getBlob?did=X&cid=Y
	const xrpcRegex = /xrpc\/com\.atproto\.sync\.getBlob\?did=([^&]+)&cid=([^&\s]+)/;
	const xrpcMatch = url.match(xrpcRegex);

	if (xrpcMatch) {
		return xrpcMatch[2];
	}

	// Handle direct CID references (bafk or bafyb prefixes)
	const cidRegex = /(bafk[a-z0-9]+|bafyb[a-z0-9]+)/i;
	const cidMatch = url.match(cidRegex);

	if (cidMatch) {
		return cidMatch[1];
	}

	return null;
}

/**
 * Fetches actual image dimensions from a blob URL
 */
async function getImageDimensions(
	url: string
): Promise<{ width: number; height: number } | null> {
	try {
		const img = new Image();

		return new Promise((resolve) => {
			img.onload = () => {
				resolve({ width: img.naturalWidth, height: img.naturalHeight });
			};

			img.onerror = () => {
				console.warn(`Failed to load image for dimensions: ${url}`);
				resolve(null);
			};

			setTimeout(() => {
				console.warn(`Timeout loading image for dimensions: ${url}`);
				resolve(null);
			}, 10000);

			img.src = url;
		});
	} catch (error) {
		console.error('Error getting image dimensions:', error);
		return null;
	}
}

/**
 * Converts XRPC blob URLs to proper Leaflet image blob format
 */
export function convertBlobToImageRef(
	url: string,
	did: string
): { $type: string; ref: { $link: string } } | null {
	const cid = extractCid(url);

	if (!cid) {
		return null;
	}

	return {
		$type: 'blob',
		ref: {
			$link: cid
		}
	};
}

/**
 * Converts blob URLs to AT-URI format for links
 */
export function convertBlobUrlToAtUri(url: string, did: string): string {
	const cid = extractCid(url);

	if (cid) {
		return `at://${did}/com.atproto.blob/${cid}`;
	}

	return url;
}

/**
 * Process phrasing content (inline elements) and extract facets
 * Strictly follows pub.leaflet.richtext.facet lexicon
 */
function processPhrasingContent(
	content: PhrasingContent[],
	authorDid: string
): { plaintext: string; facets: any[] } {
	let plaintext = '';
	const facets: any[] = [];
	const utf8Encoder = new TextEncoder();

	for (const node of content) {
		if (node.type === 'text') {
			plaintext += (node as Text).value;
		} else if (node.type === 'strong') {
			const strongNode = node as Strong;
			const innerText = toString(strongNode);
			const byteStart = utf8Encoder.encode(plaintext).length;
			plaintext += innerText;
			const byteEnd = utf8Encoder.encode(plaintext).length;

			facets.push({
				index: { byteStart, byteEnd },
				features: [{ $type: 'pub.leaflet.richtext.facet#bold' }]
			});
		} else if (node.type === 'emphasis') {
			const emphNode = node as Emphasis;
			const innerText = toString(emphNode);
			const byteStart = utf8Encoder.encode(plaintext).length;
			plaintext += innerText;
			const byteEnd = utf8Encoder.encode(plaintext).length;

			facets.push({
				index: { byteStart, byteEnd },
				features: [{ $type: 'pub.leaflet.richtext.facet#italic' }]
			});
		} else if (node.type === 'inlineCode') {
			const codeNode = node as InlineCode;
			const byteStart = utf8Encoder.encode(plaintext).length;
			plaintext += codeNode.value;
			const byteEnd = utf8Encoder.encode(plaintext).length;

			facets.push({
				index: { byteStart, byteEnd },
				features: [{ $type: 'pub.leaflet.richtext.facet#code' }]
			});
		} else if (node.type === 'link') {
			const linkNode = node as Link;
			const linkText = toString(linkNode);
			const convertedUri = convertBlobUrlToAtUri(linkNode.url, authorDid);
			const byteStart = utf8Encoder.encode(plaintext).length;
			plaintext += linkText;
			const byteEnd = utf8Encoder.encode(plaintext).length;

			facets.push({
				index: { byteStart, byteEnd },
				features: [{ $type: 'pub.leaflet.richtext.facet#link', uri: convertedUri }]
			});
		} else if (node.type === 'image') {
			// Images within text are converted to links
			const imgNode = node as Image;
			const convertedUrl = convertBlobUrlToAtUri(imgNode.url, authorDid);
			const linkText = imgNode.alt || 'Image';
			const byteStart = utf8Encoder.encode(plaintext).length;
			plaintext += linkText;
			const byteEnd = utf8Encoder.encode(plaintext).length;

			facets.push({
				index: { byteStart, byteEnd },
				features: [{ $type: 'pub.leaflet.richtext.facet#link', uri: convertedUrl }]
			});
		} else {
			plaintext += toString(node);
		}
	}

	return { plaintext, facets };
}

/**
 * Process a list item recursively following pub.leaflet.blocks.unorderedList#listItem
 */
async function processListItem(
	item: ListItem,
	authorDid: string,
	blobs: any[],
	pdsUrl?: string
): Promise<any> {
	// Process the first paragraph/block as the content
	let content: any;

	if (item.children.length > 0) {
		const firstChild = item.children[0];

		if (firstChild.type === 'paragraph') {
			const paraNode = firstChild as Paragraph;

			// Check if it's a standalone image
			if (paraNode.children.length === 1 && paraNode.children[0].type === 'image') {
				const imgNode = paraNode.children[0] as Image;
				const imageBlob = convertBlobToImageRef(imgNode.url, authorDid);

				if (imageBlob) {
					const cid = extractCid(imgNode.url);
					const blobMeta = blobs.find((b: any) => {
						const blobCid = b.cid || b.ref?.$link || b.$link;
						return blobCid === cid;
					});

					let width = blobMeta?.width || blobMeta?.aspectRatio?.width;
					let height = blobMeta?.height || blobMeta?.aspectRatio?.height;

					if ((!width || !height) && pdsUrl && cid) {
						const imageUrl = `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${authorDid}&cid=${cid}`;
						const dimensions = await getImageDimensions(imageUrl);

						if (dimensions) {
							width = dimensions.width;
							height = dimensions.height;
						}
					}

					if (!width || !height) {
						width = 512;
						height = 512;
					}

					content = {
						$type: 'pub.leaflet.blocks.image',
						image: imageBlob,
						aspectRatio: { width, height },
						...(imgNode.alt && { alt: imgNode.alt })
					};
				}
			} else {
				// Regular text content
				const { plaintext, facets } = processPhrasingContent(paraNode.children, authorDid);
				content = {
					$type: 'pub.leaflet.blocks.text',
					plaintext,
					...(facets.length > 0 && { facets })
				};
			}
		} else if (firstChild.type === 'heading') {
			const headingNode = firstChild as Heading;
			const { plaintext, facets } = processPhrasingContent(headingNode.children, authorDid);
			content = {
				$type: 'pub.leaflet.blocks.header',
				level: headingNode.depth,
				plaintext,
				...(facets.length > 0 && { facets })
			};
		}
	}

	// If no content was created, use plain text
	if (!content) {
		const itemText = toString(item);
		content = {
			$type: 'pub.leaflet.blocks.text',
			plaintext: itemText
		};
	}

	const listItem: any = { content };

	// Process nested lists (children beyond the first element)
	const nestedListItems = item.children.slice(1).filter((child) => child.type === 'list');
	if (nestedListItems.length > 0) {
		const children = [];
		for (const nestedList of nestedListItems) {
			const listNode = nestedList as List;
			for (const nestedItem of listNode.children) {
				const processedNested = await processListItem(
					nestedItem as ListItem,
					authorDid,
					blobs,
					pdsUrl
				);
				children.push(processedNested);
			}
		}
		if (children.length > 0) {
			listItem.children = children;
		}
	}

	return listItem;
}

/**
 * Convert markdown AST to Leaflet blocks using remark
 * Fully compliant with Leaflet lexicons
 */
export async function parseMarkdownToBlocks(
	content: string,
	authorDid: string,
	blobs: any[] = [],
	pdsUrl?: string
): Promise<any[]> {
	const processor = unified().use(remarkParse).use(remarkGfm);

	const tree = processor.parse(content) as Root;
	const blocks: any[] = [];

	for (const node of tree.children) {
		if (node.type === 'heading') {
			// pub.leaflet.blocks.header
			const headingNode = node as Heading;
			const { plaintext, facets } = processPhrasingContent(headingNode.children, authorDid);

			blocks.push({
				$type: 'pub.leaflet.pages.linearDocument#block',
				block: {
					$type: 'pub.leaflet.blocks.header',
					level: headingNode.depth,
					plaintext,
					...(facets.length > 0 && { facets })
				}
			});
		} else if (node.type === 'paragraph') {
			const paraNode = node as Paragraph;

			// Check if paragraph contains only an image - convert to image block
			if (paraNode.children.length === 1 && paraNode.children[0].type === 'image') {
				const imgNode = paraNode.children[0] as Image;
				const imageBlob = convertBlobToImageRef(imgNode.url, authorDid);

				if (imageBlob) {
					// pub.leaflet.blocks.image - REQUIRES aspectRatio
					const cid = extractCid(imgNode.url);
					const blobMeta = blobs.find((b: any) => {
						const blobCid = b.cid || b.ref?.$link || b.$link;
						return blobCid === cid;
					});

					let width = blobMeta?.width || blobMeta?.aspectRatio?.width;
					let height = blobMeta?.height || blobMeta?.aspectRatio?.height;

					// Try to fetch actual dimensions if not in metadata
					if ((!width || !height) && pdsUrl && cid) {
						const imageUrl = `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${authorDid}&cid=${cid}`;
						const dimensions = await getImageDimensions(imageUrl);

						if (dimensions) {
							width = dimensions.width;
							height = dimensions.height;
							console.log(`Fetched image dimensions for ${cid}: ${width}x${height}`);
						}
					}

					// Final fallback to square aspect ratio
					if (!width || !height) {
						width = 512;
						height = 512;
						console.warn(`Using default 512x512 dimensions for image: ${cid}`);
					}

					blocks.push({
						$type: 'pub.leaflet.pages.linearDocument#block',
						block: {
							$type: 'pub.leaflet.blocks.image',
							image: imageBlob,
							aspectRatio: {
								width,
								height
							},
							...(imgNode.alt && { alt: imgNode.alt })
						}
					});
				} else {
					// Fallback if URL isn't a blob
					const convertedUrl = convertBlobUrlToAtUri(imgNode.url, authorDid);
					const linkText = imgNode.alt || 'Image';

					blocks.push({
						$type: 'pub.leaflet.pages.linearDocument#block',
						block: {
							$type: 'pub.leaflet.blocks.text',
							plaintext: linkText,
							facets: [
								{
									index: {
										byteStart: 0,
										byteEnd: new TextEncoder().encode(linkText).length
									},
									features: [
										{ $type: 'pub.leaflet.richtext.facet#link', uri: convertedUrl }
									]
								}
							]
						}
					});
				}
			} else {
				// pub.leaflet.blocks.text
				const { plaintext, facets } = processPhrasingContent(paraNode.children, authorDid);

				if (plaintext.trim()) {
					blocks.push({
						$type: 'pub.leaflet.pages.linearDocument#block',
						block: {
							$type: 'pub.leaflet.blocks.text',
							plaintext,
							...(facets.length > 0 && { facets })
						}
					});
				}
			}
		} else if (node.type === 'code') {
			// pub.leaflet.blocks.code
			const codeNode = node as Code;

			blocks.push({
				$type: 'pub.leaflet.pages.linearDocument#block',
				block: {
					$type: 'pub.leaflet.blocks.code',
					plaintext: codeNode.value,
					...(codeNode.lang && { language: codeNode.lang })
				}
			});
		} else if (node.type === 'blockquote') {
			// pub.leaflet.blocks.blockquote
			const quoteNode = node as Blockquote;
			const quoteText = toString(quoteNode);

			blocks.push({
				$type: 'pub.leaflet.pages.linearDocument#block',
				block: {
					$type: 'pub.leaflet.blocks.blockquote',
					plaintext: quoteText
				}
			});
		} else if (node.type === 'thematicBreak') {
			// pub.leaflet.blocks.horizontalRule
			blocks.push({
				$type: 'pub.leaflet.pages.linearDocument#block',
				block: {
					$type: 'pub.leaflet.blocks.horizontalRule'
				}
			});
		} else if (node.type === 'list') {
			// pub.leaflet.blocks.unorderedList
			const listNode = node as List;

			// Process each list item
			const children = [];
			for (const item of listNode.children) {
				const processedItem = await processListItem(
					item as ListItem,
					authorDid,
					blobs,
					pdsUrl
				);
				children.push(processedItem);
			}

			blocks.push({
				$type: 'pub.leaflet.pages.linearDocument#block',
				block: {
					$type: 'pub.leaflet.blocks.unorderedList',
					children
				}
			});
		}
	}

	// If no blocks were created, return a single text block
	if (blocks.length === 0) {
		blocks.push({
			$type: 'pub.leaflet.pages.linearDocument#block',
			block: {
				$type: 'pub.leaflet.blocks.text',
				plaintext: content
			}
		});
	}

	return blocks;
}

/**
 * Convert WhiteWind entries to Leaflet documents
 * Strictly follows pub.leaflet.document lexicon (no visibility field!)
 */
export async function convertEntriesToLeaflet(
	publication: any,
	entries: any[],
	authorDid: string,
	pdsUrl?: string,
	existingPublicationRkey?: string
): Promise<any[]> {
	const publicationUri = existingPublicationRkey
		? `at://${authorDid}/pub.leaflet.publication/${existingPublicationRkey}`
		: `at://${authorDid}/pub.leaflet.publication/${publication.rkey}`;

	const documentRecords = await Promise.all(
		entries.map(async (entry: any) => {
			// Extract content from various possible fields
			const content = entry.value?.content || entry.content || entry.body || '';

			// Extract only Leaflet-compatible metadata
			const title = entry.value?.title || entry.title || entry.name || 'Untitled Post';
			const description = entry.value?.subtitle || entry.subtitle;
			const publishedAt = entry.value?.createdAt || entry.createdAt;

			// Preserve the original rkey for proper AT-URI references
			const rkey = entry.rkey || entry.value?.rkey || generateTID();

			if (!content) {
				throw new Error('One or more WhiteWind entries is missing a "content" field');
			}

			// Extract blobs metadata if available
			const blobs = entry.value?.blobs || entry.blobs || [];
			const blocks = await parseMarkdownToBlocks(content, authorDid, blobs, pdsUrl);

			// Build Leaflet document with ONLY fields from the lexicon
			const document: any = {
				$type: 'pub.leaflet.document',
				rkey, // Preserve for publishing
				title,
				author: authorDid,
				publication: publicationUri,
				pages: [
					{
						$type: 'pub.leaflet.pages.linearDocument',
						blocks
					}
				]
			};

			// Add optional fields only if present
			if (description) {
				document.description = description;
			}

			if (publishedAt) {
				document.publishedAt = publishedAt;
			}

			return document;
		})
	);

	return documentRecords;
}
