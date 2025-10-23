<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { isLoggedIn, resumeSession } from '$lib/auth/atproto';
	import '../lib/styles.css';

	onMount(async () => {
		if (!isLoggedIn()) {
			goto('/login');
		} else {
			try {
				const resumed = await resumeSession();
				if (resumed) {
					goto('/converter');
				} else {
					goto('/login');
				}
			} catch {
				goto('/login');
			}
		}
	});
</script>

<div class="container">
	<header>
		<h1>🍃 WhiteWind → Leaflet</h1>
		<p>Preparing your converter...</p>
	</header>

	<main class="main-content">
		<div class="step">
			<h2><span class="step-number">🔄</span>Loading Your Session</h2>

			<div class="output-card" style="text-align: center; padding: 2rem;">
				<div class="spinner"></div>
				<p style="font-size: 1.1rem; margin-top: 1rem;">Loading... Please wait.</p>
			</div>

			<div class="output-card">
				<h3>ℹ️ What's Happening</h3>
				<ul style="margin-left: 1.5rem; margin-top: 0.5rem; line-height: 1.8;">
					<li><strong>Checking Login:</strong> Verifying your AT Protocol session.</li>
					<li><strong>Refreshing Session:</strong> Ensuring your authentication token is valid.</li>
					<li><strong>Redirecting:</strong> You'll be taken to the converter once ready.</li>
				</ul>
			</div>
		</div>
	</main>
</div>

<footer>
	<p>
		Built by <a href="https://ewancroft.uk" target="_blank" rel="noopener">Ewan</a> •
		<a href="https://github.com/ewanc26/whtwnd-to-leaflet" target="_blank" rel="noopener"
			>Source Code</a
		>
		(GPL-3.0)
	</p>
	<p>
		Not affiliated with <a href="https://whtwnd.com" target="_blank" rel="noopener">WhiteWind</a>
		or <a href="https://leaflet.pub" target="_blank" rel="noopener">Leaflet</a>.
	</p>
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
</style>
