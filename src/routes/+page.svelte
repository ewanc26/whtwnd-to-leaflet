<script lang="ts">
	import '../app.css';
	import '../lib/styles.css';
	import { generateTID, hexToRgb, convertBlobUrlToAtUri, parseMarkdownToBlocks, convertEntriesToLeaflet } from '$lib/convert';

	// Form state
	let pubName = '';
	let basePath = '';
	let pubDescription = '';
	let showInDiscover: string = 'true';
	let showComments: string = 'true';
	let primaryColor = '#667eea';
	let backgroundColor = '#ffffff';
	let pageBackground = '#f8fafc';
	let showPageBg: string = 'false';
	let whitewindJson = '';
	let authorDid = '';

	let converting = false;
	let publicationOutput = '';
	let documentOutput = '';
	let showOutput = false;

	function alertMsg(msg: string) {
		// simple wrapper for alerts; could be replaced with nicer UI
		alert(msg);
	}

	async function convertEntries() {
		converting = true;
		try {
			if (!pubName || !authorDid || !whitewindJson) {
				alertMsg('Please fill Publication Name, Author DID and paste WhiteWind JSON entries.');
				return;
			}

					let entries: any[];
					try {
						const parsed = JSON.parse(whitewindJson);
						if (Array.isArray(parsed)) {
							entries = parsed;
						} else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.records)) {
							entries = parsed.records;
						} else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
							entries = parsed.data;
						} else {
							throw new Error('JSON must be an array of entries or an object with a `records`/`data` array');
						}
					} catch (e: any) {
						alertMsg('Invalid JSON: ' + e.message);
						return;
					}

			const rkey = generateTID();
			const primaryRgb = hexToRgb(primaryColor) || { r: 102, g: 126, b: 234 };
			const backgroundRgb = hexToRgb(backgroundColor) || { r: 255, g: 255, b: 255 };
			const pageBackgroundRgb = hexToRgb(pageBackground) || { r: 248, g: 250, b: 252 };

			const publicationRecord = {
				$type: 'pub.leaflet.publication',
				rkey,
				name: pubName,
				...(basePath && { base_path: basePath }),
				...(pubDescription && { description: pubDescription }),
				preferences: { showInDiscover: showInDiscover === 'true', showComments: showComments === 'true' },
				theme: {
					primary: { $type: 'pub.leaflet.theme.color#rgb', ...primaryRgb },
					backgroundColor: { $type: 'pub.leaflet.theme.color#rgb', ...backgroundRgb },
					pageBackground: { $type: 'pub.leaflet.theme.color#rgb', ...pageBackgroundRgb },
					  showPageBackground: showPageBg === 'true'
				}
			};

			const documents = convertEntriesToLeaflet(publicationRecord, entries, authorDid);

			publicationOutput = JSON.stringify(publicationRecord, null, 2);
			documentOutput = JSON.stringify(documents, null, 2);
			showOutput = true;
			// scroll into view
			setTimeout(() => {
				const el = document.getElementById('outputSection');
				el?.scrollIntoView({ behavior: 'smooth' });
			}, 50);
		} finally {
			converting = false;
		}
	}

	async function downloadZip() {
		const JSZip = (await import('jszip')).default;
		const { saveAs } = await import('file-saver');
		const zip = new JSZip();
		zip.file('00.json', publicationOutput);
		const docs = JSON.parse(documentOutput || '[]');
		docs.forEach((d: any, i: number) => zip.file(`${i + 1}.json`, JSON.stringify(d, null, 2)));
		const blob = await zip.generateAsync({ type: 'blob' });
		saveAs(blob, `${pubName || 'publication'}-leaflet.zip`);
	}
</script>

<header>
	<h1>🍃 WhiteWind → Leaflet Converter</h1>
	<p>Convert your WhiteWind blog entries to Leaflet publication format</p>
</header>

<div class="container">
	<main class="main-content">
		<section class="step">
			<h2><span class="step-number">1</span>Publication Setup</h2>
			<div class="grid">
				<div class="form-group">
					<label for="pubName">Publication Name*</label>
					<input id="pubName" bind:value={pubName} type="text" placeholder="My Awesome Blog" />
				</div>
				<div class="form-group">
					<label for="basePath">Base Path</label>
					<input id="basePath" bind:value={basePath} type="url" placeholder="myblog.com" />
				</div>
			</div>
			<div class="form-group">
				<label for="pubDescription">Publication Description</label>
				<textarea id="pubDescription" bind:value={pubDescription} placeholder="Describe your publication..."></textarea>
			</div>
			<div class="grid">
				<div class="form-group">
					<label for="showInDiscover">Show in Discover</label>
								<select id="showInDiscover" bind:value={showInDiscover}>
									<option value="true">Yes</option>
									<option value="false">No</option>
								</select>
				</div>
				<div class="form-group">
					<label for="showComments">Enable Comments</label>
								<select id="showComments" bind:value={showComments}>
									<option value="true">Yes</option>
									<option value="false">No</option>
								</select>
				</div>
			</div>
		</section>

		<section class="step">
			<h2><span class="step-number">2</span>Theme Configuration</h2>
			<div class="grid">
				<div class="form-group">
					<label for="primaryColor">Primary Color</label>
					<input id="primaryColor" bind:value={primaryColor} type="color" />
				</div>
				<div class="form-group">
					<label for="backgroundColor">Background Color</label>
					<input id="backgroundColor" bind:value={backgroundColor} type="color" />
				</div>
			</div>
			<div class="grid">
				<div class="form-group">
					<label for="pageBackground">Page Background</label>
					<input id="pageBackground" bind:value={pageBackground} type="color" />
				</div>
				<div class="form-group">
					<label for="showPageBg">Show Page Background</label>
								<select id="showPageBg" bind:value={showPageBg}>
									<option value="false">No</option>
									<option value="true">Yes</option>
								</select>
				</div>
			</div>
		</section>

		<section class="step">
			<h2><span class="step-number">3</span>WhiteWind Blog Entries</h2>
			<div class="warning"><strong>Note:</strong> Paste a JSON array of your WhiteWind blog entries below. The converter will automatically handle markdown parsing, AT-URI conversion, and schema transformation for all entries.</div>
			<div class="form-group">
				<label for="whitewindJson">WhiteWind Entries JSON*</label>
				<textarea id="whitewindJson" class="textarea-large" bind:value={whitewindJson} placeholder='Paste your WhiteWind entries JSON array here...'></textarea>
				<div class="example">Example: [&#123;"content": "# Post 1\n\nContent...", "title": "My First Post"&#125;]</div>
			</div>
			<div class="form-group">
				<label for="authorDid">Author DID*</label>
				<input id="authorDid" bind:value={authorDid} type="text" placeholder="did:plc:..." />
				<div class="example">Format: did:plc:example123... or did:web:example.com</div>
			</div>
			<button class="btn-primary" on:click|preventDefault={convertEntries} disabled={converting}>{converting ? '🔄 Converting...' : '🔄 Convert to Leaflet'}</button>
		</section>

		<section class="step" id="outputSection" style:display={showOutput ? 'block' : 'none'}>
			<h2><span class="step-number">4</span>Conversion Results</h2>
			<div class="success" style:display={showOutput ? 'block' : 'none'}>✅ Conversion completed successfully!</div>
			<div class="download-section">
				<h3>📦 Download Your Converted Files</h3>
				<p>Download all files as a ZIP archive with the publication record as <code>00.json</code> and each document as <code>1.json</code>, <code>2.json</code>, etc.</p>
				<button class="btn-secondary" on:click={downloadZip}>⬇️ Download ZIP Archive</button>
			</div>
			<div class="output-card">
				<h3>Publication Record Preview:</h3>
				<pre>{publicationOutput}</pre>
			</div>
			<div class="output-card">
				<h3>Document Records Preview:</h3>
				<pre>{documentOutput}</pre>
			</div>
		</section>
	</main>
</div>

<footer>
	<p>Built with 🍃 by <a href="https://ewancroft.uk" target="_blank" rel="noopener">Ewan</a> • <a href="https://github.com/ewanc26/whtwnd-to-leaflet" target="_blank" rel="noopener">Source Code</a> (GPL-3.0)</p>
	<p>Not affiliated with <a href="https://whtwnd.com" target="_blank" rel="noopener">WhiteWind</a> or <a href="https://leaflet.pub" target="_blank" rel="noopener">Leaflet</a>.</p>
</footer>
