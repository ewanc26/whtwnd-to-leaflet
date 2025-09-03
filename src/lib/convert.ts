// Conversion utilities ported from the original script.js and typed for TS/Svelte use

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

export function convertBlobUrlToAtUri(url: string, did: string) {
	const blobUrlRegex = /xrpc\/com\.atproto\.sync\.getBlob\?did=([^&]+)&cid=([^&\s]+)/;
	const match = url.match(blobUrlRegex);

	if (match) {
		const [, extractedDid, cid] = match;
		return `at://${decodeURIComponent(extractedDid)}/com.whtwnd.blog.entry/${cid}`;
	}

	if (url.includes('bafk') || url.includes('bafyb')) {
		const cidMatch = url.match(/(bafk[a-z0-9]+|bafyb[a-z0-9]+)/);
	if (cidMatch) return `at://${did}/com.atproto.blob/${cidMatch[1]}`;
	}

	return url;
}

export function parseRichText(text: string, authorDid: string) {
	let plaintext = text;
	const facets: any[] = [];
	const utf8Encoder = new TextEncoder();

	const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
	let linkMatch: RegExpExecArray | null;
	const linkReplacements: { start: number; end: number; text: string; uri: string }[] = [];
	while ((linkMatch = linkRegex.exec(text)) !== null) {
		const fullMatch = linkMatch[0];
		const linkText = linkMatch[1];
		const uri = linkMatch[2];
		const convertedUri = convertBlobUrlToAtUri(uri, authorDid);

		linkReplacements.push({ start: linkMatch.index, end: linkMatch.index + fullMatch.length, text: linkText, uri: convertedUri });
	}

	for (let i = linkReplacements.length - 1; i >= 0; i--) {
		const rep = linkReplacements[i];
		const byteStart = utf8Encoder.encode(plaintext.substring(0, rep.start)).length;
		const byteEnd = byteStart + utf8Encoder.encode(rep.text).length;

		facets.push({ index: { byteStart, byteEnd }, features: [{ $type: 'pub.leaflet.richtext.facet#link', uri: rep.uri }] });
		plaintext = plaintext.substring(0, rep.start) + rep.text + plaintext.substring(rep.end);
	}

	const otherFacets: any[] = [];

	let boldRegex = /\*\*([^*]+)\*\*/g;
	let boldMatch: RegExpExecArray | null;
	while ((boldMatch = boldRegex.exec(plaintext)) !== null) {
		const start = utf8Encoder.encode(plaintext.substring(0, boldMatch.index)).length;
		const end = start + utf8Encoder.encode(boldMatch[1]).length;
		otherFacets.push({ index: { byteStart: start, byteEnd: end }, features: [{ $type: 'pub.leaflet.richtext.facet#bold' }] });
	}

	let italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
	let italicMatch: RegExpExecArray | null;
	while ((italicMatch = italicRegex.exec(plaintext)) !== null) {
		const start = utf8Encoder.encode(plaintext.substring(0, italicMatch.index)).length;
		const end = start + utf8Encoder.encode(italicMatch[1]).length;
		otherFacets.push({ index: { byteStart: start, byteEnd: end }, features: [{ $type: 'pub.leaflet.richtext.facet#italic' }] });
	}

	let codeRegex = /`([^`]+)`/g;
	let codeMatch: RegExpExecArray | null;
	while ((codeMatch = codeRegex.exec(plaintext)) !== null) {
		const start = utf8Encoder.encode(plaintext.substring(0, codeMatch.index)).length;
		const end = start + utf8Encoder.encode(codeMatch[1]).length;
		otherFacets.push({ index: { byteStart: start, byteEnd: end }, features: [{ $type: 'pub.leaflet.richtext.facet#code' }] });
	}

	const allFacets = [...facets, ...otherFacets];
	allFacets.sort((a, b) => a.index.byteStart - b.index.byteStart);

	plaintext = plaintext.replace(boldRegex, '$1');
	plaintext = plaintext.replace(italicRegex, '$1');
	plaintext = plaintext.replace(codeRegex, '$1');

	return { plaintext, facets: allFacets.length > 0 ? allFacets : undefined };
}

export function parseMarkdownToBlocks(content: string, authorDid: string) {
	const blocks: any[] = [];
	const lines = content.split('\n');
	let currentBlock = '';
	let blockType: string = 'text';

	function finishCurrent() {
		if (!currentBlock.trim()) return;
		const { plaintext, facets } = parseRichText(currentBlock.trim(), authorDid);
		blocks.push(createBlock(blockType, plaintext, authorDid, { facets }));
		currentBlock = '';
		blockType = 'text';
	}

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Header
		if (line.startsWith('#')) {
			if (currentBlock.trim()) {
				const { plaintext, facets } = parseRichText(currentBlock.trim(), authorDid);
				blocks.push(createBlock(blockType, plaintext, authorDid, { facets }));
				currentBlock = '';
			}
			const levelMatch = line.match(/^#+/);
			const level = levelMatch ? levelMatch[0].length : 1;
			const text = line.replace(/^#+\s*/, '');
			const { plaintext, facets } = parseRichText(text, authorDid);
			blocks.push(createBlock('header', plaintext, authorDid, { level, facets }));
			continue;
		}

		if (line.match(/^[-*_]{3,}$/)) {
			finishCurrent();
			blocks.push(createBlock('horizontalRule', '', authorDid));
			continue;
		}

		if (line.startsWith('```')) {
			if (blockType === 'code') {
				blocks.push(createBlock('code', currentBlock, authorDid, { language: 'javascript' }));
				currentBlock = '';
				blockType = 'text';
			} else {
				if (currentBlock.trim()) {
					const { plaintext, facets } = parseRichText(currentBlock.trim(), authorDid);
					blocks.push(createBlock(blockType, plaintext, authorDid, { facets }));
					currentBlock = '';
				}
				blockType = 'code';
				currentBlock = '';
			}
			continue;
		}

		if (line.startsWith('>')) {
			finishCurrent();
			blockType = 'blockquote';
			currentBlock = line.replace(/^>\s*/, '') + '\n';
			finishCurrent();
			continue;
		}

		const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
		if (imgMatch) {
			if (currentBlock.trim()) {
				const { plaintext, facets } = parseRichText(currentBlock.trim(), authorDid);
				blocks.push(createBlock(blockType, plaintext, authorDid, { facets }));
				currentBlock = '';
			}
			const [, alt, src] = imgMatch;
			const convertedSrc = convertBlobUrlToAtUri(src, authorDid);
			const { plaintext, facets } = parseRichText(`[Image: ${alt || 'Image'}] (${convertedSrc})`, authorDid);
			blocks.push(createBlock('text', plaintext, authorDid, { facets }));
			blockType = 'text';
			continue;
		}

		if (!line.trim()) {
			finishCurrent();
			continue;
		}

		if (blockType !== 'text' && blockType !== 'blockquote' && blockType !== 'code') {
			finishCurrent();
			blockType = 'text';
		}

		currentBlock += line + '\n';
	}

	finishCurrent();

	return blocks.length > 0 ? blocks : [createBlock('text', content, authorDid)];
}

function createBlock(type: string, content: string, authorDid: string, options: any = {}) {
	const block: any = { block: {} };

	switch (type) {
		case 'header':
			block.block = {
				$type: 'pub.leaflet.blocks.header',
				level: options.level || 1,
				plaintext: content,
				...(options.facets && { facets: options.facets })
			};
			break;
		case 'blockquote':
			block.block = { $type: 'pub.leaflet.blocks.blockquote', plaintext: content, ...(options.facets && { facets: options.facets }) };
			break;
		case 'code':
			block.block = { $type: 'pub.leaflet.blocks.code', plaintext: content, language: options.language || 'javascript' };
			break;
		case 'horizontalRule':
			block.block = { $type: 'pub.leaflet.blocks.horizontalRule' };
			break;
		default:
			block.block = { $type: 'pub.leaflet.blocks.text', plaintext: content, ...(options.facets && { facets: options.facets }) };
	}
	return block;
}

export function convertEntriesToLeaflet(publication: any, entries: any[], authorDid: string) {
	const documentRecords = entries.map((entry: any, idx: number) => {
		const rkey = generateTID();
		const content = entry.value?.content || entry.content || entry.body || '';
		const title = entry.value?.title || entry.title || entry.name;
		const subtitle = entry.value?.subtitle || entry.subtitle;
		const createdAt = entry.value?.createdAt || entry.createdAt;

		if (!content) {
			throw new Error('One or more WhiteWind entries is missing a "content" field');
		}
		const blocks = parseMarkdownToBlocks(content, authorDid);
		const publicationUri = `at://${authorDid}/pub.leaflet.publication/${publication.rkey}`;

		return {
			$type: 'pub.leaflet.document',
			title: title || 'Untitled Post',
			...(subtitle && { description: subtitle }),
			author: authorDid,
			publication: publicationUri,
			...(createdAt && { publishedAt: createdAt }),
			pages: [{ $type: 'pub.leaflet.pages.linearDocument', blocks }]
		};
	});

	return documentRecords;
}
