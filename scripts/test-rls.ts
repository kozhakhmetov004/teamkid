/**
 * Row-level security test, using REAL signed-in clients (anon key + user
 * session), never the service role for the reads under test.
 *
 *   pnpm db:seed && pnpm test:rls
 *
 * The service role is only used to look up ids, to prepare fixtures and to
 * verify that rows still exist after a forbidden delete.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database.js';
import {
	authenticateKid,
	deriveKidPassword,
	kidEmail,
	supabaseAttemptStore,
	supabaseKidDirectory
} from '../src/lib/server/kidAuth.js';
import { DEMO } from './lib/demo.js';
import { adminClient, anonClient, KID_AUTH_SECRET } from './lib/env.js';

type Client = SupabaseClient<Database>;
const admin = adminClient();

let passed = 0;
const failures: string[] = [];
function expect(condition: boolean, label: string, detail = '') {
	if (condition) {
		passed++;
		console.log(`  ✔ ${label}`);
	} else {
		failures.push(`${label}${detail ? ` (${detail})` : ''}`);
		console.log(`  ✘ ${label}${detail ? ` (${detail})` : ''}`);
	}
}

async function signInParent(email: string, password: string): Promise<Client> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({ email, password });
	if (error) throw new Error(`sign in ${email}: ${error.message}`);
	return client;
}

/** Signs in exactly like /kid-login does: family code + PIN -> derived password. */
async function signInKid(familyCode: string, pin: string): Promise<Client> {
	const result = await authenticateKid({
		familyCode,
		pin,
		directory: supabaseKidDirectory(admin),
		attempts: supabaseAttemptStore(admin)
	});
	if (!result.ok) throw new Error(`kid auth failed: ${result.reason}`);
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email: kidEmail(result.childId),
		password: deriveKidPassword(KID_AUTH_SECRET, result.childId)
	});
	if (error) throw new Error(`kid sign in: ${error.message}`);
	return client;
}

async function count(
	client: Client,
	table: keyof Database['public']['Tables'],
	column?: string,
	value?: string
) {
	// Select only the filter column (or id): children.pin_hash is not selectable by users.
	let query = client.from(table).select(column ?? 'id', { count: 'exact', head: true });
	if (column && value) query = query.eq(column, value);
	const { count: n, error } = await query;
	if (error) return { n: -1, error: error.message };
	return { n: n ?? 0, error: null };
}

async function ids() {
	const carter = (
		await admin.from('families').select('id').eq('family_code', DEMO.carter.code).single()
	).data!;
	const diaz = (
		await admin.from('families').select('id').eq('family_code', DEMO.diaz.code).single()
	).data!;
	const lily = (
		await admin
			.from('children')
			.select('id')
			.eq('family_id', carter.id)
			.eq('first_name', 'Lily')
			.single()
	).data!;
	const dadMember = (
		await admin
			.from('members')
			.select('id')
			.eq('family_id', carter.id)
			.eq('display_name', DEMO.dad.name)
			.single()
	).data!;
	if (!carter || !diaz || !lily || !dadMember)
		throw new Error('Seed data missing. Run pnpm db:seed first.');
	return { carterId: carter.id, diazId: diaz.id, lilyId: lily.id, dadMemberId: dadMember.id };
}

async function main() {
	const { carterId, diazId, lilyId, dadMemberId } = await ids();
	const mom = await signInParent(DEMO.mom.email, DEMO.mom.password);
	const lily = await signInKid(DEMO.carter.code, DEMO.lily.pin);
	const anon = anonClient();

	// Fixture: Lily writes a raw chat line herself (only she may).
	const chatInsert = await lily
		.from('kid_chat_raw')
		.insert({ child_id: lilyId, role: 'child', text: 'rls-test: I like turtles' });
	expect(!chatInsert.error, 'Lily can insert her own kid_chat_raw', chatInsert.error?.message);
	const adminChat = await count(admin, 'kid_chat_raw', 'child_id', lilyId);
	const adminMood = await count(admin, 'mood_checkins', 'child_id', lilyId);
	const adminPet = await count(admin, 'pet_state', 'child_id', lilyId);
	expect(
		adminChat.n > 0 && adminMood.n > 0 && adminPet.n > 0,
		'fixtures exist (checked with service role)'
	);

	console.log('\nMom (Carter) can read her family data');
	for (const table of ['events', 'messages', 'expenses', 'weekly_insights'] as const) {
		const r = await count(mom, table, 'family_id', carterId);
		expect(r.n > 0, `Mom reads Carter ${table}`, r.error ?? `rows=${r.n}`);
	}

	console.log('\nMom cannot read anything from the Diaz family');
	for (const table of [
		'events',
		'messages',
		'expenses',
		'weekly_insights',
		'wish_cards',
		'members',
		'children',
		'threads',
		'audit_log'
	] as const) {
		const truth = await count(admin, table, 'family_id', diazId);
		const r = await count(mom, table, 'family_id', diazId);
		expect(r.n === 0, `Mom sees 0 Diaz ${table} (exists: ${truth.n})`, r.error ?? `rows=${r.n}`);
	}
	const diazFamily = await mom.from('families').select('id').eq('id', diazId);
	expect((diazFamily.data ?? []).length === 0, 'Mom cannot read the Diaz families row');

	console.log("\nMom cannot read Lily's private kid data");
	for (const table of ['mood_checkins', 'kid_chat_raw', 'pet_state'] as const) {
		const r = await count(mom, table, 'child_id', lilyId);
		expect(r.n === 0, `Mom sees 0 rows in ${table}`, r.error ?? `rows=${r.n}`);
	}

	console.log('\nWish cards: Mom sees only the shared ones');
	// The seed shares nothing (the demo shares live), so Lily shares one wish as a fixture.
	const fixtureWish = (await lily.from('wish_cards').select('id').eq('child_id', lilyId).limit(1))
		.data?.[0];
	const shareFixture = fixtureWish
		? await lily
				.from('wish_cards')
				.update({ shared_with_parents: true, shared_at: new Date().toISOString() })
				.eq('id', fixtureWish.id)
				.select('id')
		: null;
	expect((shareFixture?.data ?? []).length === 1, 'Lily can share her own wish card');
	const allWishes =
		(await admin.from('wish_cards').select('id, shared_with_parents').eq('child_id', lilyId))
			.data ?? [];
	const momWishes = (await mom.from('wish_cards').select('id').eq('child_id', lilyId)).data ?? [];
	const sharedIds = allWishes
		.filter((w) => w.shared_with_parents)
		.map((w) => w.id)
		.sort();
	const unshared = allWishes.filter((w) => !w.shared_with_parents);
	expect(
		JSON.stringify(momWishes.map((w) => w.id).sort()) === JSON.stringify(sharedIds) &&
			sharedIds.length >= 1,
		`Mom reads exactly the ${sharedIds.length} shared wish cards`,
		`got ${momWishes.length}`
	);
	for (const w of unshared) {
		const r = await mom.from('wish_cards').select('id').eq('id', w.id);
		expect((r.data ?? []).length === 0, 'Mom cannot read the unshared wish card');
	}
	if (fixtureWish) {
		await lily
			.from('wish_cards')
			.update({ shared_with_parents: false, shared_at: null })
			.eq('id', fixtureWish.id);
	}

	console.log('\nShared feeling: parents see only what Lily chose to tell them');
	const share = await lily
		.from('shared_moods')
		.upsert({ child_id: lilyId, family_id: carterId, mood: 'calm', energy: 3 })
		.select('child_id');
	expect((share.data ?? []).length === 1, 'Lily can share her feeling', share.error?.message);
	const momShared = (await mom.from('shared_moods').select('mood, energy').eq('child_id', lilyId))
		.data;
	expect(
		momShared?.[0]?.mood === 'calm' && momShared[0].energy === 3,
		"Mom reads Lily's shared feeling"
	);
	const momWrite = await mom
		.from('shared_moods')
		.update({ mood: 'angry' })
		.eq('child_id', lilyId)
		.select('child_id');
	expect((momWrite.data ?? []).length === 0, "Mom cannot change Lily's shared feeling");
	const ana = await signInParent(DEMO.ana.email, DEMO.ana.password);
	const anaShared = await count(ana, 'shared_moods', 'child_id', lilyId);
	expect(anaShared.n === 0, "Ana (Diaz) cannot read Lily's shared feeling", anaShared.error ?? '');
	const unshare = await lily
		.from('shared_moods')
		.update({ mood: null, energy: null })
		.eq('child_id', lilyId)
		.select('child_id');
	expect((unshare.data ?? []).length === 1, 'Lily can take her feeling back');
	const momAfter = (await mom.from('shared_moods').select('mood').eq('child_id', lilyId)).data;
	expect(momAfter?.[0]?.mood === null, 'After "just for me" Mom sees no feeling');
	await admin.from('shared_moods').delete().eq('child_id', lilyId);

	console.log('\nMom cannot write server-only tables');
	const insightInsert = await mom.from('weekly_insights').insert({
		family_id: carterId,
		child_id: lilyId,
		week_start: '2000-01-03',
		mood_trend: 'fake'
	});
	expect(!!insightInsert.error, 'Mom cannot insert weekly_insights');
	const auditInsert = await mom
		.from('audit_log')
		.insert({ family_id: carterId, action: 'x', entity: 'x' });
	expect(!!auditInsert.error, 'Mom cannot insert audit_log');
	const statusUpdate = await mom
		.from('children')
		.update({ status: 'active' })
		.eq('id', lilyId)
		.select('id');
	expect((statusUpdate.data ?? []).length === 0, 'Mom cannot update children.status directly');
	const pinRead = await mom.from('children').select('pin_hash').eq('id', lilyId);
	expect(!!pinRead.error, 'Mom cannot read children.pin_hash', pinRead.error?.message);
	const childRead = await mom.from('children').select('id, first_name, status').eq('id', lilyId);
	expect((childRead.data ?? []).length === 1, "Mom can read Lily's profile (without the PIN hash)");

	console.log('\nLily (kid login) sees only what a child may');
	const lilyMood = await count(lily, 'mood_checkins', 'child_id', lilyId);
	expect(
		lilyMood.n > 0,
		'Lily reads her own mood_checkins',
		lilyMood.error ?? `rows=${lilyMood.n}`
	);
	// events_kid_visible: no direct reads; kid_calendar() hides surprises and notes.
	const lilyDirect = await count(lily, 'events', 'family_id', carterId);
	expect(lilyDirect.n <= 0, 'Lily cannot read events directly (notes stay private)');
	const surprise = (
		await admin
			.from('events')
			.insert({
				family_id: carterId,
				title: 'rls-test surprise party',
				starts_at: new Date(Date.now() + 86_400_000).toISOString(),
				ends_at: new Date(Date.now() + 90_000_000).toISOString(),
				kind: 'activity',
				kid_visible: false
			})
			.select('id')
			.single()
	).data;
	const range = {
		p_from: new Date(Date.now() - 86_400_000).toISOString(),
		p_to: new Date(Date.now() + 9 * 86_400_000).toISOString()
	};
	const lilyCal = (await lily.rpc('kid_calendar', range)).data ?? [];
	expect(
		lilyCal.some((e) => e.kind === 'custody') && !lilyCal.some((e) => e.id === surprise?.id),
		'Lily sees her nights but not the hidden surprise',
		`rows=${lilyCal.length}`
	);
	const momCal = (await mom.rpc('kid_calendar', range)).data ?? [];
	expect(momCal.length === 0, 'kid_calendar returns nothing for a parent session');
	if (surprise) await admin.from('events').delete().eq('id', surprise.id);
	// kid_read_own_insight: Lily reads her own weekly insight (for /my-sharing), nobody else's.
	const lilyInsights = (await lily.from('weekly_insights').select('child_id')).data ?? [];
	expect(
		lilyInsights.length > 0 && lilyInsights.every((i) => i.child_id === lilyId),
		'Lily reads only her own weekly_insights',
		`rows=${lilyInsights.length}`
	);
	for (const table of ['messages', 'expenses', 'audit_log', 'outings'] as const) {
		const r = await count(lily, table);
		expect(r.n === 0, `Lily sees 0 ${table}`, r.error ?? `rows=${r.n}`);
	}
	const lilyDiaz = await count(lily, 'events', 'family_id', diazId);
	expect(lilyDiaz.n === 0, 'Lily sees 0 Diaz events');

	console.log('\nNot signed in (anon) sees nothing');
	for (const table of ['events', 'families', 'messages', 'wish_cards'] as const) {
		const r = await count(anon, table);
		expect(r.n <= 0, `anon sees 0 ${table}`, r.error ?? `rows=${r.n}`);
	}

	console.log('\nMessages are immutable');
	// A message Dad sent that Mom hasn't read yet (create one if every seed message was read already).
	let target = (
		await admin
			.from('messages')
			.select('id, thread_id')
			.eq('family_id', carterId)
			.eq('sender_id', dadMemberId)
			.is('first_read_at', null)
			.limit(1)
	).data?.[0];
	if (!target) {
		const thread = (
			await admin.from('threads').select('id').eq('family_id', carterId).limit(1).single()
		).data!;
		target = (
			await admin
				.from('messages')
				.insert({
					family_id: carterId,
					thread_id: thread.id,
					sender_id: dadMemberId,
					body: 'RLS test: please confirm Saturday.'
				})
				.select('id, thread_id')
				.single()
		).data!;
	}
	const editBody = await mom
		.from('messages')
		.update({ body: 'edited!' })
		.eq('id', target.id)
		.select('id');
	expect(
		!!editBody.error || (editBody.data ?? []).length === 0,
		'Mom cannot edit a message body',
		editBody.error?.message
	);
	const del = await mom.from('messages').delete().eq('id', target.id);
	const stillThere = await count(admin, 'messages', 'id', target.id);
	expect(stillThere.n === 1, 'Mom cannot delete a message', del.error?.message ?? 'deleted 0 rows');
	const read1 = await mom
		.from('messages')
		.update({ first_read_at: new Date().toISOString() })
		.eq('id', target.id)
		.select('first_read_at');
	expect(
		!read1.error && (read1.data ?? []).length === 1,
		'Mom can set first_read_at once',
		read1.error?.message
	);
	const read2 = await mom
		.from('messages')
		.update({ first_read_at: new Date().toISOString() })
		.eq('id', target.id)
		.select('id');
	expect(!!read2.error, 'Setting first_read_at a second time fails', read2.error?.message);
	const adminDelete = await admin.from('messages').delete().eq('id', target.id);
	expect(
		!!adminDelete.error,
		'Even the service role cannot delete a message',
		adminDelete.error?.message
	);
	const adminAudit = await admin
		.from('audit_log')
		.update({ action: 'tampered' })
		.eq('family_id', carterId);
	expect(
		!!adminAudit.error,
		'Even the service role cannot update audit_log',
		adminAudit.error?.message
	);

	console.log('\nHash chain');
	const chain =
		(
			await mom
				.from('messages')
				.select('prev_hash, hash')
				.eq('thread_id', target.thread_id)
				.order('created_at')
		).data ?? [];
	const linked = chain.every((m, i) =>
		i === 0 ? m.prev_hash === null : m.prev_hash === chain[i - 1].hash
	);
	expect(
		chain.length >= 2 && linked,
		`messages in a thread are hash-chained (${chain.length} messages)`
	);

	console.log('\nKid login rules');
	const pending = await authenticateKid({
		familyCode: DEMO.diaz.code,
		pin: DEMO.leo.pin,
		directory: supabaseKidDirectory(admin),
		attempts: supabaseAttemptStore(admin)
	});
	expect(
		!pending.ok && pending.reason === 'pending_consent',
		'A child without both consents cannot log in'
	);

	// Clean up the raw chat fixture (service role; kid_chat_raw is not an immutable table).
	await admin.from('kid_chat_raw').delete().eq('child_id', lilyId).like('text', 'rls-test:%');

	console.log(`\n${passed} passed, ${failures.length} failed`);
	if (failures.length) {
		console.log('\nFailures:\n  - ' + failures.join('\n  - '));
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('RLS test crashed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
