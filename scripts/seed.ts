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
import { computeInsight } from '../src/lib/kids/insightRules.js';
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
		| 'custody_schedules'
		| 'expense_requests'
		| 'recurring_expenses',
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
		// 2-2-3 over two weeks: A A B B A A A | B B A A B B B (A = Mom, B = Dad)
		const homes = [...'AABBAAABBAABBB'] as ('A' | 'B')[];
		const nights = homes.map((home, i) => ({
			family_id: family.id,
			child_id: lily,
			title: home === 'A' ? "Night at Mom's" : "Night at Dad's",
			starts_at: day(i, 17).toISOString(),
			ends_at: day(i + 1, 8).toISOString(),
			home,
			kind: 'custody',
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
					kind: 'activity',
					place: 'Riverside Pool',
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
					kind: 'school',
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
		// ~15 expenses over the last 3 months (dates relative to this week, never in
		// the future) so the spending chart and the balance look real.
		const half = { payer_share_pct: 50, other_share_pct: 50 };
		const exp = (
			offset: number,
			payer: string,
			cents: number,
			category: string,
			title: string,
			status: 'pending' | 'approved' | 'disputed' | 'reimbursed',
			extra: Record<string, unknown> = {}
		) => ({
			family_id: family.id,
			child_id: lily,
			paid_by: payer,
			amount_cents: cents,
			category,
			title,
			spent_on: isoDate(day(offset)),
			split: half,
			status,
			...(status === 'approved' || status === 'reimbursed'
				? {
						responded_by: payer === mom ? dad : mom,
						responded_at: day(offset + 1, 9).toISOString()
					}
				: {}),
			...(status === 'reimbursed' ? { reimbursed_at: day(offset + 3, 9).toISOString() } : {}),
			...extra
		});
		check(
			await db.from('expenses').insert(
				[
					exp(-1, dad, 3800, 'entertainment', 'Zoo tickets', 'pending'),
					exp(-3, mom, 32000, 'childcare', 'After-school care', 'approved'),
					exp(-5, mom, 2500, 'medical', 'Pediatrician co-pay', 'approved'),
					exp(-8, dad, 3899, 'school', 'School supplies', 'approved'),
					exp(-10, mom, 12000, 'activities', 'Swim class (month)', 'pending'),
					exp(-12, dad, 4550, 'clothing', 'Rain boots + jacket', 'disputed', {
						status_note: 'I think we agreed on the cheaper pair?',
						responded_by: mom,
						responded_at: day(-11, 10).toISOString()
					}),
					exp(-20, mom, 2400, 'entertainment', 'Movie night', 'approved'),
					exp(-25, dad, 6000, 'medical', 'Dentist check-up', 'approved'),
					exp(-30, dad, 9500, 'activities', 'Soccer registration', 'reimbursed'),
					exp(-34, mom, 7999, 'clothing', 'Winter coat', 'approved'),
					exp(-40, mom, 1500, 'school', 'Field trip', 'approved'),
					exp(-50, dad, 2500, 'entertainment', 'Birthday party gift', 'approved'),
					exp(-62, mom, 32000, 'childcare', 'After-school care', 'approved'),
					exp(-66, mom, 4500, 'medical', 'Eye exam', 'approved'),
					exp(-72, dad, 11000, 'activities', 'Piano lessons', 'approved')
				],
				{ defaultToNull: false }
			),
			'expenses'
		);
	}

	// Expenses v2 demo: Dad asks before spending; Mom proposes a monthly cost.
	// Both wait for the other parent, so each sees "Needs your answer".
	if (await isEmpty('expense_requests', 'family_id', family.id)) {
		check(
			await db.from('expense_requests').insert({
				family_id: family.id,
				child_id: lily,
				requested_by: dad,
				title: 'Soccer season',
				category: 'activities',
				estimate_cents: 18000,
				note: 'Lily wants to join her friends this spring.'
			}),
			'expense_requests'
		);
	}
	if (await isEmpty('recurring_expenses', 'family_id', family.id)) {
		const now = new Date();
		check(
			await db.from('recurring_expenses').insert({
				family_id: family.id,
				child_id: lily,
				created_by: mom,
				title: 'After-school club',
				category: 'childcare',
				amount_cents: 12000,
				day_of_month: 1,
				start_month: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
			}),
			'recurring_expenses'
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

	// Kids' space: earlier THIS UTC week, never in the future (on a Monday that means
	// earlier today), so the live demo check-in still changes the insight card.
	const earlierThisWeek = (fraction: number) =>
		new Date(MONDAY.getTime() + (Date.now() - MONDAY.getTime()) * fraction).toISOString();
	// Shared ("Yes, tell them"): only shared check-ins feed the parents' insight.
	const seedCheckins = [
		{ child_id: lily, mood: 'happy', energy: 4, shared: true, created_at: earlierThisWeek(0.3) },
		{ child_id: lily, mood: 'calm', energy: 3, shared: true, created_at: earlierThisWeek(0.6) }
	];
	if (await isEmpty('mood_checkins', 'child_id', lily)) {
		check(await db.from('mood_checkins').insert(seedCheckins), 'mood check-ins');
	}

	// Not shared: the demo shares the zoo live. The puppy stays private.
	const seedWishes = [
		{ prompt: 'If we had a free Saturday…', interest: 'Go to the zoo' },
		{ prompt: 'What would you build?', interest: 'Build a blanket fort' },
		{ prompt: 'What is your secret wish?', interest: 'A puppy named Biscuit' }
	].map((w, i) => ({
		...w,
		family_id: family.id,
		child_id: lily,
		shared_with_parents: false,
		created_at: earlierThisWeek(0.2 + i * 0.1)
	}));
	if (await isEmpty('wish_cards', 'child_id', lily)) {
		check(await db.from('wish_cards').insert(seedWishes), 'wish cards');
	}

	// Same rules as the app's insight builder.
	const insight = computeInsight(seedCheckins, seedWishes, { tz: 'UTC' });
	check(
		await db.from('weekly_insights').upsert(
			{
				family_id: family.id,
				child_id: lily,
				week_start: isoDate(MONDAY),
				mood_trend: insight.moodTrend,
				interests: insight.interests,
				summary: insight.summary,
				gentle_flag: insight.gentleFlag,
				created_at: earlierThisWeek(0.6)
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
				title: 'Soccer fee'
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
