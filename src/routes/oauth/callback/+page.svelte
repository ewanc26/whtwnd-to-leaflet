<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { handleOAuthCallback } from '$lib/auth/atproto-oauth';

	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			// Handle the OAuth callback
			await handleOAuthCallback();
			
			// Redirect to converter page on success
			goto('/converter');
		} catch (err: any) {
			console.error('OAuth callback error:', err);
			error = err.message || 'Failed to complete authentication';
			loading = false;
		}
	});
</script>

<div class="container" style="min-height: 100vh; display: flex; align-items: center; justify-content: center;">
	{#if loading}
		<div style="text-align: center;">
			<div class="spinner"></div>
			<p style="margin-top: 1.5rem; font-size: 1.1rem;">Completing authentication...</p>
		</div>
	{:else if error}
		<div class="step" style="max-width: 500px;">
			<div class="warning">
				<strong>⚠️ Authentication Failed</strong>
				<p style="margin-top: 0.5rem;">{error}</p>
			</div>
			<button
				class="btn-primary"
				style="margin-top: 1.5rem;"
				on:click={() => goto('/login')}
			>
				Return to Login
			</button>
		</div>
	{/if}
</div>

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
