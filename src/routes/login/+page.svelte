<script lang="ts">
    import { login } from '$lib/auth/auth';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { isLoggedIn } from '$lib/auth/auth';

    let identifier = '';
    let password = '';
    let errorMessage = '';
    let isLoading = false;

    onMount(() => {
        if (isLoggedIn()) {
            goto('/converter');
        }
    });

    async function handleLogin(): Promise<void> {
        if (!identifier.trim() || !password.trim()) {
            errorMessage = 'Please enter your AT Protocol handle and app password.';
            return;
        }

        errorMessage = '';
        isLoading = true;

        try {
            await login(identifier.trim(), password.trim());
        } catch (error) {
            console.error('Login error:', error);
            errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
            isLoading = false;
        }
    }

    function handleInputKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            handleLogin();
        }
    }
</script>

<div class="container">
    <header>
        <h1>🍃 WhiteWind → Leaflet</h1>
        <p>Sign in to convert your blog entries</p>
    </header>

    <main class="main-content">
        <div class="step">
            <h2><span class="step-number">🔐</span>Login to Your AT Protocol Account</h2>
            
            <form on:submit|preventDefault={handleLogin}>
                <div class="form-group">
                    <label for="identifier">AT Protocol Handle or DID</label>
                    <input
                        type="text"
                        id="identifier"
                        bind:value={identifier}
                        on:keydown={handleInputKeydown}
                        placeholder="alice.bsky.social or did:plc:..."
                        disabled={isLoading}
                        required
                    />
                    <div class="example">Example: alice.bsky.social or did:plc:abc123...</div>
                </div>

                <div class="form-group">
                    <label for="password">App Password</label>
                    <input
                        type="password"
                        id="password"
                        bind:value={password}
                        on:keydown={handleInputKeydown}
                        placeholder="Your app password"
                        disabled={isLoading}
                        required
                    />
                    <div class="example">Generate this in your Bluesky app settings</div>
                </div>

                {#if errorMessage}
                    <div class="warning">
                        <strong>⚠️ Error:</strong> {errorMessage}
                    </div>
                {/if}

                <button type="submit" class="btn-primary" disabled={isLoading}>
                    {#if isLoading}
                        🔄 Connecting...
                    {:else}
                        🚀 Sign In and Convert
                    {/if}
                </button>
            </form>

            <div class="output-card">
                <h3>ℹ️ How It Works</h3>
                <ul style="margin-left: 1.5rem; margin-top: 0.5rem; line-height: 1.8;">
                    <li><strong>Automatic Fetching:</strong> We'll automatically retrieve all your WhiteWind blog entries from the AT Protocol network.</li>
                    <li><strong>Secure Login:</strong> Your credentials are used only to authenticate with your Personal Data Server. We never store your password.</li>
                    <li><strong>Easy Export:</strong> Download all converted files as a ZIP archive, ready to use with Leaflet.</li>
                </ul>
            </div>

            <div class="output-card">
                <p><strong>Don't have an account?</strong> <a href="https://bsky.app" target="_blank" rel="noopener noreferrer">Sign up on Bluesky</a></p>
            </div>
        </div>
    </main>
</div>

<footer>
	<p>Built by <a href="https://ewancroft.uk" target="_blank" rel="noopener">Ewan</a> • <a href="https://github.com/ewanc26/whtwnd-to-leaflet" target="_blank" rel="noopener">Source Code</a> (GPL-3.0)</p>
	<p>Not affiliated with <a href="https://whtwnd.com" target="_blank" rel="noopener">WhiteWind</a> or <a href="https://leaflet.pub" target="_blank" rel="noopener">Leaflet</a>.</p>
</footer>