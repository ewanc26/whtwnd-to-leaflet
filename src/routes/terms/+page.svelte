<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>Terms of Service - WhiteWind to Leaflet Converter</title>
</svelte:head>

<div class="container" style="max-width: 800px; padding: 2rem 1rem;">
	<button class="btn-secondary" style="margin-bottom: 2rem;" on:click={() => goto('/')}>
		← Back
	</button>

	<h1>Terms of Service</h1>

	<div class="step">
		<h2>License</h2>
		<p>
			This application is licensed under the <strong>GNU General Public License v3.0 (GPL-3.0)</strong>.
		</p>
		<p>
			This means you are free to use, modify, and distribute this software under the terms of the GPL-3.0 license.
			You can find the full license text at <a href="https://www.gnu.org/licenses/gpl-3.0.en.html" target="_blank" rel="noopener noreferrer">gnu.org/licenses/gpl-3.0</a>.
		</p>
	</div>

	<div class="step">
		<h2>No Warranty</h2>
		<p>
			This application is provided <strong>"AS IS"</strong>, without warranty of any kind, express or implied.
		</p>
		<p>
			In no event shall the author or copyright holder be liable for any claim, damages, or other liability,
			whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the
			software or the use or other dealings in the software.
		</p>
	</div>

	<div class="step">
		<h2>Use at Your Own Risk</h2>
		<p>
			By using this application, you acknowledge and agree that:
		</p>
		<ul>
			<li>You use this service entirely at your own risk</li>
			<li>The author provides no guarantees about the accuracy, reliability, or availability of the service</li>
			<li>The author is not responsible for any data loss, corruption, or other issues that may arise from using this service</li>
			<li>You are responsible for backing up your own data</li>
		</ul>
	</div>

	<div class="step">
		<h2>Open Source</h2>
		<p>
			This is an open-source project. The source code is available for review, modification, and distribution
			under the terms of the GPL-3.0 license.
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
