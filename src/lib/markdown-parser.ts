// Improved markdown parser using remark/unified like Leaflet does
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Root, Content, Text, Link, Image, Code, Heading, Paragraph, Blockquote, ThematicBreak, List, ListItem } from 'mdast';
import type { LeafletBlock, LeafletFacet, LeafletBlockType } from './types';

interface ParseContext {
	authorDid: string;
}

/**
 * Convert byte position to character position in UTF-8 encoded text
 */
function getBytePosition(text: string, charPosition: number): number {
	const encoder = new TextEncoder();
	return encoder.encode(text.substring(0, charPosition)).length;
}

/**
 * Extract rich text facets from markdown text nodes
 */
function extractFacets(node: Text, context: ParseContext, baseOffset: number = 0): LeafletFacet[] {
	const facets: LeafletFacet[] = [];
	const text = node.value;
	
	// Bold: **text**
	const boldRegex = /\*\*(.+?)\*\*/g;
	let match: RegExpExecArray | null;
	
	while ((match = boldRegex.exec(text)) !== null) {
		const start = getBytePosition(text, match.index) + baseOffset;
		const end = getBytePosition(text, match.index + match[0].length) + baseOffset;
		facets.push({
			index: { byteStart: start, byteEnd: end },
			features: [{ $type: 'pub.leaflet.richtext.facet#bold' }]
		});
	}
	
	// Italic: *text* or _text_
	const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)|_([^_]+)_/g;
	while ((match = italicRegex.exec(text)) !== null) {
		const start = getBytePosition(text, match.index) + baseOffset;
		const end = getBytePosition(text, match.index + match[0].length) + baseOffset;
		facets.push({
			index: { byteStart: start, byteEnd: end },
			features: [{ $type: 'pub.leaflet.richtext.facet#italic' }]
		});
	}
	
	// Code: `text`
	const codeRegex = /`([^`]+)`/g;
	while ((match = codeRegex.exec(text)) !== null) {
		const start = getBytePosition(text, match.index) + baseOffset;
		const end = getBytePosition(text, match.index + match[0].length) + baseOffset;
		facets.push({
			index: { byteStart: start, byteEnd: end },
			features: [{ $type: 'pub.leaflet.richtext.facet#code' }]
		});
	}
	
	return facets;
}

/**
 * Process inline nodes (text, links, emphasis, etc.) and extract plaintext + facets
 */
function processInlineContent(nodes: Content[], context: ParseContext): { plaintext: string; facets?: LeafletFacet[] } {
	let plaintext = '';
	const facets: LeafletFacet[] = [];
	
	for (const node of nodes) {
		if (node.type === 'text') {
			// Extract formatting facets from the text
			const textFacets = extractFacets(node, context, getBytePosition(plaintext, plaintext.length));
			facets.push(...textFacets);
			plaintext += node.value;
		} else if (node.type === 'link') {
			const linkText = node.children
				.filter((c): c is Text => c.type === 'text')
				.map(c => c.value)
				.join('');
			
			const start = getBytePosition(plaintext, plaintext.length);
			plaintext += linkText;
			const end = getBytePosition(plaintext, plaintext.length);
			
			// Convert blob URLs to AT URIs
			const uri = convertBlobUrlToAtUri(node.url, context.authorDid);
			
			facets.push({
				index: { byteStart: start, byteEnd: end },
				features: [{ $type: 'pub.leaflet.richtext.facet#link', uri }]
			});
		} else if (node.type === 'strong') {
			const start = getBytePosition(plaintext, plaintext.length);
			const strongContent = processInlineContent(node.children, context);
			plaintext += strongContent.plaintext;
			const end = getBytePosition(plaintext, plaintext.length);
			
			facets.push({
				index: { byteStart: start, byteEnd: end },
				features: [{ $type: 'pub.leaflet.richtext.facet#bold' }]
			});
			
			if (strongContent.facets) {
				facets.push(...strongContent.facets);
			}
		} else if (node.type === 'emphasis') {
			const start = getBytePosition(plaintext, plaintext.length);
			const emContent = processInlineContent(node.children, context);
			plaintext += emContent.plaintext;
			const end = getBytePosition(plaintext, plaintext.length);
			
			facets.push({
				index: { byteStart: start, byteEnd: end },
				features: [{ $type: 'pub.leaflet.richtext.facet#italic' }]
			});
			
			if (emContent.facets) {
				facets.push(...emContent.facets);
			}
		} else if (node.type === 'inlineCode') {
			const start = getBytePosition(plaintext, plaintext.length);
			plaintext += node.value;
			const end = getBytePosition(plaintext, plaintext.length);
			
			facets.push({
				index: { byteStart: start, byteEnd: end },
				features: [{ $type: 'pub.leaflet.richtext.facet#code' }]
			});
		} else if (node.type === 'break') {
			plaintext += '\n';
		}
	}
	
	return { plaintext, facets: facets.length > 0 ? facets : undefined };
}

/**
 * Convert blob URLs to AT URIs
 */
function convertBlobUrlToAtUri(url: string, did: string): string {
	// Handle AT Protocol blob URLs from WhiteWind
	const blobUrlRegex = /xrpc\/com\.atproto\.sync\.getBlob\?did=([^&]+)&cid=([^&\s]+)/;
	const match = url.match(blobUrlRegex);
	
	if (match) {
		const [, extractedDid, cid] = match;
		return `at://${decodeURIComponent(extractedDid)}/com.whtwnd.blog.entry/${cid}`;
	}
	
	// Handle direct CID references
	if (url.includes('bafk') || url.includes('bafyb')) {
		const cidMatch = url.match(/(bafk[a-z0-9]+|bafyb[a-z0-9]+)/);
		if (cidMatch) {
			return `at://${did}/com.atproto.blob/${cidMatch[1]}`;
		}
	}
	
	return url;
}

/**
 * Convert a markdown AST node to a Leaflet block type (unwrapped)
 */
function nodeToBlock(node: Content, context: ParseContext): LeafletBlockType | LeafletBlockType[] | null {
	switch (node.type) {
		case 'heading': {
			const headingNode = node as Heading;
			const content = processInlineContent(headingNode.children, context);
			return {
				$type: 'pub.leaflet.blocks.header',
				level: headingNode.depth,
				plaintext: content.plaintext,
				...(content.facets && { facets: content.facets })
			};
		}
		
		case 'paragraph': {
			const paraNode = node as Paragraph;
			// Check if paragraph contains only an image
			if (paraNode.children.length === 1 && paraNode.children[0].type === 'image') {
				const imgNode = paraNode.children[0] as Image;
				const uri = convertBlobUrlToAtUri(imgNode.url, context.authorDid);
				
				// For now, represent images as text with link facets since we can't upload blobs in this converter
				// In a full implementation, you'd upload the image and get a blob reference
				const imageText = `[Image: ${imgNode.alt || 'Image'}]`;
				const start = 0;
				const end = getBytePosition(imageText, imageText.length);
				
				return {
					$type: 'pub.leaflet.blocks.text',
					plaintext: imageText,
					facets: [{
						index: { byteStart: start, byteEnd: end },
						features: [{ $type: 'pub.leaflet.richtext.facet#link', uri }]
					}]
				};
			}
			
			const content = processInlineContent(paraNode.children, context);
			return {
				$type: 'pub.leaflet.blocks.text',
				plaintext: content.plaintext,
				...(content.facets && { facets: content.facets })
			};
		}
		
		case 'blockquote': {
			const quoteNode = node as Blockquote;
			// Collect all text from the blockquote
			let allText = '';
			const allFacets: LeafletFacet[] = [];
			
			for (const child of quoteNode.children) {
				if (child.type === 'paragraph') {
					const content = processInlineContent(child.children, context);
					allText += (allText ? '\n' : '') + content.plaintext;
					if (content.facets) {
						allFacets.push(...content.facets);
					}
				}
			}
			
			return {
				$type: 'pub.leaflet.blocks.blockquote',
				plaintext: allText,
				...(allFacets.length > 0 && { facets: allFacets })
			};
		}
		
		case 'code': {
			const codeNode = node as Code;
			return {
				$type: 'pub.leaflet.blocks.code',
				plaintext: codeNode.value,
				...(codeNode.lang && { language: codeNode.lang })
			};
		}
		
		case 'thematicBreak': {
			return {
				$type: 'pub.leaflet.blocks.horizontalRule'
			};
		}
		
		case 'list': {
			const listNode = node as List;
			// For now, convert list items to text blocks with bullets
			// A full implementation would use pub.leaflet.blocks.unorderedList
			const blocks: LeafletBlockType[] = [];
			
			for (const item of listNode.children) {
				if (item.type === 'listItem') {
					const listItem = item as ListItem;
					let text = listNode.ordered 
						? `${listNode.start || 1}. ` 
						: '• ';
					
					const allFacets: LeafletFacet[] = [];
					
					for (const child of listItem.children) {
						if (child.type === 'paragraph') {
							const content = processInlineContent(child.children, context);
							text += content.plaintext;
							if (content.facets) {
								allFacets.push(...content.facets);
							}
						}
					}
					
					blocks.push({
						$type: 'pub.leaflet.blocks.text',
						plaintext: text,
						...(allFacets.length > 0 && { facets: allFacets })
					});
				}
			}
			
			return blocks;
		}
		
		default:
			return null;
	}
}

/**
 * Parse markdown content into Leaflet block types using remark
 * Returns unwrapped block types that need to be wrapped in LeafletBlock structure
 */
export function parseMarkdownToBlocks(markdown: string, authorDid: string): Array<{ block: LeafletBlockType }> {
	const processor = unified()
		.use(remarkParse);
	
	const tree = processor.parse(markdown) as Root;
	const blocks: Array<{ block: LeafletBlockType }> = [];
	const context: ParseContext = { authorDid };
	
	for (const node of tree.children) {
		const blockType = nodeToBlock(node, context);
		if (blockType) {
			if (Array.isArray(blockType)) {
				blocks.push(...blockType.map(b => ({ block: b })));
			} else {
				blocks.push({ block: blockType });
			}
		}
	}
	
	// If no blocks were created, create a single text block with the raw content
	if (blocks.length === 0) {
		blocks.push({
			block: {
				$type: 'pub.leaflet.blocks.text',
				plaintext: markdown
			}
		});
	}
	
	return blocks;
}
