// Service for publishing to Leaflet using OAuth
import {
	createRecord,
	putRecord,
	getCurrentUserDid
} from './atproto-oauth';
import type {
	LeafletPublicationRecord,
	LeafletDocumentRecord
} from '$lib/types';

/**
 * Publish a Leaflet publication record
 */
export async function publishPublication(
	rkey: string,
	record: LeafletPublicationRecord
): Promise<{ uri: string; cid: string }> {
	return await putRecord('pub.leaflet.publication', rkey, record);
}

/**
 * Publish a Leaflet document record
 */
export async function publishDocument(
	rkey: string,
	record: LeafletDocumentRecord
): Promise<{ uri: string; cid: string }> {
	return await createRecord('pub.leaflet.document', record, rkey);
}

/**
 * Publish a complete Leaflet publication with all its documents
 */
export async function publishLeaflet(
	publicationRkey: string,
	publicationRecord: LeafletPublicationRecord,
	documents: Array<{ rkey: string; record: LeafletDocumentRecord }>
): Promise<{
	publicationUri: string;
	documentUris: string[];
	errors: Array<{ rkey: string; error: string }>;
}> {
	const did = getCurrentUserDid();
	if (!did) {
		throw new Error('Not authenticated');
	}

	const documentUris: string[] = [];
	const errors: Array<{ rkey: string; error: string }> = [];

	// First, publish the publication
	let publicationUri: string;
	try {
		const result = await publishPublication(publicationRkey, publicationRecord);
		publicationUri = result.uri;
	} catch (error: any) {
		throw new Error(`Failed to publish publication: ${error.message || error}`);
	}

	// Then, publish each document
	for (const doc of documents) {
		try {
			const result = await publishDocument(doc.rkey, doc.record);
			documentUris.push(result.uri);
		} catch (error: any) {
			console.error(`Failed to publish document ${doc.rkey}:`, error);
			errors.push({
				rkey: doc.rkey,
				error: error.message || String(error)
			});
		}
	}

	return {
		publicationUri,
		documentUris,
		errors
	};
}
