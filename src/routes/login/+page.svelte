<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { login } from '$lib/auth/atproto';
	
	let identifier = '';
	let password = '';
	let loading = false;
	let errorMessage = '';

	async function handleLogin() {
		if (!identifier || !password) {
			errorMessage = 'Please enter both identifier and password';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			await login(identifier, password);
			goto('/converter');
		} catch (error: any) {
			console.error('Login failed:', error);
			errorMessage = error.message || 'Login failed. Please check your credentials.';
		} finally {
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
		<div class="step">
			<h2><span class="step-number">🔐</span>Sign In</h2>
			<p style="opacity: 0.8; margin-bottom: 1.5rem;">
				Sign in with your AT Protocol credentials (Bluesky account)
			</p>

			{#if errorMessage}
				<div class="warning" style="margin-bottom: 1.5rem;">
					<strong>⚠️ {errorMessage}</strong>
				</div>
			{/if}

			<form on:submit={handleSubmit}>
				<div class="form-group">
					<label for="identifier">Handle or Email</label>
					<input
						id="identifier"
						bind:value={identifier}
						type="text"
						placeholder="your-handle.bsky.social"
						disabled={loading}
						autocomplete="username"
					/>
				</div>

				<div class="form-group">
					<label for="password">Password or App Password</label>
					<input
						id="password"
						bind:value={password}
						type="password"
						placeholder="••••••••••••••••"
						disabled={loading}
						autocomplete="current-password"
					/>
					<p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">
						<strong>Tip:</strong> Use an
						<a
							href="https://bsky.app/settings/app-passwords"
							target="_blank"
							rel="noopener"
							style="text-decoration: underline;"
						>
							app password
						</a>
						for better security
					</p>
				</div>

				<button class="btn-primary" type="submit" disabled={loading}>
					{#if loading}
						<span class="spinner-inline"></span>
						Signing in...
					{:else}
						Sign In
					{/if}
				</button>
			</form>

			<div class="output-card" style="margin-top: 2rem; background: #f0f9ff; border-left: 4px solid #0ea5e9;">
				<h3 style="margin-top: 0;">ℹ️ About This Tool</h3>
				<ul style="margin-left: 1.5rem; line-height: 1.8; margin-bottom: 0;">
					<li>This tool converts your WhiteWind blog entries to Leaflet format</li>
					<li>Your PDS is automatically detected using microcosm.blue's slingshot service</li>
					<li>Your credentials are only used to authenticate with AT Protocol</li>
					<li>All conversion happens locally in your browser</li>
					<li>Records are published directly to your AT Protocol repository</li>
					<li>No data is stored on our servers</li>
				</ul>
			</div>

			<div class="output-card" style="margin-top: 1.5rem; background: #fffbeb; border-left: 4px solid #f59e0b;">
				<h3 style="margin-top: 0;">🔒 Security Recommendation</h3>
				<p style="margin-bottom: 0.5rem;">
					For better security, we recommend using an <strong>App Password</strong> instead of your main account password.
				</p>
				<ol style="margin-left: 1.5rem; line-height: 1.8; margin-bottom: 0;">
					<li>Go to <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener" style="text-decoration: underline;">Bluesky Settings → App Passwords</a></li>
					<li>Create a new app password (e.g., "WhiteWind Converter")</li>
					<li>Copy the generated password</li>
					<li>Use it to sign in here instead of your main password</li>
				</ol>
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
	form {
		max-width: 500px;
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
