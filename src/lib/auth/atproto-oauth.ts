// AT Protocol OAuth authentication using atcute
// Note: @atcute/oauth-browser-client needs to be installed
// Run: npm install @atcute/oauth-browser-client

import type { Did, Nsid } from '@atcute/lexicons';

// Import lexicons
import type {} from '@atcute/atproto';
import type {} from '@atcute/whitewind';
import type {} from '@atcute/bluesky';

// OAuth types and functions (will be available after npm install)
type OAuthSession = any;
type InitializeOAuthOptions = any;

// These will be properly typed once the package is installed
let configureOAuth: any;
let resolveFromIdentity: any;
let createAuthorizationUrl: any;
let finalizeAuthorization: any;
let getSession: any;
let listStoredSessions: any;
let deleteStoredSession: any;

// Lazy load OAuth browser client
async function loadOAuthClient() {
	try {
		const module = await import('@atcute/oauth-browser-client');
		configureOAuth = module.configureOAuth;
		resolveFromIdentity = module.resolveFromIdentity;
		createAuthorizationUrl = module.createAuthorizationUrl;
		finalizeAuthorization = module.finalizeAuthorization;
		getSession = module.getSession;
		listStoredSessions = module.listStoredSessions;
		deleteStoredSession = module.deleteStoredSession;
		return module;
	} catch (error) {
		throw new Error(
			'@atcute/oauth-browser-client not installed. Run: npm install @atcute/oauth-browser-client'
		);
	}
}

// Import Client from @atcute/client (not XRPC)
import { Client } from '@atcute/client';

// OAuth configuration
const OAUTH_CONFIG = {
	metadata: {
		client_id: 'https://converter.ewancroft.uk/oauth/client-metadata.json',
		redirect_uri: 'https://converter.ewancroft.uk/oauth/callback'
	}
};

let rpcClient: Client | null = null;
let currentSession: OAuthSession | null = null;
let oauthInitialized = false;

/**
 * Initialize OAuth configuration (call this once on app load)
 */
export async function initializeOAuth(): Promise<void> {
	if (typeof window === 'undefined') return;
	if (oauthInitialized) return;

	try {
		await loadOAuthClient();
		configureOAuth(OAUTH_CONFIG.metadata);
		oauthInitialized = true;
	} catch (error) {
		console.error('Failed to initialize OAuth:', error);
		throw error;
	}
}

/**
 * Start OAuth login flow
 */
export async function startOAuthLogin(handle: string): Promise<void> {
	if (typeof window === 'undefined') {
		throw new Error('OAuth login only works in browser');
	}

	try {
		await loadOAuthClient();

		// Resolve the user's identity to get their PDS and auth server
		const identity = await resolveFromIdentity(handle);

		// Create authorization URL
		const authUrl = await createAuthorizationUrl({
			identity,
			scope: 'atproto transition:generic'
		});

		// Redirect to authorization server
		window.location.href = authUrl;
	} catch (error) {
		console.error('Failed to start OAuth login:', error);
		throw new Error('Failed to initiate login. Please check your handle and try again.');
	}
}

/**
 * Handle OAuth callback after redirect
 */
export async function handleOAuthCallback(): Promise<{ did: string; handle: string }> {
	if (typeof window === 'undefined') {
		throw new Error('OAuth callback only works in browser');
	}

	try {
		await loadOAuthClient();

		// Extract params from URL hash
		const params = new URLSearchParams(location.hash.slice(1));

		if (!params.has('state')) {
			throw new Error('No OAuth state found in callback');
		}

		// Clear the hash from history for security
		history.replaceState(null, '', location.pathname + location.search);

		// Finalize authorization to get session
		const session = await finalizeAuthorization(params);
		currentSession = session;

		// Create RPC client with OAuth agent
		const agent = session.createAgent();
		rpcClient = new Client({ handler: agent });

		return {
			did: session.sub,
			handle: session.info?.handle || session.sub
		};
	} catch (error) {
		console.error('Failed to handle OAuth callback:', error);
		throw new Error('Failed to complete login. Please try again.');
	}
}

/**
 * Resume existing OAuth session
 */
export async function resumeOAuthSession(): Promise<boolean> {
	if (typeof window === 'undefined') return false;

	try {
		await loadOAuthClient();

		// Get list of stored sessions
		const sessions = await listStoredSessions();

		if (sessions.length === 0) {
			return false;
		}

		// Use the most recent session
		const did = sessions[0];
		const session = await getSession(did, { allowStale: true });

		if (!session) {
			return false;
		}

		currentSession = session;

		// Create RPC client
		const agent = session.createAgent();
		rpcClient = new Client({ handler: agent });

		return true;
	} catch (error) {
		console.error('Failed to resume session:', error);
		return false;
	}
}

/**
 * Get the current RPC client
 */
export function getClient(): Client | null {
	return rpcClient;
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
	return currentSession !== null && rpcClient !== null;
}

/**
 * Get current user's DID
 */
export function getCurrentUserDid(): string | null {
	return currentSession?.sub || null;
}

/**
 * Get current user's handle
 */
export function getCurrentUserHandle(): string | null {
	return currentSession?.info?.handle || null;
}

/**
 * Logout and clear session
 */
export async function logout(): Promise<void> {
	if (typeof window === 'undefined') return;

	try {
		if (currentSession) {
			const did = currentSession.sub;

			await loadOAuthClient();

			// Try to sign out through the agent
			try {
				const agent = currentSession.createAgent();
				await agent.signOut();
			} catch (err) {
				console.warn('Failed to sign out through agent:', err);
				// Fallback: manually delete session
				await deleteStoredSession(did);
			}
		}
	} catch (error) {
		console.error('Logout error:', error);
	} finally {
		currentSession = null;
		rpcClient = null;

		// Redirect to login
		if (typeof window !== 'undefined') {
			const { goto } = await import('$app/navigation');
			goto('/login');
		}
	}
}

/**
 * Fetch WhiteWind blog entries for the current user
 */
export async function fetchWhiteWindEntries(): Promise<any[]> {
	const client = getClient();
	if (!client) {
		throw new Error('Not authenticated');
	}

	const did = getCurrentUserDid();
	if (!did) {
		throw new Error('No DID found');
	}

	try {
		const response = await client.get('com.whtwnd.blog.getAuthorPosts', {
			params: {
				author: did as Did
			}
		});

		if (!response.ok) {
			throw new Error('Failed to fetch blog entries');
		}

		// Use 'post' instead of 'posts' based on the API response structure
		return response.data.post || [];
	} catch (error) {
		console.error('Failed to fetch WhiteWind entries:', error);
		throw new Error('Failed to fetch blog entries');
	}
}

/**
 * Upload a blob (image, etc.) to AT Protocol
 */
export async function uploadBlob(
	blob: Blob
): Promise<{ cid: string; mimeType: string; size: number }> {
	const client = getClient();
	if (!client) {
		throw new Error('Not authenticated');
	}

	const did = getCurrentUserDid();
	if (!did) {
		throw new Error('No DID found');
	}

	try {
		const response = await client.post('com.atproto.repo.uploadBlob', {
			input: blob
		});

		if (!response.ok) {
			throw new Error('Failed to upload blob');
		}

		return {
			cid: response.data.blob.ref.$link,
			mimeType: response.data.blob.mimeType,
			size: response.data.blob.size
		};
	} catch (error) {
		console.error('Failed to upload blob:', error);
		throw new Error('Failed to upload blob');
	}
}

/**
 * Create a record in the user's repository
 */
export async function createRecord(
	collection: string,
	record: any,
	rkey?: string
): Promise<{ uri: string; cid: string }> {
	const client = getClient();
	if (!client) {
		throw new Error('Not authenticated');
	}

	const did = getCurrentUserDid();
	if (!did) {
		throw new Error('No DID found');
	}

	try {
		const response = await client.post('com.atproto.repo.createRecord', {
			input: {
				repo: did as Did,
				collection: collection as Nsid,
				rkey,
				record
			}
		});

		if (!response.ok) {
			throw new Error('Failed to create record');
		}

		return {
			uri: response.data.uri,
			cid: response.data.cid
		};
	} catch (error) {
		console.error('Failed to create record:', error);
		throw error;
	}
}

/**
 * Put (create or update) a record in the user's repository
 */
export async function putRecord(
	collection: string,
	rkey: string,
	record: any
): Promise<{ uri: string; cid: string }> {
	const client = getClient();
	if (!client) {
		throw new Error('Not authenticated');
	}

	const did = getCurrentUserDid();
	if (!did) {
		throw new Error('No DID found');
	}

	try {
		const response = await client.post('com.atproto.repo.putRecord', {
			input: {
				repo: did as Did,
				collection: collection as Nsid,
				rkey,
				record
			}
		});

		if (!response.ok) {
			throw new Error('Failed to put record');
		}

		return {
			uri: response.data.uri,
			cid: response.data.cid
		};
	} catch (error) {
		console.error('Failed to put record:', error);
		throw error;
	}
}
