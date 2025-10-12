<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isLoggedIn, getCurrentUserDid, getCurrentUserHandle, fetchWhiteWindEntries, logout } from '$lib/auth/auth';
	import { generateTID, hexToRgb, convertEntriesToLeaflet } from '$lib/convert';

	let loading = true;
	let entries: any[] = [];
	let errorMessage = '';

	let pubName = '';
	let basePath = '';
	let pubDescription = '';
	let showInDiscover: string = 'true';
	let showComments: string = 'true';
	let primaryColor = '#667eea';
	let backgroundColor = '#ffffff';
	let pageBackground = '#f8fafc';
	let showPageBg: string = 'false';

	let converting = false;
	let publicationOutput = '';
	let documentOutput = '';
	let showOutput = false;
	let authorDid = '';
	let userHandle = '';

	onMount(async () => {
		if (!isLoggedIn()) {
			goto('/login');
			return;
		}

		authorDid = getCurrentUserDid() || '';
		userHandle = getCurrentUserHandle() || '';
		
		if (!authorDid) {
			errorMessage = 'Could not retrieve your DID. Please log in again.';
			loading = false;
			return;
		}

		try {
			entries = await fetchWhiteWindEntries();
			if (entries.length === 0) {
				errorMessage = 'No WhiteWind entries found. Create some blog posts first!';
			} else {
				pubName = `${userHandle}'s Blog`;
			}
		} catch (e: any) {
			errorMessage = e.message || 'Failed to fetch WhiteWind entries';
		} finally {
			loading = false;
		}
	});

	async function convertEntries() {
		converting = true;
		try {
			if (!pubName) {
				alert('Please provide a Publication Name.');
				return;
			}
			if (entries.length === 0) {
				alert('No entries to convert!');
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

			setTimeout(() => document.getElementById('outputSection')?.scrollIntoView({ behavior: 'smooth' }), 50);
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

<div class="container">
	<header>
		<h1>🍃 WhiteWind → Leaflet Converter</h1>
		<p>Convert your WhiteWind blog entries to Leaflet format</p>
		{#if userHandle}
			<p style="margin-top: 0.5rem; opacity: 0.8;">
				Logged in as <strong>@{userHandle}</strong>
				<button on:click={logout} style="margin-left: 1rem; text-decoration: underline; cursor: pointer; background: none; border: none; color: inherit;">
					Logout
				</button>
			</p>
		{/if}
	</header>

	<main class="main-content">
		{#if loading}
			<div class="step" style="text-align: center; padding: 3rem;">
				<div style="display: inline-block; width: 3rem; height: 3rem; border: 3px solid var(--border-color); border-top-color: var(--button-bg); border-radius: 50%; animation: spin 1s linear infinite;"></div>
				<p style="margin-top: 1rem; font-size: 1.1rem;">Loading your WhiteWind entries...</p>
			</div>
		{:else if errorMessage}
			<div class="step">
				<div class="warning"><strong>⚠️ {errorMessage}</strong></div>
			</div>
		{:else}
			<section class="step">
				<h2><span class="step-number">1</span>Your WhiteWind Entries</h2>
				<div class="success">
					Found <strong>{entries.length}</strong> blog {entries.length === 1 ? 'entry' : 'entries'} ready to convert!
				</div>
				<div style="max-height: 400px; overflow-y: auto; margin-top: 1rem;">
					{#each entries as entry, i}
						<div class="output-card" style="margin-bottom: 0.75rem;">
							<h3>{entry.value?.title || entry.title || `Entry ${i + 1}`}</h3>
							<p style="opacity: 0.8; font-size: 0.9rem;">
								{(entry.value?.content || entry.content || '').substring(0, 150)}{(entry.value?.content || entry.content || '').length > 150 ? '...' : ''}
							</p>
						</div>
					{/each}
				</div>
			</section>

			<section class="step">
				<h2><span class="step-number">2</span>Publication Setup</h2>
				<div class="form-group">
					<label for="pubName">Publication Name*</label>
					<input id="pubName" bind:value={pubName} type="text" placeholder="My Awesome Blog" />
				</div>
				<div class="form-group">
					<label for="basePath">Base Path</label>
					<input id="basePath" bind:value={basePath} type="text" placeholder="myblog.com" />
				</div>
				<div class="form-group">
					<label for="pubDescription">Description</label>
					<textarea id="pubDescription" bind:value={pubDescription} placeholder="Describe your publication..."></textarea>
				</div>
			</section>

			<section class="step">
				<h2><span class="step-number">3</span>Theme Settings</h2>
				<div class="form-group">
					<label for="primaryColor">Primary Colour</label>
					<input id="primaryColor" bind:value={primaryColor} type="color" />
				</div>
				<div class="form-group">
					<label for="backgroundColor">Background</label>
					<input id="backgroundColor" bind:value={backgroundColor} type="color" />
				</div>
			</section>

			<section class="step">
				<button class="btn-primary" on:click={convertEntries} disabled={converting}>
					{#if converting}🔄 Converting...{:else}🔄 Convert to Leaflet Format{/if}
				</button>
			</section>

			{#if showOutput}
				<section class="step" id="outputSection">
					<h2><span class="step-number">4</span>Results</h2>
					<div class="success">✅ Conversion complete!</div>
					<button class="btn-secondary" on:click={downloadZip}>⬇️ Download ZIP</button>

					<div class="output-card"><h3>Publication Record:</h3><pre>{publicationOutput}</pre></div>
					<div class="output-card"><h3>Document Records:</h3><pre>{documentOutput}</pre></div>
				</section>
			{/if}
		{/if}
	</main>
</div>

<footer>
	<p>Built by <a href="https://ewancroft.uk" target="_blank">Ewan</a> • <a href="https://github.com/ewanc26/whtwnd-to-leaflet" target="_blank">Source Code</a> (GPL-3.0)</p>
	<p>Not affiliated with WhiteWind or Leaflet.</p>
</footer>
