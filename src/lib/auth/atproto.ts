// AT Protocol authentication using atcute with PDS resolution via Slingshot
import { Client, CredentialManager, ok } from '@atcute/client';
import type { AtpSessionData } from '@atcute/client';
import type { Did, Nsid } from '@atcute/lexicons';

// Import lexicons
import type {} from '@atcute/atproto';
import type {} from '@atcute/whitewind';
import type {} from '@atcute/bluesky';

const SESSION_STORAGE_KEY = 'atp_session';
const SLINGSHOT_URL = 'https://slingshot.microcosm.blue/xrpc/com.bad-example.identity.resolveMiniDoc';

let credentialManager: CredentialManager | null = null;
let client: Client | null = null;

/**
 * Resolve a handle to its PDS using microcosm.blue's slingshot service
 */
async function resolvePDS(identifier: string): Promise<string> {
	try {
		const response = await fetch(`${SLINGSHOT_URL}?identifier=${encodeURIComponent(identifier)}`);
		
		if (!response.ok) {
			throw new Error(`Failed to resolve PDS for ${identifier}`);
		}
		
		const data = await response.json();
		
		// Slingshot returns: { did, handle, pds, signing_key }
		if (data.pds) {
			console.log(`Resolved ${identifier} -> PDS: ${data.pds}, DID: ${data.did}`);
			return data.pds;
		}
		
		throw new Error('PDS not found in slingshot response');
	} catch (error) {
		console.error('Failed to resolve PDS:', error);
		// Fallback to default bsky.social if slingshot fails
		console.warn(`Falling back to https://bsky.social for ${identifier}`);
		return 'https://bsky.social';
	}
}

/**
 * Initialize or get the credential manager
 */
function getCredentialManager(service: string): CredentialManager {
	if (!credentialManager) {
		credentialManager = new CredentialManager({
			service,
			onSessionUpdate: (session) => {
				// Save session to localStorage
				if (typeof window !== 'undefined') {
					localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
				}
			},
			onExpired: () => {
				// Clear session on expiration
				if (typeof window !== 'undefined') {
					localStorage.removeItem(SESSION_STORAGE_KEY);
				}
				credentialManager = null;
				client = null;
			}
		});
	}
	return credentialManager;
}

/**
 * Get the authenticated client
 */
export function getClient(): Client | null {
	if (!client && credentialManager) {
		client = new Client({ handler: credentialManager });
	}
	return client;
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
	if (typeof window === 'undefined') return false;
	
	const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
	return sessionData !== null;
}

/**
 * Get current user's DID
 */
export function getCurrentUserDid(): string | null {
	if (typeof window === 'undefined') return null;
	
	const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
	if (!sessionData) return null;
	
	try {
		const session: AtpSessionData = JSON.parse(sessionData);
		return session.did;
	} catch {
		return null;
	}
}

/**
 * Get current user's handle
 */
export function getCurrentUserHandle(): string | null {
	if (typeof window === 'undefined') return null;
	
	const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
	if (!sessionData) return null;
	
	try {
		const session: AtpSessionData = JSON.parse(sessionData);
		return session.handle;
	} catch {
		return null;
	}
}

/**
 * Login with identifier and password
 * Automatically resolves the PDS using microcosm.blue's slingshot
 */
export async function login(identifier: string, password: string): Promise<void> {
	// Resolve the user's PDS first
	const pds = await resolvePDS(identifier);
	
	console.log(`Resolved PDS for ${identifier}: ${pds}`);
	
	const manager = getCredentialManager(pds);
	
	await manager.login({
		identifier,
		password
	});
	
	// Initialize client after login
	client = new Client({ handler: manager });
}

/**
 * Resume session from stored credentials
 */
export async function resumeSession(): Promise<boolean> {
	if (typeof window === 'undefined') return false;
	
	const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
	if (!sessionData) return false;
	
	try {
		const session: AtpSessionData = JSON.parse(sessionData);
		
		// Resolve PDS for the session
		const pds = await resolvePDS(session.handle);
		const manager = getCredentialManager(pds);
		
		await manager.resume(session);
		client = new Client({ handler: manager });
		
		return true;
	} catch (error) {
		console.error('Failed to resume session:', error);
		localStorage.removeItem(SESSION_STORAGE_KEY);
		return false;
	}
}

/**
 * Logout and clear session
 */
export async function logout(): Promise<void> {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(SESSION_STORAGE_KEY);
		if (typeof window !== 'undefined') {
			const { goto } = await import('$app/navigation');
			goto('/login');
		}
	}
	credentialManager = null;
	client = null;
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
		const response = await ok(
			client.get('com.whtwnd.blog.getAuthorPosts', {
				params: {
					author: did as Did
				}
			})
		);
		
		// Use 'post' instead of 'posts' based on the API response structure
		return response.post || [];
	} catch (error) {
		console.error('Failed to fetch WhiteWind entries:', error);
		throw new Error('Failed to fetch blog entries');
	}
}

/**
 * Upload a blob (image, etc.) to AT Protocol
 */
export async function uploadBlob(blob: Blob): Promise<{ cid: string; mimeType: string; size: number }> {
	const client = getClient();
	if (!client) {
		throw new Error('Not authenticated');
	}
	
	const did = getCurrentUserDid();
	if (!did) {
		throw new Error('No DID found');
	}
	
	try {
		const response = await ok(
			client.post('com.atproto.repo.uploadBlob', {
				input: blob
			})
		);
		
		return {
			cid: response.blob.ref.$link,
			mimeType: response.blob.mimeType,
			size: response.blob.size
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
		const response = await ok(
			client.post('com.atproto.repo.createRecord', {
				input: {
					repo: did as Did,
					collection: collection as Nsid,
					rkey,
					record
				}
			})
		);
		
		return {
			uri: response.uri,
			cid: response.cid
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
		const response = await ok(
			client.post('com.atproto.repo.putRecord', {
				input: {
					repo: did as Did,
					collection: collection as Nsid,
					rkey,
					record
				}
			})
		);
		
		return {
			uri: response.uri,
			cid: response.cid
		};
	} catch (error) {
		console.error('Failed to put record:', error);
		throw error;
	}
}
