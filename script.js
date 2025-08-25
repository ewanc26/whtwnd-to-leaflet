// Base32-sortable character set for TID encoding
        const BASE32_SORTABLE = '234567abcdefghijklmnopqrstuvwxyz';

        /**
         * Generate a random 10-bit clock identifier
         */
        function generateClockId() {
            return Math.floor(Math.random() * 1024); // 2^10 = 1024
        }

        /**
         * Convert a number to base32-sortable encoding
         */
        function toBase32Sortable(num) {
            if (num === 0n) {
                return '2222222222222';
            }
            
            let result = '';
            while (num > 0n) {
                result = BASE32_SORTABLE[Number(num % 32n)] + result;
                num = num / 32n;
            }
            
            // Pad to 13 characters for consistent TID length
            return result.padStart(13, '2');
        }

        /**
         * Generate a TID for the current timestamp
         */
        function generateTID() {
            // Get current timestamp in microseconds since UNIX epoch
            const nowMs = Date.now();
            const nowMicroseconds = BigInt(nowMs * 1000); // Convert to microseconds
            
            // Generate random clock identifier (10 bits)
            const clockId = generateClockId();
            
            // Combine timestamp (53 bits) and clock identifier (10 bits)
            // The top bit is always 0, so we have 63 bits in total
            const tidBigInt = (nowMicroseconds << 10n) | BigInt(clockId);
            
            return toBase32Sortable(tidBigInt);
        }

        /**
         * Converts a hex color string to an RGB object.
         * @param {string} hex - The hex color code (e.g., "#ffffff").
         * @returns {object|null} An object with r, g, and b properties, or null if invalid.
         */
        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
        
        /**
         * Converts WhiteWind blob URLs to AT-URI format.
         * @param {string} url - The URL from the WhiteWind entry.
         * @param {string} did - The author's DID.
         * @returns {string} The converted AT-URI or the original URL if no match.
         */
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
        
        /**
         * Parses a block of text for markdown facets (bold, italic, link, code)
         * and returns both the cleaned plaintext and the facet objects.
         * @param {string} text - The text to parse.
         * @param {string} authorDid - The author's DID for AT-URI conversion.
         * @returns {object} An object with `plaintext` and `facets` properties.
         */
        function parseRichText(text, authorDid) {
            let plaintext = text;
            const facets = [];
            const utf8Encoder = new TextEncoder();
            
            // Note: We need to handle links first, as they contain other syntax
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

            // Apply replacements in reverse to avoid index shifting
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

            // Other facets on the cleaned plaintext
            const otherFacets = [];

            // Bold **text**
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

            // Italic *text*
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

            // Inline code `text`
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

            // Combine all facets and sort them by start index
            const allFacets = [...facets, ...otherFacets];
            allFacets.sort((a, b) => a.index.byteStart - b.index.byteStart);
            
            // Clean up the plaintext from bold, italic, and code markdown
            plaintext = plaintext.replace(boldRegex, '$1');
            plaintext = plaintext.replace(italicRegex, '$1');
            plaintext = plaintext.replace(codeRegex, '$1');
            
            return { plaintext, facets: allFacets.length > 0 ? allFacets : undefined };
        }
        
        /**
         * Parses markdown content into a series of Leaflet document blocks.
         * @param {string} content - The markdown content to parse.
         * @param {string} authorDid - The author's DID for AT-URI conversion.
         * @returns {Array} An array of Leaflet block objects.
         */
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
        
        /**
         * Creates a single Leaflet block object with the correct schema and content.
         * @param {string} type - The type of block (e.g., 'text', 'header').
         * @param {string} content - The plaintext content of the block.
         * @param {string} authorDid - The author's DID for facet parsing.
         * @param {object} options - Additional options for the block (e.g., header level, facets).
         * @returns {object} A Leaflet block object.
         */
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
        
        /**
         * Main conversion function triggered by the button.
         * It validates input, parses the WhiteWind JSON, converts each entry
         * to a Leaflet document record, and displays the results.
         */
        async function convertEntries() {
            const button = document.getElementById('convertBtn');
            button.disabled = true;
            button.textContent = '🔄 Converting...';
            
            try {
                // Get form data
                const pubName = document.getElementById('pubName').value.trim();
                const basePath = document.getElementById('basePath').value.trim();
                const pubDescription = document.getElementById('pubDescription').value.trim();
                const showInDiscover = document.getElementById('showInDiscover').value === 'true';
                const showComments = document.getElementById('showComments').value === 'true';
                const authorDid = document.getElementById('authorDid').value.trim();
                const whitewindJson = document.getElementById('whitewindJson').value.trim();
                
                // Input validation
                if (!pubName || !authorDid || !whitewindJson) {
                    throw new Error('Please fill in all required fields (marked with *)');
                }
                
                let whitewindEntries;
                try {
                    const parsedJson = JSON.parse(whitewindJson);
                    // Check if the JSON is an object with a 'records' key or a direct array
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
                
                // Generate a unique TID for the publication record
                const rkey = generateTID();

                // Generate the main publication record
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
                
                // Generate document records for each entry in the input array
                const documentRecords = whitewindEntries.map(entry => {
                    const content = entry.value?.content || entry.content;
                    const title = entry.value?.title || entry.title;
                    const subtitle = entry.value?.subtitle || entry.subtitle;
                    const createdAt = entry.value?.createdAt || entry.createdAt;

                    // Check for required 'content' field
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
        
        /**
         * Copies the content of a specified HTML element to the clipboard.
         * @param {string} elementId - The ID of the element to copy.
         */
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;
            
            navigator.clipboard.writeText(text).then(() => {
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = '✅ Copied!';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
                alert('Failed to copy to clipboard');
            });
        }

        /**
         * Downloads the content of a specified HTML element as a JSON file.
         * @param {string} elementId - The ID of the element to download.
         * @param {string} filename - The name for the downloaded file.
         */
        function downloadFile(elementId, filename) {
            const element = document.getElementById(elementId);
            const content = element.textContent;
            
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);

            const button = event.target;
            const originalText = button.textContent;
            button.textContent = '✅ Downloaded!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }

        /**
         * Creates a ZIP archive containing the publication record and each
         * document record, and then downloads it.
         */
        function downloadZip() {
            const zip = new JSZip();

            const publicationContent = document.getElementById('publicationOutput').textContent;
            zip.file('00.json', publicationContent);

            const documentContent = JSON.parse(document.getElementById('documentOutput').textContent);
            documentContent.forEach((doc, index) => {
                const filename = `${index + 1}.json`;
                zip.file(filename, JSON.stringify(doc, null, 2));
            });

            zip.generateAsync({ type: 'blob' }).then(function(content) {
                saveAs(content, 'leaflet_records.zip');
            });
        }