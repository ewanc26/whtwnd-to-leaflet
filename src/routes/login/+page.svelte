<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { initializeOAuth, startOAuthLogin, resumeOAuthSession } from '$lib/auth/atproto-oauth';

	let handle = '';
	let loading = false;
	let errorMessage = '';
	let checkingSession = true;

	onMount(async () => {
		// Initialize OAuth configuration
		initializeOAuth();

		// Try to resume existing session
		const resumed = await resumeOAuthSession();
		if (resumed) {
			goto('/converter');
			return;
		}

		checkingSession = false;
	});

	async function handleLogin() {
		if (!handle) {
			errorMessage = 'Please enter your handle';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			// Start OAuth flow (this will redirect)
			await startOAuthLogin(handle);
		} catch (error: any) {
			console.error('Login failed:', error);
			errorMessage = error.message || 'Failed to start login. Please check your handle.';
			loading = false;
		}
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		handleLogin();
	}
</script>

<div class="container">
	<header>
		<h1>🍃 WhiteWind → Leaflet</h1>
		<p>Convert your WhiteWind blog to Leaflet format and publish directly to AT Protocol</p>
	</header>

	<main class="main-content">
		{#if checkingSession}
			<div class="step" style="text-align: center; padding: 3rem;">
				<div class="spinner"></div>
				<p style="margin-top: 1rem; font-size: 1.1rem;">Checking for existing session...</p>
			</div>
		{:else}
			<div class="step">
				<h2><span class="step-number">🔐</span>Sign In with OAuth</h2>
				<p style="opacity: 0.8; margin-bottom: 1.5rem;">
					Sign in securely using OAuth. You'll be redirected to your PDS to authorize this
					application.
				</p>

				{#if errorMessage}
					<div class="warning" style="margin-bottom: 1.5rem;">
						<strong>⚠️ {errorMessage}</strong>
					</div>
				{/if}

				<form on:submit={handleSubmit}>
					<div class="form-group">
						<label for="handle">Your Handle</label>
						<input
							id="handle"
							bind:value={handle}
							type="text"
							placeholder="yourhandle.bsky.social"
							disabled={loading}
							autocomplete="username"
						/>
						<p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">
							Enter your Bluesky or AT Protocol handle
						</p>
					</div>

					<button class="btn-primary" type="submit" disabled={loading}>
						{#if loading}
							<span class="spinner-inline"></span>
							Redirecting to authorization...
						{:else}
							Sign In with OAuth
						{/if}
					</button>
				</form>

				<div
					class="output-card"
					style="margin-top: 2rem; background: #f0f9ff; border-left: 4px solid #0ea5e9;"
				>
					<h3 style="margin-top: 0;">ℹ️ About OAuth Authentication</h3>
					<ul style="margin-left: 1.5rem; line-height: 1.8; margin-bottom: 0;">
						<li>
							OAuth is the secure, recommended way to sign in to AT Protocol applications
						</li>
						<li>You'll be redirected to your PDS (Personal Data Server) to authorize access</li>
						<li>
							Your password never passes through this application - only secure authorization
							tokens
						</li>
						<li>Sessions are stored securely in your browser and automatically refresh</li>
						<li>You can revoke access at any time from your PDS settings</li>
						<li>No data is stored on our servers - everything happens in your browser</li>
					</ul>
				</div>

				<div
					class="output-card"
					style="margin-top: 1.5rem; background: #fffbeb; border-left: 4px solid #f59e0b;"
				>
					<h3 style="margin-top: 0;">🔒 Privacy & Security</h3>
					<ul style="margin-left: 1.5rem; line-height: 1.8; margin-bottom: 0;">
						<li>This tool converts your WhiteWind blog entries to Leaflet format</li>
						<li>All conversion happens locally in your browser</li>
						<li>Records are published directly to your AT Protocol repository</li>
						<li>No intermediary servers store your data or credentials</li>
						<li>Open source - you can verify the code on GitHub</li>
					</ul>
				</div>
			</div>
		{/if}
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
	form {
		max-width: 500px;
	}

	.spinner {
		display: inline-block;
		width: 3rem;
		height: 3rem;
		border: 3px solid var(--border-color);
		border-top-color: var(--button-bg);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.spinner-inline {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-right: 0.5rem;
		vertical-align: middle;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
