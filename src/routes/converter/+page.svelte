<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		isLoggedIn,
		getCurrentUserDid,
		getCurrentUserHandle,
		fetchWhiteWindEntries,
		logout,
		resumeOAuthSession
	} from '$lib/auth/atproto-oauth';
	import { 
		createPublicationRecord,
		convertEntriesToDocuments
	} from '$lib/convert';
	import { publishLeaflet } from '$lib/auth/leaflet';
	import type { 
		LeafletPublicationRecord,
		LeafletDocumentRecord
	} from '$lib/types';

	let loading = true;
	let entries: any[] = [];
	let errorMessage = '';

	let pubName = '';
	let basePath = '';
	let pubDescription = '';
	let showInDiscover = true;
	let showComments = true;
	let primaryColor = '#667eea';
	let backgroundColor = '#ffffff';
	let pageBackground = '#f8fafc';
	let showPageBg = false;

	let converting = false;
	let publishing = false;
	let publicationUri = '';
	let publicationRkey = '';
	let publicationRecord: LeafletPublicationRecord | null = null;
	let documentRecords: Array<{ rkey: string; record: LeafletDocumentRecord }> = [];
	let showOutput = false;
	let publishResult: { success: boolean; message: string; errors?: Array<{ rkey: string; error: string }> } | null = null;
	let authorDid = '';
	let userHandle = '';

	onMount(async () => {
		// Try to resume session first
		if (!isLoggedIn()) {
			const resumed = await resumeOAuthSession();
			if (!resumed) {
				goto('/login');
				return;
			}
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
			if (!pubName.trim()) {
				alert('Please provide a Publication Name.');
				return;
			}
			if (entries.length === 0) {
				alert('No entries to convert!');
				return;
			}

			// Create publication record
			const pubResult = createPublicationRecord(pubName, authorDid, {
				basePath: basePath || undefined,
				description: pubDescription || undefined,
				showInDiscover,
				showComments,
				primaryColor,
				backgroundColor,
				pageBackground,
				showPageBackground: showPageBg
			});

			publicationRkey = pubResult.rkey;
			publicationRecord = pubResult.record;
			publicationUri = `at://${authorDid}/pub.leaflet.publication/${pubResult.rkey}`;

			// Convert entries to documents
			documentRecords = convertEntriesToDocuments(entries, publicationUri, authorDid);

			showOutput = true;

			setTimeout(
				() => document.getElementById('outputSection')?.scrollIntoView({ behavior: 'smooth' }),
				50
			);
		} catch (error: any) {
			alert(`Conversion error: ${error.message}`);
			console.error(error);
		} finally {
			converting = false;
		}
	}

	async function downloadZip() {
		const JSZip = (await import('jszip')).default;
		const { saveAs } = await import('file-saver');
		
		const zip = new JSZip();
		
		// Add publication record
		zip.file('publication.json', JSON.stringify(publicationRecord, null, 2));
		
		// Add document records
		const docsFolder = zip.folder('documents');
		if (docsFolder) {
			documentRecords.forEach((doc) => {
				docsFolder.file(`${doc.rkey}.json`, JSON.stringify(doc.record, null, 2));
			});
		}
		
		// Add README with instructions
		const readme = `# WhiteWind to Leaflet Conversion

## Files

- \`publication.json\`: Your publication record (collection: pub.leaflet.publication)
- \`documents/\`: Your document records (collection: pub.leaflet.document)

## Details

Generated: ${new Date().toISOString()}
Author DID: ${authorDid}
Publication URI: ${publicationUri}
Documents: ${documentRecords.length}

## Next Steps

1. Use the "Publish to AT Protocol" button in the app to automatically publish
2. Or manually upload using your preferred AT Protocol client
3. Visit https://leaflet.pub to view your publication!
`;
		
		zip.file('README.md', readme);
		
		const blob = await zip.generateAsync({ type: 'blob' });
		saveAs(blob, `${pubName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-leaflet.zip`);
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			alert('Copied to clipboard!');
		});
	}

	async function publishToAtProto() {
		if (!publicationRecord || !publicationRkey || documentRecords.length === 0) {
			alert('Please convert entries first before publishing.');
			return;
		}

		if (!confirm(`Are you sure you want to publish this Leaflet with ${documentRecords.length} documents to the AT Protocol? This will create records in your repository.`)) {
			return;
		}

		publishing = true;
		publishResult = null;

		try {
			const result = await publishLeaflet(publicationRkey, publicationRecord, documentRecords);
			
			if (result.errors.length > 0) {
				publishResult = {
					success: true,
					message: `Published successfully! However, ${result.errors.length} document(s) failed to publish.`,
					errors: result.errors
				};
			} else {
				publishResult = {
					success: true,
					message: `Successfully published! Publication URI: ${result.publicationUri}. ${result.documentUris.length} document(s) published.`
				};
			}
		} catch (error: any) {
			publishResult = {
				success: false,
				message: `Failed to publish: ${error.message || error}`
			};
			console.error('Publishing error:', error);
		} finally {
			publishing = false;
		}
	}
</script>

<div class="container">
	<header>
		<h1>🍃 WhiteWind → Leaflet Converter</h1>
		<p>Convert your WhiteWind blog entries to Leaflet format</p>
		{#if userHandle}
			<p style="margin-top: 0.5rem; opacity: 0.8;">
				Logged in as <strong>@{userHandle}</strong>
				<button
					on:click={logout}
					style="margin-left: 1rem; text-decoration: underline; cursor: pointer; background: none; border: none; color: inherit;"
				>
					Logout
				</button>
			</p>
		{/if}
	</header>

	<main class="main-content">
		{#if loading}
			<div class="step" style="text-align: center; padding: 3rem;">
				<div class="spinner"></div>
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
					Found <strong>{entries.length}</strong> blog {entries.length === 1 ? 'entry' : 'entries'} ready
					to convert!
				</div>
				<div style="max-height: 400px; overflow-y: auto; margin-top: 1rem;">
					{#each entries as entry, i}
						<div class="output-card" style="margin-bottom: 0.75rem;">
							<h3>{entry.value?.title || entry.title || `Entry ${i + 1}`}</h3>
							<p style="opacity: 0.8; font-size: 0.9rem;">
								{(entry.value?.content || entry.content || '').substring(0, 150)}{(
									entry.value?.content ||
									entry.content ||
									''
								).length > 150
									? '...'
									: ''}
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
					<label for="basePath">Base Path (optional domain)</label>
					<input id="basePath" bind:value={basePath} type="text" placeholder="myblog.com" />
				</div>
				<div class="form-group">
					<label for="pubDescription">Description</label>
					<textarea
						id="pubDescription"
						bind:value={pubDescription}
						placeholder="Describe your publication..."
					></textarea>
				</div>
				<div class="form-group">
					<label>
						<input type="checkbox" bind:checked={showInDiscover} />
						Show in Discover
					</label>
				</div>
				<div class="form-group">
					<label>
						<input type="checkbox" bind:checked={showComments} />
						Allow Comments
					</label>
				</div>
			</section>

			<section class="step">
				<h2><span class="step-number">3</span>Theme Settings</h2>
				<div class="form-group">
					<label for="primaryColor">Primary Color</label>
					<input id="primaryColor" bind:value={primaryColor} type="color" />
					<span style="margin-left: 1rem; font-family: monospace;">{primaryColor}</span>
				</div>
				<div class="form-group">
					<label for="backgroundColor">Background Color</label>
					<input id="backgroundColor" bind:value={backgroundColor} type="color" />
					<span style="margin-left: 1rem; font-family: monospace;">{backgroundColor}</span>
				</div>
				<div class="form-group">
					<label for="pageBackground">Page Background Color</label>
					<input id="pageBackground" bind:value={pageBackground} type="color" />
					<span style="margin-left: 1rem; font-family: monospace;">{pageBackground}</span>
				</div>
				<div class="form-group">
					<label>
						<input type="checkbox" bind:checked={showPageBg} />
						Show Page Background
					</label>
				</div>
			</section>

			<section class="step">
				<button class="btn-primary" on:click={convertEntries} disabled={converting}>
					{#if converting}🔄 Converting...{:else}🔄 Convert to Leaflet Format{/if}
				</button>
			</section>

			{#if showOutput}
				<section class="step" id="outputSection">
					<h2><span class="step-number">4</span>Conversion Results</h2>
					<div class="success">✅ Conversion complete!</div>
					
					<div class="output-card" style="background: #f0f9ff; border-left: 4px solid #0ea5e9;">
						<h3>📦 Publication Details</h3>
						<p><strong>URI:</strong> <code>{publicationUri}</code>
						<button on:click={() => copyToClipboard(publicationUri)} style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.85rem;">Copy</button></p>
						<p><strong>RKEY:</strong> <code>{publicationRkey}</code></p>
						<p><strong>Documents:</strong> {documentRecords.length}</p>
					</div>

					<div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
					<button class="btn-primary" on:click={publishToAtProto} disabled={publishing}>
					  {#if publishing}🚀 Publishing...{:else}🚀 Publish to AT Protocol{/if}
					</button>
					<button class="btn-secondary" on:click={downloadZip}>
						⬇️ Download ZIP Package
					</button>
				</div>

				{#if publishResult}
					{#if publishResult.success}
						<div class="success" style="margin-bottom: 1.5rem;">
							✅ {publishResult.message}
							{#if publishResult.errors && publishResult.errors.length > 0}
								<details style="margin-top: 0.5rem;">
									<summary style="cursor: pointer; font-weight: 600;">View Errors</summary>
									<ul style="margin-top: 0.5rem; margin-left: 1.5rem;">
										{#each publishResult.errors as err}
											<li><strong>{err.rkey}:</strong> {err.error}</li>
										{/each}
									</ul>
								</details>
							{/if}
						</div>
					{:else}
						<div class="warning" style="margin-bottom: 1.5rem;">
							❌ {publishResult.message}
						</div>
					{/if}
				{/if}

					<div class="output-card">
						<h3>Publication Record</h3>
						<p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 0.5rem;">
							Collection: <code>pub.leaflet.publication</code> | RKEY: <code>{publicationRkey}</code>
						</p>
						<pre>{JSON.stringify(publicationRecord, null, 2)}</pre>
					</div>

					<div class="output-card">
						<h3>Document Records ({documentRecords.length})</h3>
						<p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 1rem;">
							Collection: <code>pub.leaflet.document</code>
						</p>
						{#each documentRecords as doc, i}
							<details style="margin-bottom: 1rem; border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 0.75rem;">
								<summary style="cursor: pointer; font-weight: 600;">
									{i + 1}. {doc.record.title} <span style="font-weight: normal; opacity: 0.7; margin-left: 0.5rem;">({doc.rkey})</span>
								</summary>
								<pre style="margin-top: 0.75rem; font-size: 0.85rem;">{JSON.stringify(doc.record, null, 2)}</pre>
							</details>
						{/each}
					</div>

					<div class="output-card" style="background: #fffbeb; border-left: 4px solid #f59e0b;">
						<h3>📚 Next Steps</h3>
						<ol style="margin-left: 1.5rem; line-height: 1.8;">
							<li><strong>Option 1 (Recommended):</strong> Click the "Publish to AT Protocol" button above to automatically publish your Leaflet</li>
							<li><strong>Option 2 (Manual):</strong> Download the ZIP package, extract the files, and use the AT Protocol API to upload your records</li>
							<li>Visit <a href="https://leaflet.pub" target="_blank" rel="noopener">leaflet.pub</a> to view your publication!</li>
						</ol>
					</div>
				</section>
			{/if}
		{/if}
	</main>
</div>

<footer>
	<p>
		Built by <a href="https://ewancroft.uk" target="_blank" rel="noopener">Ewan</a> •
		<a href="https://github.com/ewanc26/whtwnd-to-leaflet" target="_blank" rel="noopener">Source Code</a> (GPL-3.0)
	</p>
	<p>Not affiliated with <a href="https://whtwnd.com" target="_blank" rel="noopener">WhiteWind</a> or 
	<a href="https://leaflet.pub" target="_blank" rel="noopener">Leaflet</a>.</p>
</footer>

<style>
	.spinner {
		display: inline-block;
		width: 3rem;
		height: 3rem;
		border: 3px solid var(--border-color);
		border-top-color: var(--button-bg);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	details summary {
		user-select: none;
	}

	details[open] summary {
		margin-bottom: 0.5rem;
	}

	code {
		background: rgba(0, 0, 0, 0.05);
		padding: 0.15rem 0.4rem;
		border-radius: 0.25rem;
		font-family: monospace;
		font-size: 0.9em;
	}
</style>
