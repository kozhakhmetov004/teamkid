/**
 * Demo seed (idempotent: safe to run any number of times).
 *
 *   pnpm db:seed            # against whatever .env points to
 *
 * Uses the SERVICE ROLE (admin API) so auth users are created properly.
 * Placeholder feature data is only inserted when the family has none yet,
 * because messages/audit rows are immutable and can't be "re-seeded".
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database.js';
import {
	ensureKidAuthUser,
	findAuthUserIdByEmail,
	hashPin,
	verifyPin
} from '../src/lib/server/kidAuth.js';
import { DEMO } from './lib/demo.js';
import { adminClient, KID_AUTH_SECRET } from './lib/env.js';

type Admin = SupabaseClient<Database>;
const db: Admin = adminClient();

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
	if (res.error) throw new Error(`${what}: ${res.error.message}`);
	return res.data;
}

// ---------------------------------------------------------------------------
// Dates: everything is relative to the current week so the demo always looks fresh
// ---------------------------------------------------------------------------
function mondayOfThisWeek(): Date {
	const now = new Date();
	const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1));
	return d;
}
const MONDAY = mondayOfThisWeek();
const day = (offset: number, hour = 0, minute = 0) =>
	new Date(MONDAY.getTime() + offset * 86_400_000 + hour * 3_600_000 + minute * 60_000);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Upsert helpers
// ---------------------------------------------------------------------------
async function ensureParentUser(
	email: string,
	password: string,
	displayName: string
): Promise<string> {
	const created = await db.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { display_name: displayName }
	});
	if (!created.error && created.data.user) return created.data.user.id;
	const id = await findAuthUserIdByEmail(db, email);
	if (!id) throw new Error(`could not create ${email}: ${created.error?.message}`);
	const updated = await db.auth.admin.updateUserById(id, { password, email_confirm: true });
	if (updated.error) throw new Error(`could not update ${email}: ${updated.error.message}`);
	return id;
}

async function ensureFamily(name: string, code: string): Promise<{ id: string; isNew: boolean }> {
	const existing = check(
		await db.from('families').select('id').eq('family_code', code).maybeSingle(),
		'family lookup'
	);
	if (existing) return { id: existing.id, isNew: false };
	const row = check(
		await db.from('families').insert({ name, family_code: code }).select('id').single(),
		'family insert'
	);
	return { id: row.id, isNew: true };
}

async function ensureParentMember(
	familyId: string,
	userId: string,
	displayName: string,
	home: 'A' | 'B'
) {
	const row = check(
		await db
			.from('members')
			.upsert(
				{ family_id: familyId, user_id: userId, role: 'parent', display_name: displayName, home },
				{ onConflict: 'family_id,user_id' }
			)
			.select('id')
			.single(),
		'parent member upsert'
	);
	return row.id;
}

async function ensureChild(
	familyId: string,
	firstName: string,
	birthYear: number,
	pin: string,
	parentMemberIds: string[],
	activate: boolean
): Promise<string> {
	let child = check(
		await db
			.from('children')
			.select('id, member_id, pin_hash')
			.eq('family_id', familyId)
			.eq('first_name', firstName)
			.maybeSingle(),
		'child lookup'
	);

	if (!child) {
		const member = check(
			await db
				.from('members')
				.insert({ family_id: familyId, role: 'child', display_name: firstName })
				.select('id')
				.single(),
			'child member insert'
		);
		child = check(
			await db
				.from('children')
				.insert({
					family_id: familyId,
					member_id: member.id,
					first_name: firstName,
					birth_year: birthYear,
					pin_hash: await hashPin(pin),
					status: 'pending_consent'
				})
				.select('id, member_id, pin_hash')
				.single(),
			'child insert'
		);
	} else if (!child.pin_hash || !(await verifyPin(pin, child.pin_hash))) {
		check(
			await db
				.from('children')
				.update({ pin_hash: await hashPin(pin) })
				.eq('id', child.id),
			'child pin update'
		);
	}

	// Hidden auth user (derived password) linked to the child's member row.
	const kidUserId = await ensureKidAuthUser(db, KID_AUTH_SECRET, child.id);
	check(
		await db.from('members').update({ user_id: kidUserId }).eq('id', child.member_id),
		'link kid user'
	);

	check(
		await db
			.from('pet_state')
			.upsert({ child_id: child.id }, { onConflict: 'child_id', ignoreDuplicates: true }),
		'pet_state'
	);

	for (const parentMemberId of parentMemberIds) {
		check(
			await db
				.from('consents')
				.upsert(
					{ child_id: child.id, parent_member_id: parentMemberId },
					{ onConflict: 'child_id,parent_member_id', ignoreDuplicates: true }
				),
			'consent'
		);
	}
	if (activate) {
		check(
			await db.from('children').update({ status: 'active' }).eq('id', child.id),
			'activate child'
		);
	}
	return child.id;
}

async function isEmpty(
	table:
		| 'events'
		| 'threads'
		| 'expenses'
		| 'outings'
		| 'mood_checkins'
		| 'wish_cards'
		| 'custody_schedules',
	column: string,
	value: string
) {
	const { count, error } = await db
		.from(table)
		.select('id', { count: 'exact', head: true })
		.eq(column, value);
	if (error) throw new Error(`${table} count: ${error.message}`);
	return (count ?? 0) === 0;
}

// ---------------------------------------------------------------------------
// Carter family (the demo)
// ---------------------------------------------------------------------------
async function seedCarter() {
	const momId = await ensureParentUser(DEMO.mom.email, DEMO.mom.password, DEMO.mom.name);
	const dadId = await ensureParentUser(DEMO.dad.email, DEMO.dad.password, DEMO.dad.name);
	const family = await ensureFamily(DEMO.carter.name, DEMO.carter.code);
	const mom = await ensureParentMember(family.id, momId, DEMO.mom.name, 'A');
	const dad = await ensureParentMember(family.id, dadId, DEMO.dad.name, 'B');
	const lily = await ensureChild(
		family.id,
		DEMO.lily.firstName,
		DEMO.lily.birthYear,
		DEMO.lily.pin,
		[mom, dad],
		true
	);

	if (family.isNew) {
		check(
			await db.from('audit_log').insert([
				{
					family_id: family.id,
					actor_member_id: mom,
					action: 'family.created',
					entity: 'families',
					entity_id: family.id,
					meta: { source: 'seed' }
				},
				{
					family_id: family.id,
					actor_member_id: mom,
					action: 'child.created',
					entity: 'children',
					entity_id: lily,
					meta: { source: 'seed' }
				}
			]),
			'audit'
		);
	}

	if (await isEmpty('custody_schedules', 'family_id', family.id)) {
		check(
			await db.from('custody_schedules').insert({
				family_id: family.id,
				child_id: lily,
				template: '2-2-3',
				start_date: isoDate(MONDAY),
				exchange_time: '17:00',
				rules: {
					starting_home: 'A',
					holidays: [{ name: 'Thanksgiving', rule: 'odd years A, even years B' }]
				},
				created_by: mom
			}),
			'custody schedule'
		);
	}

	if (await isEmpty('events', 'family_id', family.id)) {
		// 2-2-3: Mon-Tue A (Mom), Wed-Thu B (Dad), Fri-Sun A (Mom)
		const homes: ('A' | 'B')[] = ['A', 'A', 'B', 'B', 'A', 'A', 'A'];
		const nights = homes.map((home, i) => ({
			family_id: family.id,
			child_id: lily,
			title: home === 'A' ? "Night at Mom's" : "Night at Dad's",
			starts_at: day(i, 17).toISOString(),
			ends_at: day(i + 1, 8).toISOString(),
			home,
			source: 'manual',
			created_by: mom
		}));
		check(
			await db.from('events').insert([
				...nights,
				{
					family_id: family.id,
					child_id: lily,
					title: 'Swim class',
					starts_at: day(2, 16).toISOString(),
					ends_at: day(2, 17).toISOString(),
					home: 'B',
					source: 'manual',
					created_by: dad
				},
				{
					family_id: family.id,
					child_id: null,
					title: 'School picture day',
					starts_at: day(3, 9).toISOString(),
					ends_at: day(3, 10).toISOString(),
					home: null,
					source: 'manual',
					created_by: mom
				}
			]),
			'events'
		);
	}

	if (await isEmpty('threads', 'family_id', family.id)) {
		const thread = check(
			await db
				.from('threads')
				.insert({ family_id: family.id, topic: 'Pickup times', created_by: mom })
				.select('id')
				.single(),
			'thread'
		);
		const bodies: [string, string][] = [
			[mom, 'Hi, can we move Wednesday pickup to 5:30 pm? Lily has swim until 5.'],
			[dad, 'Sure, 5:30 pm works. I will pick her up at the pool.'],
			[mom, 'Thanks! I will pack her swim bag.']
		];
		for (const [sender, body] of bodies) {
			// One by one so the hash chain links them in order.
			check(
				await db
					.from('messages')
					.insert({ family_id: family.id, thread_id: thread.id, sender_id: sender, body }),
				'message'
			);
		}
	}

	if (await isEmpty('expenses', 'family_id', family.id)) {
		check(
			await db.from('expenses').insert([
				{
					family_id: family.id,
					child_id: lily,
					paid_by: mom,
					amount_cents: 12000,
					category: 'activities',
					description: 'Swim class (month)',
					spent_on: isoDate(day(-10))
				},
				{
					family_id: family.id,
					child_id: lily,
					paid_by: dad,
					amount_cents: 4550,
					category: 'clothing',
					description: 'Rain boots + jacket',
					spent_on: isoDate(day(-6))
				},
				{
					family_id: family.id,
					child_id: lily,
					paid_by: mom,
					amount_cents: 2500,
					category: 'medical',
					description: 'Pediatrician co-pay',
					spent_on: isoDate(day(-4))
				},
				{
					family_id: family.id,
					child_id: lily,
					paid_by: dad,
					amount_cents: 3899,
					category: 'education',
					description: 'School supplies',
					spent_on: isoDate(day(-2))
				},
				{
					family_id: family.id,
					child_id: lily,
					paid_by: mom,
					amount_cents: 32000,
					category: 'childcare',
					description: 'After-school care',
					spent_on: isoDate(day(-1))
				}
			]),
			'expenses'
		);
	}

	if (await isEmpty('outings', 'family_id', family.id)) {
		check(
			await db.from('outings').insert([
				{
					family_id: family.id,
					child_id: lily,
					parent_member_id: dad,
					title: 'Zoo morning',
					child_rating: 5,
					happened_on: isoDate(day(-9))
				},
				{
					family_id: family.id,
					child_id: lily,
					parent_member_id: mom,
					title: 'Library story time',
					child_rating: 4,
					happened_on: isoDate(day(-5))
				}
			]),
			'outings'
		);
	}

	if (await isEmpty('mood_checkins', 'child_id', lily)) {
		check(
			await db.from('mood_checkins').insert([
				{ child_id: lily, mood: 'happy', energy: 4, created_at: day(-3, 18).toISOString() },
				{ child_id: lily, mood: 'tired', energy: 2, created_at: day(-2, 19).toISOString() },
				{ child_id: lily, mood: 'calm', energy: 3, created_at: day(-1, 18).toISOString() }
			]),
			'mood check-ins'
		);
	}

	if (await isEmpty('wish_cards', 'child_id', lily)) {
		check(
			await db.from('wish_cards').insert([
				{
					family_id: family.id,
					child_id: lily,
					prompt: 'Where would you go on an adventure?',
					interest: 'Go to the zoo',
					shared_with_parents: true,
					shared_at: day(-1).toISOString()
				},
				{
					family_id: family.id,
					child_id: lily,
					prompt: 'What would you build?',
					interest: 'Build a blanket fort',
					shared_with_parents: true,
					shared_at: day(-1).toISOString()
				},
				{
					family_id: family.id,
					child_id: lily,
					prompt: 'What is your secret wish?',
					interest: 'A puppy named Biscuit',
					shared_with_parents: false
				}
			]),
			'wish cards'
		);
	}

	check(
		await db.from('weekly_insights').upsert(
			{
				family_id: family.id,
				child_id: lily,
				week_start: isoDate(MONDAY),
				mood_trend: 'a_bit_tired',
				interests: ['animals', 'forts'],
				summary: 'A bit tired this week; into forts and animals.',
				gentle_flag: false
			},
			{ onConflict: 'child_id,week_start' }
		),
		'weekly insight'
	);
}

// ---------------------------------------------------------------------------
// Diaz family (used ONLY by the RLS test: Carter must never see it)
// ---------------------------------------------------------------------------
async function seedDiaz() {
	const anaId = await ensureParentUser(DEMO.ana.email, DEMO.ana.password, DEMO.ana.name);
	const family = await ensureFamily(DEMO.diaz.name, DEMO.diaz.code);
	const ana = await ensureParentMember(family.id, anaId, DEMO.ana.name, 'A');
	// One parent only => Leo stays pending_consent (as the real flow would).
	const leo = await ensureChild(
		family.id,
		DEMO.leo.firstName,
		DEMO.leo.birthYear,
		DEMO.leo.pin,
		[ana],
		false
	);

	if (await isEmpty('events', 'family_id', family.id)) {
		check(
			await db.from('events').insert({
				family_id: family.id,
				child_id: leo,
				title: 'Soccer practice',
				starts_at: day(1, 16).toISOString(),
				ends_at: day(1, 17).toISOString(),
				home: 'A',
				source: 'manual',
				created_by: ana
			}),
			'diaz event'
		);
	}
	if (await isEmpty('threads', 'family_id', family.id)) {
		const thread = check(
			await db
				.from('threads')
				.insert({ family_id: family.id, topic: 'School', created_by: ana })
				.select('id')
				.single(),
			'diaz thread'
		);
		check(
			await db.from('messages').insert({
				family_id: family.id,
				thread_id: thread.id,
				sender_id: ana,
				body: 'Parent-teacher meeting is on Thursday.'
			}),
			'diaz message'
		);
	}
	if (await isEmpty('expenses', 'family_id', family.id)) {
		check(
			await db.from('expenses').insert({
				family_id: family.id,
				child_id: leo,
				paid_by: ana,
				amount_cents: 5000,
				category: 'activities',
				description: 'Soccer fee'
			}),
			'diaz expense'
		);
	}
	if (await isEmpty('wish_cards', 'child_id', leo)) {
		check(
			await db.from('wish_cards').insert({
				family_id: family.id,
				child_id: leo,
				interest: 'Go to the beach',
				shared_with_parents: true
			}),
			'diaz wish'
		);
	}
	check(
		await db.from('weekly_insights').upsert(
			{
				family_id: family.id,
				child_id: leo,
				week_start: isoDate(MONDAY),
				mood_trend: 'mostly_happy',
				interests: ['soccer'],
				summary: 'Mostly happy; loves soccer.'
			},
			{ onConflict: 'child_id,week_start' }
		),
		'diaz insight'
	);
}

async function main() {
	await seedCarter();
	await seedDiaz();
	console.log('\nSeed complete. Demo logins:\n');
	console.table([
		{ who: 'Parent A (Mom)', login: DEMO.mom.email, secret: DEMO.mom.password, where: '/login' },
		{ who: 'Parent B (Dad)', login: DEMO.dad.email, secret: DEMO.dad.password, where: '/login' },
		{
			who: 'Child (Lily)',
			login: `family code ${DEMO.carter.code}`,
			secret: `PIN ${DEMO.lily.pin}`,
			where: '/kid-login'
		},
		{
			who: 'RLS test only (Ana, Diaz)',
			login: DEMO.ana.email,
			secret: DEMO.ana.password,
			where: '/login'
		}
	]);
}

main().catch((err) => {
	console.error('Seed failed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
