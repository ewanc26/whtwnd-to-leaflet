<script lang="ts">
	import '../app.css';
	import '../lib/styles.css';
	import {
		generateTID,
		hexToRgb,
		convertEntriesToLeaflet
	} from '$lib/convert';
	import {
		login,
		logout,
		isLoggedIn,
		getCurrentUserHandle,
		getCurrentUserDid,
		getCurrentPdsUrl,
		fetchWhiteWindEntries,
		publishToAtProto
	} from '$lib/auth';
	import { onMount } from 'svelte';

	// Auth state
	let loggedIn = $state(false);
	let currentHandle = $state<string | null>(null);
	let currentDid = $state<string | null>(null);
	let currentPds = $state<string | null>(null);

	// Login form
	let loginIdentifier = $state('');
	let loginPassword = $state('');
	let loggingIn = $state(false);
	let loginError = $state('');

	// Mode selection
	let mode = $state<'manual' | 'auto'>('manual');

	// Form state
	let useExisting = $state('false');
	let existingRkey = $state('');
	let pubName = $state('');
	let basePath = $state('');
	let pubDescription = $state('');
	let showInDiscover = $state('true');
	let showComments = $state('true');
	let primaryColor = $state('#667eea');
	let backgroundColor = $state('#ffffff');
	let pageBackground = $state('#f8fafc');
	let showPageBg = $state('false');
	let whitewindJson = $state('');
	let authorDid = $state('');
	let pdsUrl = $state('https://bsky.social');

	// Auto-fetch state
	let fetching = $state(false);
	let fetchError = $state('');

	// Conversion state
	let converting = $state(false);
	let publicationOutput = $state('');
	let documentOutput = $state('');
	let showOutput = $state(false);

	// Publishing state
	let publishing = $state(false);
	let publishProgress = $state(0);
	let publishTotal = $state(0);
	let publishMessage = $state('');
	let publishComplete = $state(false);

	onMount(() => {
		loggedIn = isLoggedIn();
		if (loggedIn) {
			currentHandle = getCurrentUserHandle();
			currentDid = getCurrentUserDid();
			currentPds = getCurrentPdsUrl();
			
			// Pre-fill DID and PDS if logged in
			if (currentDid) authorDid = currentDid;
			if (currentPds) pdsUrl = currentPds;
		}
	});

	function alertMsg(msg: string) {
		alert(msg);
	}

	async function handleLogin() {
		if (!loginIdentifier || !loginPassword) {
			loginError = 'Please enter your handle and app password';
			return;
		}

		loggingIn = true;
		loginError = '';

		try {
			await login(loginIdentifier, loginPassword);
			loggedIn = true;
			currentHandle = getCurrentUserHandle();
			currentDid = getCurrentUserDid();
			currentPds = getCurrentPdsUrl();
			
			// Pre-fill DID and PDS
			if (currentDid) authorDid = currentDid;
			if (currentPds) pdsUrl = currentPds;
			
			loginIdentifier = '';
			loginPassword = '';
		} catch (e: any) {
			loginError = e.message;
		} finally {
			loggingIn = false;
		}
	}

	function handleLogout() {
		logout();
		loggedIn = false;
		currentHandle = null;
		currentDid = null;
		currentPds = null;
		mode = 'manual';
	}

	async function handleFetchEntries() {
		fetching = true;
		fetchError = '';

		try {
			const entries = await fetchWhiteWindEntries();
			
			if (entries.length === 0) {
				fetchError = 'No WhiteWind entries found for this account';
				return;
			}

			// Pre-fill the JSON textarea with fetched entries
			whitewindJson = JSON.stringify(entries, null, 2);
			alertMsg(`Fetched ${entries.length} WhiteWind entries!`);
		} catch (e: any) {
			fetchError = e.message;
		} finally {
			fetching = false;
		}
	}

	async function convertEntries() {
		converting = true;
		try {
			if (!authorDid || !whitewindJson) {
				alertMsg('Please fill Author DID and paste WhiteWind JSON entries.');
				return;
			}

			if (useExisting === 'true' && !existingRkey) {
				alertMsg('Please provide an existing publication rkey.');
				return;
			}

			if (useExisting === 'false' && !pubName) {
				alertMsg('Please fill Publication Name.');
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
					throw new Error(
						'JSON must be an array of entries or an object with a `records`/`data` array'
					);
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
				preferences: {
					showInDiscover: showInDiscover === 'true',
					showComments: showComments === 'true'
				},
				theme: {
					primary: { $type: 'pub.leaflet.theme.color#rgb', ...primaryRgb },
					backgroundColor: { $type: 'pub.leaflet.theme.color#rgb', ...backgroundRgb },
					pageBackground: { $type: 'pub.leaflet.theme.color#rgb', ...pageBackgroundRgb },
					showPageBackground: showPageBg === 'true'
				}
			};

			const documents = await convertEntriesToLeaflet(
				publicationRecord,
				entries,
				authorDid,
				pdsUrl,
				useExisting === 'true' ? existingRkey : undefined
			);

			if (useExisting === 'false') {
				publicationOutput = JSON.stringify(publicationRecord, null, 2);
			} else {
				publicationOutput = `at://${authorDid}/pub.leaflet.publication/${existingRkey}`;
			}
			documentOutput = JSON.stringify(documents, null, 2);
			showOutput = true;
			publishComplete = false;

			// scroll into view
			setTimeout(() => {
				const el = document.getElementById('outputSection');
				el?.scrollIntoView({ behavior: 'smooth' });
			}, 50);
		} finally {
			converting = false;
		}
	}

	async function handlePublish() {
		if (!loggedIn) {
			alertMsg('Please log in to publish to AT Protocol');
			return;
		}

		if (!showOutput) {
			alertMsg('Please convert your entries first');
			return;
		}

		publishing = true;
		publishComplete = false;
		publishMessage = '';

		try {
			const publicationRecord = useExisting === 'false' ? JSON.parse(publicationOutput) : null;
			const documents = JSON.parse(documentOutput);

			await publishToAtProto(
				publicationRecord,
				documents,
				(current, total, message) => {
					publishProgress = current;
					publishTotal = total;
					publishMessage = message;
				}
			);

			publishComplete = true;
			publishMessage = `✅ Successfully published ${documents.length} documents!`;
		} catch (e: any) {
			publishMessage = `❌ Publishing failed: ${e.message}`;
		} finally {
			publishing = false;
		}
	}

	async function downloadZip() {
		const JSZip = (await import('jszip')).default;
		const { saveAs } = await import('file-saver');
		const zip = new JSZip();
		
		if (useExisting === 'false') {
			zip.file('00.json', publicationOutput);
		}
		
		const docs = JSON.parse(documentOutput || '[]');
		docs.forEach((d: any, i: number) => zip.file(`${useExisting === 'true' ? i : i + 1}.json`, JSON.stringify(d, null, 2)));
		const blob = await zip.generateAsync({ type: 'blob' });
		saveAs(blob, `${pubName || existingRkey || 'publication'}-leaflet.zip`);
	}
</script>

<header>
	<h1>🍃 WhiteWind → Leaflet Converter</h1>
	<p>Convert your WhiteWind blog entries to Leaflet publication format</p>
	{#if loggedIn}
		<div class="auth-status">
			<span>✅ Logged in as <strong>{currentHandle}</strong></span>
			<button class="btn-logout" onclick={handleLogout}>Logout</button>
		</div>
	{/if}
</header>

<div class="container">
	<main class="main-content">
		{#if !loggedIn}
		<section class="step login-section">
			<h2><span class="step-number">🔐</span>Login (Optional)</h2>
			<div class="info-box">
				<p><strong>New Feature:</strong> Log in to automatically fetch your WhiteWind entries and publish directly to Leaflet!</p>
				<p>You can still use the manual mode without logging in.</p>
			</div>
			<div class="form-group">
				<label for="loginIdentifier">AT Protocol Handle or DID</label>
				<input
					id="loginIdentifier"
					bind:value={loginIdentifier}
					type="text"
					placeholder="alice.bsky.social or did:plc:..."
				/>
			</div>
			<div class="form-group">
				<label for="loginPassword">App Password</label>
				<input
					id="loginPassword"
					bind:value={loginPassword}
					type="password"
					placeholder="Your app password"
				/>
				<div class="example">
					Create an app password in your AT Protocol client settings. Never use your main password!
				</div>
			</div>
			{#if loginError}
				<div class="error">{loginError}</div>
			{/if}
			<button class="btn-primary" onclick={handleLogin} disabled={loggingIn}>
				{loggingIn ? '🔄 Logging in...' : '🔐 Login'}
			</button>
		</section>
		{/if}

		{#if loggedIn}
		<section class="step">
			<h2><span class="step-number">⚙️</span>Mode Selection</h2>
			<div class="mode-selector">
				<button
					class="mode-button {mode === 'auto' ? 'active' : ''}"
					onclick={() => (mode = 'auto')}
				>
					<span class="mode-icon">🚀</span>
					<span class="mode-title">Auto Mode</span>
					<span class="mode-desc">Fetch & publish automatically</span>
				</button>
				<button
					class="mode-button {mode === 'manual' ? 'active' : ''}"
					onclick={() => (mode = 'manual')}
				>
					<span class="mode-icon">📝</span>
					<span class="mode-title">Manual Mode</span>
					<span class="mode-desc">Paste JSON manually</span>
				</button>
			</div>
		</section>
		{/if}

		{#if loggedIn && mode === 'auto'}
		<section class="step">
			<h2><span class="step-number">📥</span>Fetch WhiteWind Entries</h2>
			<div class="info-box">
				<p>Click the button below to automatically fetch all your WhiteWind blog entries.</p>
			</div>
			{#if fetchError}
				<div class="error">{fetchError}</div>
			{/if}
			<button class="btn-primary" onclick={handleFetchEntries} disabled={fetching}>
				{fetching ? '🔄 Fetching entries...' : '📥 Fetch My WhiteWind Entries'}
			</button>
		</section>
		{/if}

		<section class="step">
			<h2><span class="step-number">1</span>Publication Setup</h2>
			<div class="form-group">
				<label for="useExisting">Add to Existing Publication?</label>
				<select id="useExisting" bind:value={useExisting}>
					<option value="false">No - Create New Publication</option>
					<option value="true">Yes - Use Existing Publication</option>
				</select>
				<div class="example">Choose whether to create a new publication or add posts to an existing one</div>
			</div>
			{#if useExisting === 'true'}
				<div class="form-group">
					<label for="existingRkey">Existing Publication Rkey*</label>
					<input id="existingRkey" bind:value={existingRkey} type="text" placeholder="3m3x4bgbsh22k" />
					<div class="example">The rkey from your existing publication URI (e.g., from at://did:plc:.../pub.leaflet.publication/<strong>3m3x4bgbsh22k</strong>)</div>
				</div>
			{:else}
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
			{/if}
		</section>

		{#if useExisting === 'false'}
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
		{/if}

		<section class="step">
			<h2><span class="step-number">{useExisting === 'true' ? '2' : '3'}</span>WhiteWind Blog Entries</h2>
			{#if mode === 'auto' && loggedIn}
				<div class="info-box">
					<p>Your entries have been fetched automatically. Review the JSON below or edit if needed.</p>
				</div>
			{:else}
				<div class="warning"><strong>Note:</strong> Paste a JSON array of your WhiteWind blog entries below. The converter will automatically handle markdown parsing, AT-URI conversion, and schema transformation for all entries.</div>
			{/if}
			<div class="form-group">
				<label for="whitewindJson">WhiteWind Entries JSON*</label>
				<textarea id="whitewindJson" class="textarea-large" bind:value={whitewindJson} placeholder='Paste your WhiteWind entries JSON array here...'></textarea>
				<div class="example">Example: [&#123;"content": "# Post 1\n\nContent...", "title": "My First Post"&#125;]</div>
			</div>
			<div class="grid">
				<div class="form-group">
					<label for="authorDid">Author DID*</label>
					<input id="authorDid" bind:value={authorDid} type="text" placeholder="did:plc:..." readonly={loggedIn} />
					<div class="example">Format: did:plc:example123... or did:web:example.com</div>
				</div>
				<div class="form-group">
					<label for="pdsUrl">PDS URL*</label>
					<input id="pdsUrl" bind:value={pdsUrl} type="url" placeholder="https://bsky.social" />
					<div class="example">The Personal Data Server URL (needed for fetching image dimensions)</div>
				</div>
			</div>
			<button class="btn-primary" onclick={convertEntries} disabled={converting}>
				{converting ? '🔄 Converting...' : '🔄 Convert to Leaflet'}
			</button>
		</section>

		<section class="step" id="outputSection" style:display={showOutput ? 'block' : 'none'}>
			<h2><span class="step-number">{useExisting === 'true' ? '3' : '4'}</span>Conversion Results</h2>
			<div class="success" style:display={showOutput ? 'block' : 'none'}>✅ Conversion completed successfully!</div>
			
			{#if loggedIn}
			<div class="publish-section">
				<h3>🚀 Publish to AT Protocol</h3>
				<p>Click below to automatically publish your converted entries to Leaflet on the AT Protocol.</p>
				{#if publishMessage}
					<div class={publishComplete ? 'success' : 'error'}>{publishMessage}</div>
				{/if}
				{#if publishing}
					<div class="progress-bar">
						<div class="progress-fill" style="width: {(publishProgress / publishTotal) * 100}%"></div>
					</div>
					<p class="progress-text">{publishMessage} ({publishProgress}/{publishTotal})</p>
				{/if}
				<button class="btn-primary" onclick={handlePublish} disabled={publishing || publishComplete}>
					{publishing ? '🚀 Publishing...' : publishComplete ? '✅ Published!' : '🚀 Publish to Leaflet'}
				</button>
			</div>
			{/if}

			<div class="download-section">
				<h3>📦 Download Your Converted Files</h3>
				{#if useExisting === 'true'}
					<p>Download all documents as a ZIP archive. Each document will be numbered as <code>0.json</code>, <code>1.json</code>, <code>2.json</code>, etc.</p>
				{:else}
					<p>Download all files as a ZIP archive with the publication record as <code>00.json</code> and each document as <code>1.json</code>, <code>2.json</code>, etc.</p>
				{/if}
				<button class="btn-secondary" onclick={downloadZip}>⬇️ Download ZIP Archive</button>
			</div>
			{#if useExisting === 'false'}
			<div class="output-card">
				<h3>Publication Record Preview:</h3>
				<pre>{publicationOutput}</pre>
			</div>
			{:else}
			<div class="output-card">
				<h3>Target Publication URI:</h3>
				<pre>{publicationOutput}</pre>
			</div>
			{/if}
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

<style>
	.auth-status {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 1rem;
		padding: 0.75rem;
		background: var(--success-bg);
		border: 1px solid var(--success-border);
		border-radius: 8px;
	}

	.btn-logout {
		padding: 0.5rem 1rem;
		background: var(--danger);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.btn-logout:hover {
		background: var(--danger-hover);
	}

	.login-section {
		background: var(--info-bg);
		border: 2px solid var(--info-border);
	}

	.info-box {
		background: var(--info-bg);
		border: 1px solid var(--info-border);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}

	.info-box p {
		margin: 0.5rem 0;
	}

	.mode-selector {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1rem;
	}

	.mode-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem;
		background: white;
		border: 2px solid var(--border-color);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.mode-button:hover {
		border-color: var(--primary);
		transform: translateY(-2px);
	}

	.mode-button.active {
		border-color: var(--primary);
		background: var(--primary-light);
	}

	.mode-icon {
		font-size: 2rem;
	}

	.mode-title {
		font-weight: 600;
		font-size: 1.1rem;
	}

	.mode-desc {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.publish-section {
		background: var(--primary-light);
		border: 2px solid var(--primary);
		padding: 1.5rem;
		border-radius: 12px;
		margin-bottom: 1.5rem;
	}

	.publish-section h3 {
		margin-top: 0;
	}

	.progress-bar {
		width: 100%;
		height: 24px;
		background: white;
		border-radius: 12px;
		overflow: hidden;
		margin: 1rem 0;
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--primary), var(--primary-dark));
		transition: width 0.3s ease;
	}

	.progress-text {
		text-align: center;
		font-weight: 500;
		color: var(--text-secondary);
	}
</style>
