import { AtpAgent } from '@atproto/api';
import { goto } from '$app/navigation';

let agent: AtpAgent | null = null;

interface ResolvedIdentity {
    did: string;
    handle: string;
    pds: string;
    signing_key: string;
}

/**
 * Resolves an AT Protocol identifier (handle or DID) to get PDS information
 */
async function resolveIdentifier(identifier: string): Promise<ResolvedIdentity> {
    const response = await fetch(
        `https://slingshot.microcosm.blue/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(identifier)}`
    );
    
    if (!response.ok) {
        throw new Error(`Failed to resolve identifier: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.did || !data.pds) {
        throw new Error('Invalid response from identity resolver');
    }
    
    return data;
}

/**
 * Logs in a user with their AT Protocol handle/DID and app password.
 */
export async function login(identifier: string, password: string): Promise<void> {
    try {
        const resolved = await resolveIdentifier(identifier);
        
        agent = new AtpAgent({
            service: resolved.pds,
        });

        await agent.login({
            identifier: resolved.did,
            password: password,
        });

        localStorage.setItem('atproto_session', JSON.stringify({ 
            session: agent.session, 
            pdsUrl: resolved.pds,
            resolvedData: resolved
        }));

        goto('/converter');
    } catch (e: any) {
        console.error('Login failed:', e);
        localStorage.removeItem('atproto_session');
        
        if (e.message.includes('Failed to resolve identifier')) {
            throw new Error('Handle not found. Please check your AT Protocol handle.');
        } else if (e.message.includes('AuthFactorTokenRequired')) {
            throw new Error('Two-factor authentication required. Please use your app password.');
        } else if (e.message.includes('AccountTakedown') || e.message.includes('AccountSuspended')) {
            throw new Error('Account is suspended or has been taken down.');
        } else if (e.message.includes('InvalidCredentials')) {
            throw new Error('Invalid credentials. Please check your handle and app password.');
        } else {
            throw new Error(`Login failed: ${e.message || 'Unknown error'}`);
        }
    }
}

/**
 * Checks if a user is currently logged in.
 */
export function isLoggedIn(): boolean {
    if (agent?.session) {
        return true;
    }
    const session = localStorage.getItem('atproto_session');
    return !!session;
}

/**
 * Refreshes the current user session.
 */
export async function refreshSession(): Promise<void> {
    let currentSession = agent?.session;
    let pdsServiceUrl: string | undefined;

    if (!currentSession) {
        const storedData = localStorage.getItem('atproto_session');
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                currentSession = parsedData.session;
                pdsServiceUrl = parsedData.pdsUrl;
            } catch (e) {
                console.error('Failed to parse stored session:', e);
                localStorage.removeItem('atproto_session');
                throw new Error('Invalid stored session. Please log in again.');
            }
        }
    } else if (agent?.service) {
        pdsServiceUrl = agent.service.toString();
    }

    if (!currentSession || !pdsServiceUrl) {
        throw new Error('No session or PDS URL found to refresh.');
    }

    if (!agent || agent.service.toString() !== pdsServiceUrl) {
        agent = new AtpAgent({
            service: pdsServiceUrl,
        });
    }

    try {
        await agent.resumeSession(currentSession);
        
        const storedData = localStorage.getItem('atproto_session');
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            localStorage.setItem('atproto_session', JSON.stringify({ 
                ...parsedData,
                session: agent.session 
            }));
        }
    } catch (e) {
        console.error('Failed to refresh session:', e);
        localStorage.removeItem('atproto_session');
        throw new Error('Session refresh failed. Please log in again.');
    }
}

/**
 * Logs out the current user by clearing the session.
 */
export function logout(): void {
    agent = null;
    localStorage.removeItem('atproto_session');
    goto('/login');
}

/**
 * Gets the current user's handle.
 */
export function getCurrentUserHandle(): string | null {
    return agent?.session?.handle || null;
}

/**
 * Gets the current user's DID.
 */
export function getCurrentUserDid(): string | null {
    return agent?.session?.did || null;
}

/**
 * Gets the resolved identity data for the current user.
 */
export function getCurrentUserResolvedData(): ResolvedIdentity | null {
    const storedData = localStorage.getItem('atproto_session');
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            return parsedData.resolvedData || null;
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Fetches all WhiteWind blog entries for the current user.
 */
export async function fetchWhiteWindEntries(): Promise<any[]> {
    if (!agent) {
        try {
            await refreshSession();
        } catch (e) {
            console.error("Agent not initialized and session refresh failed:", e);
            throw new Error('Not logged in. Please log in again.');
        }
    }

    if (!agent || !agent.session) {
        throw new Error('Not logged in. Cannot fetch WhiteWind entries.');
    }

    try {
        const response = await agent.com.atproto.repo.listRecords({
            repo: agent.session.did,
            collection: 'com.whtwnd.blog.entry',
            limit: 100,
        });

        return response.data.records || [];
    } catch (e) {
        console.error('Failed to fetch WhiteWind entries:', e);
        throw new Error(`Failed to fetch entries: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
}

/**
 * Fetches the user's profile.
 */
export async function getProfile(handle: string): Promise<any | null> {
    if (!agent) {
        try {
            await refreshSession();
        } catch (e) {
            console.error("Agent not initialized and session refresh failed:", e);
            return null;
        }
    }

    if (!agent) {
        console.error("Agent is still not initialized after refresh attempt.");
        return null;
    }

    try {
        const response = await agent.getProfile({ actor: handle });
        return response.data;
    } catch (e) {
        console.error(`Failed to fetch profile for ${handle}:`, e);
        return null;
    }
}

// Initialize agent on page load if a session exists
if (typeof window !== 'undefined' && localStorage.getItem('atproto_session')) {
    refreshSession().catch(e => console.error("Initial session refresh failed:", e));
}
