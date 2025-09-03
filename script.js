// Base32-sortable character set for TID encoding
const BASE32_SORTABLE = '234567abcdefghijklmnopqrstuvwxyz';

function generateClockId() {
    return Math.floor(Math.random() * 1024);
}

function toBase32Sortable(num) {
    if (num === 0n) {
        return '2222222222222';
    }

    let result = '';
    while (num > 0n) {
        result = BASE32_SORTABLE[Number(num % 32n)] + result;
        num = num / 32n;
    }

    return result.padStart(13, '2');
}

function generateTID() {
    const nowMs = Date.now();
    const nowMicroseconds = BigInt(nowMs * 1000);
    const clockId = generateClockId();
    const tidBigInt = (nowMicroseconds << 10n) | BigInt(clockId);

    return toBase32Sortable(tidBigInt);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function convertBlobUrlToAtUri(url, did) {
    const blobUrlRegex = /xrpc\/com\.atproto\.sync\.getBlob\?did=([^&]+)&cid=([^&\s]+)/;
    const match = url.match(blobUrlRegex);

    if (match) {
        const [, extractedDid, cid] = match;
        return `at://${decodeURIComponent(extractedDid)}/com.whtwnd.blog.entry/${cid}`;
    }

    if (url.includes('bafk') || url.includes('bafyb')) {
        const cidMatch = url.match(/(bafk[a-z0-9]+|bafyb[a-z0-9]+)/);
        if (cidMatch) {
            return `at://${did}/com.atproto.blob/${cidMatch[1]}`;
        }
    }

    return url;
}

function parseRichText(text, authorDid) {
    let plaintext = text;
    const facets = [];
    const utf8Encoder = new TextEncoder();

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch;
    const linkReplacements = [];
    while ((linkMatch = linkRegex.exec(text)) !== null) {
        const fullMatch = linkMatch[0];
        const linkText = linkMatch[1];
        const uri = linkMatch[2];
        const convertedUri = convertBlobUrlToAtUri(uri, authorDid);

        linkReplacements.push({
            start: linkMatch.index,
            end: linkMatch.index + fullMatch.length,
            text: linkText,
            uri: convertedUri
        });
    }

    for (let i = linkReplacements.length - 1; i >= 0; i--) {
        const rep = linkReplacements[i];
        const byteStart = utf8Encoder.encode(plaintext.substring(0, rep.start)).length;
        const byteEnd = byteStart + utf8Encoder.encode(rep.text).length;

        facets.push({
            index: { byteStart, byteEnd },
            features: [{ $type: 'pub.leaflet.richtext.facet#link', uri: rep.uri }]
        });
        plaintext = plaintext.substring(0, rep.start) + rep.text + plaintext.substring(rep.end);
    }

    const otherFacets = [];

    let boldRegex = /\*\*([^*]+)\*\*/g;
    let boldMatch;
    while ((boldMatch = boldRegex.exec(plaintext)) !== null) {
        const start = utf8Encoder.encode(plaintext.substring(0, boldMatch.index)).length;
        const end = start + utf8Encoder.encode(boldMatch[1]).length;
        otherFacets.push({
            index: { byteStart: start, byteEnd: end },
            features: [{ $type: 'pub.leaflet.richtext.facet#bold' }]
        });
    }

    let italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
    let italicMatch;
    while ((italicMatch = italicRegex.exec(plaintext)) !== null) {
        const start = utf8Encoder.encode(plaintext.substring(0, italicMatch.index)).length;
        const end = start + utf8Encoder.encode(italicMatch[1]).length;
        otherFacets.push({
            index: { byteStart: start, byteEnd: end },
            features: [{ $type: 'pub.leaflet.richtext.facet#italic' }]
        });
    }

    let codeRegex = /`([^`]+)`/g;
    let codeMatch;
    while ((codeMatch = codeRegex.exec(plaintext)) !== null) {
        const start = utf8Encoder.encode(plaintext.substring(0, codeMatch.index)).length;
        const end = start + utf8Encoder.encode(codeMatch[1]).length;
        otherFacets.push({
            index: { byteStart: start, byteEnd: end },
            features: [{ $type: 'pub.leaflet.richtext.facet#code' }]
        });
    }

    const allFacets = [...facets, ...otherFacets];
    allFacets.sort((a, b) => a.index.byteStart - b.index.byteStart);

    plaintext = plaintext.replace(boldRegex, '$1');
    plaintext = plaintext.replace(italicRegex, '$1');
    plaintext = plaintext.replace(codeRegex, '$1');

    return { plaintext, facets: allFacets.length > 0 ? allFacets : undefined };
}

function parseMarkdownToBlocks(content, authorDid) {
    const blocks = [];
    const lines = content.split('\n');
    let currentBlock = '';
    let blockType = 'text';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('#')) {
            if (currentBlock.trim()) {
                const { plaintext, facets } = parseRichText(currentBlock.trim(), authorDid);
                blocks.push(createBlock(blockType, plaintext, authorDid, { facets }));
                currentBlock = '';
            }
            const level = line.match(/^#+/)[0].length;
            const text = line.replace(/^#+\s*/, '');
            const { plaintext, facets } = parseRichText(text, authorDid);
            blocks.push(createBlock('header', plaintext, authorDid, { level, facets }));
            continue;
        }

        if (line.match(/^[-*_]{3,}$/)) {
            if (currentBlock.trim()) {
                const { plaintext, facets } = parseRichText(currentBlock.trim(), authorDid);
                blocks.push(createBlock(blockType, plaintext, authorDid, { facets }));
                currentBlock = '';
            }
            blocks.push(createBlock('horizontalRule', '', authorDid));
            continue;
        }

        if (line.startsWith('```')) {
            if (blockType === 'code') {
                blocks.push(createBlock('code', currentBlock, authorDid, {
                    language: 'javascript'
                }));
                currentBlock = '';
                blockType = 'text';
            } else {
                if (currentBlock.trim()) {
                    const { plaintext, facets } = parseRichText(currentBlock.trim(), authorDid);
                    blocks.push(createBlock(blockType, plaintext, authorDid, { facets }));
                    currentBlock = '';
                }
                blockType = 'code';
            }
            continue;
        }

        if (line.startsWith('>')) {
            if (blockType !== 'blockquote') {
                if (currentBlock.trim()) {
                    const { plaintext, facets } = parseRichText(currentBlock.trim(), authorDid);
                    blocks.push(createBlock(blockType, plaintext, authorDid, { facets }));
                    currentBlock = '';
                }
                blockType = 'blockquote';
            }
            currentBlock += line.replace(/^>\s*/, '') + '\n';
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
            if (currentBlock.trim()) {
                const { plaintext, facets } = parseRichText(currentBlock.trim(), authorDid);
                blocks.push(createBlock(blockType, plaintext, authorDid, { facets }));
                currentBlock = '';
                blockType = 'text';
            }
            continue;
        }

        if (blockType !== 'text' && blockType !== 'blockquote' && blockType !== 'code') {
            blockType = 'text';
        }

        currentBlock += line + '\n';
    }

    if (currentBlock.trim()) {
        const { plaintext, facets } = parseRichText(currentBlock.trim(), authorDid);
        blocks.push(createBlock(blockType, plaintext, authorDid, { facets }));
    }

    return blocks.length > 0 ? blocks : [createBlock('text', content, authorDid)];
}

function createBlock(type, content, authorDid, options = {}) {
    const block = {
        block: {}
    };

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
            block.block = {
                $type: 'pub.leaflet.blocks.blockquote',
                plaintext: content,
                ...(options.facets && { facets: options.facets })
            };
            break;
        case 'code':
            block.block = {
                $type: 'pub.leaflet.blocks.code',
                plaintext: content,
                language: options.language || 'javascript'
            };
            break;
        case 'horizontalRule':
            block.block = {
                $type: 'pub.leaflet.blocks.horizontalRule'
            };
            break;
        default:
            block.block = {
                $type: 'pub.leaflet.blocks.text',
                plaintext: content,
                ...(options.facets && { facets: options.facets })
            };
    }
    return block;
}

async function convertEntries() {
    const button = document.getElementById('convertBtn');
    button.disabled = true;
    button.textContent = '🔄 Converting...';

    try {
        const pubName = document.getElementById('pubName').value.trim();
        const basePath = document.getElementById('basePath').value.trim();
        const pubDescription = document.getElementById('pubDescription').value.trim();
        const showInDiscover = document.getElementById('showInDiscover').value === 'true';
        const showComments = document.getElementById('showComments').value === 'true';
        const authorDid = document.getElementById('authorDid').value.trim();
        const whitewindJson = document.getElementById('whitewindJson').value.trim();

        if (!pubName || !authorDid || !whitewindJson) {
            throw new Error('Please fill in all required fields (marked with *)');
        }

        let whitewindEntries;
        try {
            const parsedJson = JSON.parse(whitewindJson);
            if (parsedJson && typeof parsedJson === 'object' && parsedJson.records && Array.isArray(parsedJson.records)) {
                whitewindEntries = parsedJson.records;
            } else if (Array.isArray(parsedJson)) {
                whitewindEntries = parsedJson;
            } else {
                throw new Error('Invalid JSON input. Please provide a JSON array or an object with a "records" key containing an array.');
            }
        } catch (e) {
            throw new Error('Invalid JSON input. Please provide a valid JSON array or object with a "records" key.');
        }

        const rkey = generateTID();
        const primaryRgb = hexToRgb(document.getElementById('primaryColor').value);
        const backgroundRgb = hexToRgb(document.getElementById('backgroundColor').value);
        const pageBackgroundRgb = hexToRgb(document.getElementById('pageBackground').value);

        const publicationRecord = {
            $type: 'pub.leaflet.publication',
            rkey: rkey,
            name: pubName,
            ...(basePath && { base_path: basePath }),
            ...(pubDescription && { description: pubDescription }),
            preferences: {
                showInDiscover,
                showComments
            },
            theme: {
                primary: { $type: 'pub.leaflet.theme.color#rgb', ...primaryRgb },
                backgroundColor: { $type: 'pub.leaflet.theme.color#rgb', ...backgroundRgb },
                pageBackground: { $type: 'pub.leaflet.theme.color#rgb', ...pageBackgroundRgb },
                showPageBackground: document.getElementById('showPageBg').value === 'true'
            }
        };

        const documentRecords = whitewindEntries.map(entry => {
            const content = entry.value?.content || entry.content;
            const title = entry.value?.title || entry.title;
            const subtitle = entry.value?.subtitle || entry.subtitle;
            const createdAt = entry.value?.createdAt || entry.createdAt;

            if (!content) {
                throw new Error('One or more WhiteWind entries is missing a "content" field');
            }
            const blocks = parseMarkdownToBlocks(content, authorDid);
            const publicationUri = `at://${authorDid}/pub.leaflet.publication/${rkey}`;

            return {
                $type: 'pub.leaflet.document',
                title: title || 'Untitled Post',
                ...(subtitle && { description: subtitle }),
                author: authorDid,
                publication: publicationUri,
                ...(createdAt && { publishedAt: createdAt }),
                pages: [{
                    $type: 'pub.leaflet.pages.linearDocument',
                    blocks: blocks
                }]
            };
        });

        // Display results and enable output section
        document.getElementById('publicationOutput').textContent = JSON.stringify(publicationRecord, null, 2);
        document.getElementById('documentOutput').textContent = JSON.stringify(documentRecords, null, 2);
        document.getElementById('successMessage').style.display = 'block';
        document.getElementById('outputSection').style.display = 'block';

        // Scroll to the output section for better user experience
        document.getElementById('outputSection').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        // Display error message to the user
        alert('Error: ' + error.message);
    } finally {
        // Reset button state regardless of success or failure
        button.disabled = false;
        button.textContent = '🔄 Convert to Leaflet';
    }
}

function downloadZip() {
    const zip = new JSZip();

    const publicationContent = document.getElementById('publicationOutput').textContent;
    zip.file('00.json', publicationContent);

    const documentContent = JSON.parse(document.getElementById('documentOutput').textContent);
    documentContent.forEach((doc, index) => {
        const filename = `${index + 1}.json`;
        zip.file(filename, JSON.stringify(doc, null, 2));
    });

    zip.generateAsync({ type: 'blob' }).then(function (content) {
        saveAs(content, 'leaflet_records.zip');

        // Update button text temporarily
        const button = document.getElementById('zipDownloadBtn');
        const originalText = button.textContent;
        button.textContent = '✅ Downloaded!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}