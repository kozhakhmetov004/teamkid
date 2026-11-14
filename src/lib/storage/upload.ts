/**
 * Browser-side upload helper for the private `documents` bucket.
 * Files go straight from the browser to Storage (never through a SvelteKit
 * endpoint: Vercel limits request bodies to 4.5 MB). The form action then
 * records the returned path after the server re-verifies the object
 * (src/lib/server/storageVerify.ts).
 *
 * Paths: {family_id}/receipts/{uuid}.{ext} or {family_id}/docs/{uuid}.{ext}
 * (the bucket's RLS reads the family id from the first folder).
 */
import { getSupabaseBrowserClient } from '#lib/supabase.js';

export const BUCKET = 'documents';
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES: Record<string, string> = {
	'application/pdf': 'pdf',
	'image/png': 'png',
	'image/jpeg': 'jpg'
};

/** Returns an error message, or null when the file may be uploaded. */
export function validateUpload(file: { type: string; size: number }): string | null {
	if (!ALLOWED_TYPES[file.type]) return 'Please choose a PDF, PNG or JPEG file.';
	if (file.size > MAX_UPLOAD_BYTES) return 'Files can be up to 10 MB.';
	if (file.size === 0) return 'That file is empty.';
	return null;
}

export async function uploadToDocuments(
	file: File,
	familyId: string,
	folder: 'receipts' | 'docs'
): Promise<string> {
	const problem = validateUpload(file);
	if (problem) throw new Error(problem);
	const path = `${familyId}/${folder}/${crypto.randomUUID()}.${ALLOWED_TYPES[file.type]}`;
	const { error } = await getSupabaseBrowserClient()
		.storage.from(BUCKET)
		.upload(path, file, { contentType: file.type, upsert: false });
	if (error) throw new Error('Upload failed. Please try again.');
	return path;
}
