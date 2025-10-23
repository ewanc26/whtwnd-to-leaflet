<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>Privacy Policy - WhiteWind to Leaflet Converter</title>
</svelte:head>

<div class="container" style="max-width: 800px; padding: 2rem 1rem;">
	<button class="btn-secondary" style="margin-bottom: 2rem;" on:click={() => goto('/')}>
		← Back
	</button>

	<h1>Privacy Policy</h1>

	<div class="step">
		<h2>Data Collection</h2>
		<p>
			This application does not collect, store, or transmit any personal data to external servers
			operated by the application author.
		</p>
	</div>

	<div class="step">
		<h2>OAuth Authentication</h2>
		<p>
			When you use OAuth to authenticate with your AT Protocol (Bluesky) account:
		</p>
		<ul>
			<li>Your authentication is handled directly between your browser and the AT Protocol servers</li>
			<li>OAuth tokens are stored locally in your browser</li>
			<li>The application only accesses data you explicitly authorize</li>
			<li>No credentials or tokens are transmitted to or stored on servers controlled by this application</li>
		</ul>
	</div>

	<div class="step">
		<h2>Data Processing</h2>
		<p>
			All data processing happens locally in your browser:
		</p>
		<ul>
			<li>WhiteWind blog posts are fetched directly from AT Protocol servers</li>
			<li>Conversion to Leaflet format happens entirely in your browser</li>
			<li>No blog content is transmitted through or stored on third-party servers</li>
		</ul>
	</div>

	<div class="step">
		<h2>Third-Party Services</h2>
		<p>
			This application connects to:
		</p>
		<ul>
			<li><strong>AT Protocol servers</strong> - to authenticate and fetch your blog data</li>
			<li>No other third-party services receive your data</li>
		</ul>
		<p>
			Please refer to the <a href="https://bsky.social/about/support/privacy-policy" target="_blank" rel="noopener noreferrer">Bluesky Privacy Policy</a>
			for information about how AT Protocol services handle your data.
		</p>
	</div>

	<div class="step">
		<h2>Cookies and Local Storage</h2>
		<p>
			This application uses browser local storage to:
		</p>
		<ul>
			<li>Store OAuth authentication tokens</li>
			<li>Remember your login session</li>
		</ul>
		<p>
			All data is stored locally in your browser and can be cleared at any time by logging out
			or clearing your browser data.
		</p>
	</div>

	<div class="step">
		<h2>Open Source</h2>
		<p>
			This application is open source under the GPL-3.0 license. You can review the source code
			to verify these privacy claims.
		</p>
	</div>

	<div class="step">
		<h2>No Warranty</h2>
		<p>
			This service is provided "as is" without any warranties. See the <a href="/terms">Terms of Service</a>
			for full details.
		</p>
	</div>

	<div style="margin-top: 2rem; padding: 1rem; background: var(--background-secondary); border-radius: 8px;">
		<p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">
			Last updated: October 23, 2025
		</p>
	</div>
</div>

<style>
	h1 {
		margin-bottom: 1.5rem;
	}

	h2 {
		color: var(--text-primary);
		margin-bottom: 0.75rem;
		font-size: 1.3rem;
	}

	.step {
		margin-bottom: 1.5rem;
	}

	ul {
		margin: 1rem 0;
		padding-left: 1.5rem;
	}

	li {
		margin-bottom: 0.5rem;
	}

	a {
		color: var(--button-bg);
		text-decoration: underline;
	}

	a:hover {
		color: var(--button-hover);
	}
</style>
