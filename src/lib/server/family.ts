/**
 * Family flows shared by /onboarding and /family:
 * create family, invite co-parent, add child, consent.
 * Every action is validated with Zod, guarded, and audited.
 */
import { randomBytes } from 'node:crypto';
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { logAudit } from './audit.js';
import { serverEnv } from './env.js';
import { requireParent, requireUser } from './guards.js';
import { ensureKidAuthUser, hashPin, PinSchema, verifyPin } from './kidAuth.js';
import { supabaseAdmin } from './supabaseAdmin.js';
import { formFailure, parseForm, zEmail, zName } from './validation.js';

const INVITE_DAYS = 7;

// ---------------------------------------------------------------------------
// Create family (first parent)
// ---------------------------------------------------------------------------
const CreateFamily = z.object({
	familyName: zName('Family name', 80),
	displayName: zName('Your name')
});

export async function createFamilyAction(event: RequestEvent) {
	await requireUser(event);
	const parsed = await parseForm(event.request, CreateFamily, 'createFamily');
	if (!parsed.ok) return parsed.failure;

	const { data, error } = await event.locals.supabase.rpc('create_family', {
		p_family_name: parsed.data.familyName,
		p_display_name: parsed.data.displayName
	});
	const row = data?.[0];
	if (error || !row) {
		return formFailure('createFamily', error?.message ?? 'Could not create the family', 400);
	}
	await logAudit({
		familyId: row.family_id,
		actorMemberId: row.member_id,
		action: 'family.created',
		entity: 'families',
		entityId: row.family_id
	});
	redirect(303, '/onboarding');
}

// ---------------------------------------------------------------------------
// Invite co-parent
// ---------------------------------------------------------------------------
const CreateInvite = z.object({ email: zEmail });

export async function createInviteAction(event: RequestEvent) {
	const { member, user } = await requireParent(event);
	const parsed = await parseForm(event.request, CreateInvite, 'invite');
	if (!parsed.ok) return parsed.failure;
	if (parsed.data.email === user.email?.toLowerCase()) {
		return formFailure('invite', 'Invite your co-parent, not yourself.', 400, {
			email: 'Use their email'
		});
	}

	const token = randomBytes(32).toString('base64url');
	const { data: invite, error } = await event.locals.supabase
		.from('invites')
		.insert({
			family_id: member.family_id,
			email: parsed.data.email,
			token,
			role: 'parent',
			invited_by: member.member_id,
			expires_at: new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString()
		})
		.select('id')
		.single();
	if (error || !invite)
		return formFailure('invite', error?.message ?? 'Could not create invite', 400);

	await logAudit({
		familyId: member.family_id,
		actorMemberId: member.member_id,
		action: 'invite.created',
		entity: 'invites',
		entityId: invite.id
	});
	// Email sending (Resend) is optional and not wired in the backbone: the
	// parent copies the link. See docs/ARCHITECTURE_NOTES.md.
	return { form: 'invite', inviteUrl: `${event.url.origin}/invite/${token}` };
}

// ---------------------------------------------------------------------------
// Add child (creates member + child + hidden auth user + pet + this parent's consent)
// ---------------------------------------------------------------------------
const thisYear = new Date().getUTCFullYear();
const AddChild = z
	.object({
		firstName: zName('First name', 40),
		birthYear: z.coerce
			.number()
			.int()
			.min(thisYear - 13, 'TeamKid pet mode is for ages 6 to 12')
			.max(thisYear - 4, 'TeamKid pet mode is for ages 6 to 12'),
		pin: PinSchema,
		pinConfirm: z.string()
	})
	.refine((v) => v.pin === v.pinConfirm, { path: ['pinConfirm'], message: 'PINs do not match' });

export async function addChildAction(event: RequestEvent) {
	const { member } = await requireParent(event);
	const parsed = await parseForm(event.request, AddChild, 'addChild');
	if (!parsed.ok) return parsed.failure;
	const { firstName, birthYear, pin } = parsed.data;
	const admin = supabaseAdmin();

	// Each child in a family needs a different PIN (the PIN picks the child at login).
	const { data: siblings } = await admin
		.from('children')
		.select('pin_hash')
		.eq('family_id', member.family_id);
	for (const s of siblings ?? []) {
		if (s.pin_hash && (await verifyPin(pin, s.pin_hash))) {
			return formFailure('addChild', 'Choose a PIN no other child in your family uses.', 400, {
				pin: 'Already used in this family'
			});
		}
	}

	const { data: childMember, error: memberErr } = await admin
		.from('members')
		.insert({ family_id: member.family_id, role: 'child', display_name: firstName })
		.select('id')
		.single();
	if (memberErr || !childMember) return formFailure('addChild', 'Could not add the child', 500);

	try {
		const { data: child, error: childErr } = await admin
			.from('children')
			.insert({
				family_id: member.family_id,
				member_id: childMember.id,
				first_name: firstName,
				birth_year: birthYear,
				pin_hash: await hashPin(pin),
				status: 'pending_consent'
			})
			.select('id')
			.single();
		if (childErr || !child) throw new Error(childErr?.message ?? 'child insert failed');

		const kidUserId = await ensureKidAuthUser(admin, serverEnv.kidAuthSecret, child.id);
		const link = await admin
			.from('members')
			.update({ user_id: kidUserId })
			.eq('id', childMember.id);
		if (link.error) throw new Error(link.error.message);
		const pet = await admin.from('pet_state').insert({ child_id: child.id });
		if (pet.error) throw new Error(pet.error.message);

		// This parent's consent, written as the parent (RLS: only for themselves).
		const consent = await event.locals.supabase
			.from('consents')
			.insert({ child_id: child.id, parent_member_id: member.member_id });
		if (consent.error) throw new Error(consent.error.message);

		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'child.created',
			entity: 'children',
			entityId: child.id
		});
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'child.consented',
			entity: 'children',
			entityId: child.id
		});
		return { form: 'addChild', added: firstName };
	} catch (err) {
		// Roll back the partial child (members cascade to children/pet_state/consents).
		await admin.from('members').delete().eq('id', childMember.id);
		console.error('add child failed:', err instanceof Error ? err.message : 'unknown error');
		return formFailure('addChild', 'Could not add the child. Please try again.', 500);
	}
}

// ---------------------------------------------------------------------------
// Consent (each parent approves the child account; both => active)
// ---------------------------------------------------------------------------
const Consent = z.object({ childId: z.string().uuid() });

export async function consentAction(event: RequestEvent) {
	const { member } = await requireParent(event);
	const parsed = await parseForm(event.request, Consent, 'consent');
	if (!parsed.ok) return parsed.failure;

	// RLS: the parent can only see children of their own family.
	const { data: child } = await event.locals.supabase
		.from('children')
		.select('id, family_id, first_name')
		.eq('id', parsed.data.childId)
		.maybeSingle();
	if (!child || child.family_id !== member.family_id) {
		return formFailure('consent', 'Child not found', 404);
	}

	const { error } = await event.locals.supabase
		.from('consents')
		.insert({ child_id: child.id, parent_member_id: member.member_id });
	if (error && error.code !== '23505') return formFailure('consent', error.message, 400);

	await logAudit({
		familyId: member.family_id,
		actorMemberId: member.member_id,
		action: 'child.consented',
		entity: 'children',
		entityId: child.id
	});

	const { data: after } = await event.locals.supabase
		.from('children')
		.select('status')
		.eq('id', child.id)
		.single();
	if (after?.status === 'active') {
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'child.activated',
			entity: 'children',
			entityId: child.id
		});
	}
	return { form: 'consent', activated: after?.status === 'active', childName: child.first_name };
}

// ---------------------------------------------------------------------------
// Family overview (used by /family and /onboarding)
// ---------------------------------------------------------------------------
export async function loadFamilyOverview(
	event: RequestEvent,
	familyId: string,
	meMemberId: string
) {
	const sb = event.locals.supabase;
	const [members, invites, children, consents, family] = await Promise.all([
		sb
			.from('members')
			.select('id, display_name, role, home, user_id, created_at')
			.eq('family_id', familyId)
			.order('created_at'),
		sb
			.from('invites')
			.select('id, email, expires_at, accepted_at, created_at')
			.eq('family_id', familyId)
			.order('created_at', { ascending: false }),
		sb
			.from('children')
			.select('id, first_name, birth_year, status, mode')
			.eq('family_id', familyId)
			.order('created_at'),
		sb.from('consents').select('child_id, parent_member_id'),
		sb.from('families').select('name, family_code').eq('id', familyId).single()
	]);
	const parents = (members.data ?? []).filter((m) => m.role === 'parent' && m.user_id);
	const kids = (children.data ?? []).map((c) => {
		const consentedBy = (consents.data ?? [])
			.filter((k) => k.child_id === c.id)
			.map((k) => k.parent_member_id);
		return {
			...c,
			consentedBy,
			iConsented: consentedBy.includes(meMemberId),
			waitingForCoParent: parents.length < 2
		};
	});
	return {
		family: family.data,
		members: (members.data ?? []).map(({ user_id, ...m }) => ({ ...m, joined: user_id !== null })),
		parents: parents.map((p) => ({ id: p.id, display_name: p.display_name, home: p.home })),
		invites: (invites.data ?? []).map((i) => ({
			...i,
			status: i.accepted_at
				? 'accepted'
				: new Date(i.expires_at) < new Date()
					? 'expired'
					: 'pending'
		})),
		children: kids
	};
}
