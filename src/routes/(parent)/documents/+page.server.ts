/**
 * Document vault: list by type, upload (browser → Storage → ?/register),
 * open with 60-second signed links (see ./signed/+server.ts).
 */
import { z } from 'zod';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { verifyUploadedObject } from '#lib/server/storageVerify.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { peopleFor } from '#lib/custody/people.js';
import { localDate, safeTimeZone, shortDate } from '#lib/custody/today.js';
import {
	DOCUMENT_KIND_VALUES,
	kindInfo,
	type DocumentView
} from '#lib/components/documents/types.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	event.depends('app:documents');
	const tz = safeTimeZone(event.cookies.get('tz'));
	const sb = event.locals.supabase;
	const [docs, parents] = await Promise.all([
		sb
			.from('documents')
			.select('id, title, kind, storage_path, uploaded_by, extracted, created_at')
			.eq('family_id', member.family_id)
			.order('created_at', { ascending: false }),
		sb
			.from('members')
			.select('id, display_name, home')
			.eq('family_id', member.family_id)
			.eq('role', 'parent')
	]);
	const people = peopleFor(parents.data ?? [], member);
	const documents: DocumentView[] = (docs.data ?? []).map((d) => {
		const k = kindInfo(d.kind);
		return {
			id: d.id,
			title: d.title,
			kind: d.kind,
			kindLabel: k.label,
			kindIcon: k.icon,
			storagePath: d.storage_path,
			fileType: d.storage_path.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
			uploadedBy: d.uploaded_by ? people.nameById(d.uploaded_by) : 'TeamKid',
			uploadedOn: shortDate(localDate(d.created_at, tz)),
			readByAi: d.extracted !== null
		};
	});
	return { familyId: member.family_id, documents };
};

const Register = z.object({
	path: z.string().min(1, 'Upload a file first'),
	title: z.string().trim().min(1, 'Give it a title').max(80, 'Keep the title under 80 characters'),
	kind: z.enum(DOCUMENT_KIND_VALUES)
});

export const actions: Actions = {
	register: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, Register, 'document');
		if (!parsed.ok) return parsed.failure;
		const verified = await verifyUploadedObject(parsed.data.path, member.family_id);
		if (!verified.ok) return formFailure('document', verified.error, 400);

		const { data, error } = await event.locals.supabase
			.from('documents')
			.insert({
				family_id: member.family_id,
				kind: parsed.data.kind,
				title: parsed.data.title,
				storage_path: parsed.data.path,
				mime: verified.mime,
				uploaded_by: member.member_id
			})
			.select('id')
			.single();
		if (error || !data)
			return formFailure('document', 'Could not save the document. Please try again.', 500);
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'document.uploaded',
			entity: 'documents',
			entityId: data.id,
			meta: { kind: parsed.data.kind, bytes: verified.bytes }
		});
		return { form: 'document', ok: true };
	}
};
