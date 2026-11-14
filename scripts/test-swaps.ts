/**
 * Swap + custody protection test with REAL signed-in clients (Mom, Dad, Ana).
 * The service role is only used to read results and to clean up afterwards.
 *
 *   pnpm db:seed && pnpm test:swaps
 *
 * Proves: the requester can't accept their own swap; accepting flips both
 * custody nights; a second accept fails; nobody can bypass the functions
 * with plain UPDATE/INSERT; counter-offers link to the original; another
 * family can't answer; replace_custody_schedule is family-only.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database.js';
import { DEMO } from './lib/demo.js';
import { adminClient, anonClient } from './lib/env.js';

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

async function signIn(email: string, password: string): Promise<Client> {
	const c = anonClient();
	const { error } = await c.auth.signInWithPassword({ email, password });
	if (error) throw new Error(`sign in ${email}: ${error.message}`);
	return c;
}

async function main() {
	const mom = await signIn(DEMO.mom.email, DEMO.mom.password);
	const dad = await signIn(DEMO.dad.email, DEMO.dad.password);
	const ana = await signIn(DEMO.ana.email, DEMO.ana.password);

	const family = (
		await admin.from('families').select('id').eq('family_code', DEMO.carter.code).single()
	).data!;
	const parents = (
		await admin
			.from('members')
			.select('id, display_name, home')
			.eq('family_id', family.id)
			.eq('role', 'parent')
	).data!;
	const momM = parents.find((p) => p.display_name === DEMO.mom.name)!;
	const dadM = parents.find((p) => p.display_name === DEMO.dad.name)!;

	// Future custody nights in UTC (seed blocks start 17:00Z, so the UTC date is the night).
	const nights = (
		await admin
			.from('events')
			.select('id, starts_at, home')
			.eq('family_id', family.id)
			.eq('kind', 'custody')
			.gt('starts_at', new Date(Date.now() + 86_400_000).toISOString())
			.order('starts_at')
	).data!;
	const dateOf = (iso: string) => iso.slice(0, 10);
	const dadNight = nights.find((n) => n.home === dadM.home);
	const momNight = nights.find((n) => n.home === momM.home);
	if (!dadNight || !momNight)
		throw new Error(
			'Need future custody nights for both parents. Run pnpm db:reset && pnpm db:seed.'
		);
	const original = dateOf(dadNight.starts_at);
	const proposed = dateOf(momNight.starts_at);
	const createdSwaps: string[] = [];

	try {
		console.log(`\nDad gives ${original}, takes ${proposed}`);
		const created = await dad
			.from('swap_requests')
			.insert({
				family_id: family.id,
				requested_by: dadM.id,
				original_date: original,
				proposed_date: proposed,
				status: 'pending'
			})
			.select('id')
			.single();
		expect(
			!created.error && !!created.data,
			'Dad can create a swap request',
			created.error?.message
		);
		const swapId = created.data!.id;
		createdSwaps.push(swapId);

		const forged = await mom.from('swap_requests').insert({
			family_id: family.id,
			requested_by: dadM.id,
			original_date: original,
			status: 'pending'
		});
		expect(!!forged.error, 'Mom cannot create a request in Dad’s name');

		const own = await dad.rpc('respond_to_swap', {
			p_swap_id: swapId,
			p_action: 'accept',
			p_tz: 'UTC'
		});
		expect(
			!!own.error && /own swap/i.test(own.error.message),
			'Dad cannot accept his own request',
			own.error?.message
		);

		const sneaky = await mom
			.from('swap_requests')
			.update({ status: 'accepted' })
			.eq('id', swapId)
			.select('id');
		expect(
			!sneaky.error ? (sneaky.data ?? []).length === 0 : true,
			'Mom cannot accept with a plain UPDATE'
		);
		const still = (await admin.from('swap_requests').select('status').eq('id', swapId).single())
			.data!;
		expect(still.status === 'pending', 'request is still pending after the bypass attempts');

		const flipDirect = await mom
			.from('events')
			.update({ home: momM.home })
			.eq('id', dadNight.id)
			.select('id');
		expect((flipDirect.data ?? []).length === 0, 'Mom cannot flip a custody night directly');
		const fakeNight = await mom.from('events').insert({
			family_id: family.id,
			title: 'Fake night',
			kind: 'custody',
			home: 'A',
			starts_at: '2030-01-01T17:00:00Z',
			ends_at: '2030-01-02T08:00:00Z'
		});
		expect(!!fakeNight.error, 'Mom cannot insert a custody night directly');
		const normalEvent = await mom
			.from('events')
			.insert({
				family_id: family.id,
				title: 'Test dentist',
				kind: 'medical',
				starts_at: '2030-01-03T09:00:00Z',
				ends_at: '2030-01-03T10:00:00Z'
			})
			.select('id')
			.single();
		expect(!normalEvent.error, 'Mom can still add a normal event', normalEvent.error?.message);
		if (normalEvent.data) await admin.from('events').delete().eq('id', normalEvent.data.id);

		const outsider = await ana.rpc('respond_to_swap', {
			p_swap_id: swapId,
			p_action: 'accept',
			p_tz: 'UTC'
		});
		expect(!!outsider.error, 'A parent of another family cannot answer', outsider.error?.message);

		const accepted = await mom.rpc('respond_to_swap', {
			p_swap_id: swapId,
			p_action: 'accept',
			p_tz: 'UTC'
		});
		expect(
			!accepted.error && accepted.data?.status === 'accepted',
			'Mom accepts',
			accepted.error?.message
		);
		const after = (
			await admin.from('events').select('id, home').in('id', [dadNight.id, momNight.id])
		).data!;
		expect(
			after.find((e) => e.id === dadNight.id)?.home === momM.home,
			`the night of ${original} is now Mom's`
		);
		expect(
			after.find((e) => e.id === momNight.id)?.home === dadM.home,
			`the night of ${proposed} is now Dad's`
		);
		const audit = await admin
			.from('audit_log')
			.select('id')
			.eq('entity_id', swapId)
			.eq('action', 'swap.accepted');
		expect((audit.data ?? []).length === 1, 'acceptance is in the audit log');

		const again = await mom.rpc('respond_to_swap', {
			p_swap_id: swapId,
			p_action: 'accept',
			p_tz: 'UTC'
		});
		expect(
			!!again.error && /already handled/i.test(again.error.message),
			'a second accept fails',
			again.error?.message
		);

		console.log('\nCounter-offer');
		const second = await dad
			.from('swap_requests')
			.insert({
				family_id: family.id,
				requested_by: dadM.id,
				original_date: proposed,
				proposed_date: original,
				status: 'pending'
			})
			.select('id')
			.single();
		createdSwaps.push(second.data!.id);
		const counter = await mom.rpc('counter_swap', {
			p_swap_id: second.data!.id,
			p_original_date: original,
			p_proposed_date: proposed,
			p_note: 'How about this instead?'
		});
		expect(
			!counter.error &&
				counter.data?.counter_of === second.data!.id &&
				counter.data?.requested_by === momM.id,
			'Mom counters; the new request links to the original',
			counter.error?.message
		);
		if (counter.data) createdSwaps.push(counter.data.id);
		const old = (
			await admin.from('swap_requests').select('status').eq('id', second.data!.id).single()
		).data!;
		expect(old.status === 'countered', 'the original is marked countered');
		const declined = await dad.rpc('respond_to_swap', {
			p_swap_id: counter.data!.id,
			p_action: 'decline',
			p_tz: 'UTC'
		});
		expect(
			!declined.error && declined.data?.status === 'declined',
			'Dad declines the counter-offer',
			declined.error?.message
		);

		console.log('\nSchedule setup');
		const blocks = [
			{ starts_at: '2031-01-06T17:00:00Z', ends_at: '2031-01-07T17:00:00Z', home: 'A' },
			{ starts_at: '2031-01-07T17:00:00Z', ends_at: '2031-01-08T17:00:00Z', home: 'B' }
		];
		const args = {
			p_family_id: family.id,
			p_template: '2-2-3',
			p_start_date: '2031-01-06',
			p_exchange_time: '17:00',
			p_first_home: 'A',
			p_from: '2031-01-06T00:00:00Z',
			p_blocks: blocks
		};
		const anaTry = await ana.rpc('replace_custody_schedule', args);
		expect(!!anaTry.error, 'another family cannot replace Carter custody', anaTry.error?.message);
		const momSet = await mom.rpc('replace_custody_schedule', args);
		expect(!momSet.error && !!momSet.data, 'Mom can save a schedule', momSet.error?.message);
		const saved = (
			await admin
				.from('events')
				.select('title, home')
				.eq('family_id', family.id)
				.eq('kind', 'custody')
				.gte('starts_at', '2031-01-01T00:00:00Z')
		).data!;
		expect(
			saved.length === 2 && saved.some((e) => e.title === "Night at Mom's"),
			'schedule nights are created with parent names',
			JSON.stringify(saved)
		);
		if (momSet.data) {
			await admin
				.from('events')
				.delete()
				.eq('family_id', family.id)
				.eq('kind', 'custody')
				.gte('starts_at', '2031-01-01T00:00:00Z');
			await admin.from('custody_schedules').delete().eq('id', momSet.data);
		}
	} finally {
		// Restore the two seed nights and remove test requests (audit rows stay: append-only).
		await admin.from('events').update({ home: dadM.home }).eq('id', dadNight.id);
		await admin.from('events').update({ home: momM.home }).eq('id', momNight.id);
		if (createdSwaps.length) await admin.from('swap_requests').delete().in('id', createdSwaps);
	}

	console.log(`\n${passed} passed, ${failures.length} failed`);
	if (failures.length) {
		console.log('\nFailures:\n  - ' + failures.join('\n  - '));
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Swap test crashed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
