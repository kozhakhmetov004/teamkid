/**
 * Server-side check of a file the browser uploaded to the `documents` bucket,
 * before its path is stored anywhere. Shared helper (Member 1; Member 3's
 * import can reuse it).
 *
 *   const v = await verifyUploadedObject(path, member.family_id);
 *   if (!v.ok) return formFailure('x', v.error);   // the bad object is already deleted
 *
 * Checks: the path is inside the caller's family folder, the object exists,
 * it is at most 10 MB, and its first bytes are a real PDF / PNG / JPEG
 * (the extension and declared type are not trusted).
 */
import { supabaseAdmin } from './supabaseAdmin.js';

export const DOCUMENTS_BUCKET = 'documents';
const MAX_BYTES = 10 * 1024 * 1024;
const PATH_RE = /^[0-9a-f-]{36}\/(receipts|docs|plans)?\/?[A-Za-z0-9._-]+\.(pdf|png|jpe?g)$/i;

export type UploadMime = 'application/pdf' | 'image/png' | 'image/jpeg';
export type VerifiedUpload =
	{ ok: true; mime: UploadMime; bytes: number } | { ok: false; error: string };

export function sniffMime(head: Uint8Array): UploadMime | null {
	if (
		head.length >= 5 &&
		head[0] === 0x25 &&
		head[1] === 0x50 &&
		head[2] === 0x44 &&
		head[3] === 0x46 &&
		head[4] === 0x2d
	) {
		return 'application/pdf'; // %PDF-
	}
	if (
		head.length >= 8 &&
		head[0] === 0x89 &&
		head[1] === 0x50 &&
		head[2] === 0x4e &&
		head[3] === 0x47
	) {
		return 'image/png';
	}
	if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
		return 'image/jpeg';
	}
	return null;
}

export async function verifyUploadedObject(
	path: string,
	familyId: string
): Promise<VerifiedUpload> {
	const admin = supabaseAdmin();
	const reject = async (error: string): Promise<VerifiedUpload> => {
		await admin.storage
			.from(DOCUMENTS_BUCKET)
			.remove([path])
			.catch(() => undefined);
		return { ok: false, error };
	};

	if (!path.startsWith(`${familyId}/`) || path.includes('..') || !PATH_RE.test(path)) {
		// Not even in this family's folder: don't touch it, just refuse.
		return { ok: false, error: 'That file is not in your family folder.' };
	}

	const { data, error } = await admin.storage.from(DOCUMENTS_BUCKET).download(path);
	if (error || !data)
		return { ok: false, error: 'The uploaded file could not be found. Please upload it again.' };
	if (data.size > MAX_BYTES) return reject('Files can be up to 10 MB.');
	const head = new Uint8Array(await data.slice(0, 16).arrayBuffer());
	const mime = sniffMime(head);
	if (!mime) return reject('That file is not a valid PDF, PNG or JPEG.');
	return { ok: true, mime, bytes: data.size };
}
