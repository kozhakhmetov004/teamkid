/**
 * Expense flow security test with REAL signed-in clients (Mom, Dad, Ana).
 *   pnpm db:seed && pnpm test:expenses
 * Proves: insert only as yourself and never self-approved; the payer can't
 * approve their own expense; a direct UPDATE is refused; invalid transitions
 * are refused; another family can't answer or see the spending view.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database.js';
import { DEMO } from './lib/demo.js';
import { adminClient, anonClient } from './lib/env.js';

type Client = SupabaseClient<Database>;
const admin = adminClient();
let passed = 0;
const failures: string[] = [];
function expect(ok: boolean, label: string, detail = '') {
	if (ok) passed++;
	else failures.push(`${label}${detail ? ` (${detail})` : ''}`);
	console.log(`  ${ok ? '✔' : '✘'} ${label}${!ok && detail ? ` (${detail})` : ''}`);
}
async function signIn(email: string, password: string): Promise<Client> {
	const c = anonClient();
	const { error } = await c.auth.signInWithPassword({ email, password });
	if (error) throw new Error(`sign in ${email}: ${error.message}`);
	return c;
}

async function main() {
	const [mom, dad, ana] = await Promise.all([
		signIn(DEMO.mom.email, DEMO.mom.password),
		signIn(DEMO.dad.email, DEMO.dad.password),
		signIn(DEMO.ana.email, DEMO.ana.password)
	]);
	const family = (
		await admin.from('families').select('id').eq('family_code', DEMO.carter.code).single()
	).data!;
	const parents = (
		await admin
			.from('members')
			.select('id, display_name')
			.eq('family_id', family.id)
			.eq('role', 'parent')
	).data!;
	const momM = parents.find((p) => p.display_name === DEMO.mom.name)!.id;
	const dadM = parents.find((p) => p.display_name === DEMO.dad.name)!.id;
	const half = { payer_share_pct: 50, other_share_pct: 50 };
	const created: string[] = [];
	const base = {
		family_id: family.id,
		category: 'entertainment',
		amount_cents: 3800,
		spent_on: '2026-11-01',
		split: half
	};

	try {
		console.log('\nInserts');
		const ok = await mom
			.from('expenses')
			.insert({ ...base, paid_by: momM, title: 'Test zoo', status: 'pending' })
			.select('id')
			.single();
		expect(!ok.error && !!ok.data, 'Mom logs a pending expense', ok.error?.message);
		if (ok.data) created.push(ok.data.id);
		const asDad = await mom
			.from('expenses')
			.insert({ ...base, paid_by: dadM, title: 'Forged', status: 'pending' });
		expect(!!asDad.error, "Mom cannot log an expense in Dad's name");
		const selfApproved = await mom
			.from('expenses')
			.insert({ ...base, paid_by: momM, title: 'Self approved', status: 'approved' });
		expect(!!selfApproved.error, 'Mom cannot insert a 50/50 expense as already approved');
		const mine100 = await mom
			.from('expenses')
			.insert({
				...base,
				paid_by: momM,
				title: 'For the record',
				status: 'approved',
				split: { payer_share_pct: 100, other_share_pct: 0 }
			})
			.select('id')
			.single();
		expect(!mine100.error, 'A 100%-mine expense may be logged as approved', mine100.error?.message);
		if (mine100.data) created.push(mine100.data.id);
		const badSplit = await mom.from('expenses').insert({
			...base,
			paid_by: momM,
			title: 'Bad split',
			status: 'pending',
			split: { mode: 'equal' }
		});
		expect(!!badSplit.error, 'A malformed split is refused by the database');

		console.log('\nStatus changes');
		const id = ok.data!.id;
		const own = await mom.rpc('respond_to_expense', { p_expense_id: id, p_action: 'approve' });
		expect(
			!!own.error && /own expense/i.test(own.error.message),
			'Mom cannot approve her own expense',
			own.error?.message
		);
		const direct = await dad
			.from('expenses')
			.update({ status: 'approved' })
			.eq('id', id)
			.select('id');
		expect((direct.data ?? []).length === 0, 'Dad cannot approve with a plain UPDATE');
		const still = (await admin.from('expenses').select('status').eq('id', id).single()).data!;
		expect(still.status === 'pending', 'still pending after the bypass attempts');
		const outsider = await ana.rpc('respond_to_expense', { p_expense_id: id, p_action: 'approve' });
		expect(!!outsider.error, 'Another family cannot answer', outsider.error?.message);
		const noNote = await dad.rpc('respond_to_expense', {
			p_expense_id: id,
			p_action: 'dispute',
			p_note: 'no'
		});
		expect(!!noNote.error, 'A dispute needs a 5–280 character note');
		const reimburseEarly = await dad.rpc('respond_to_expense', {
			p_expense_id: id,
			p_action: 'reimburse'
		});
		expect(!!reimburseEarly.error, 'Cannot reimburse before approval (invalid transition)');
		const approved = await dad.rpc('respond_to_expense', { p_expense_id: id, p_action: 'approve' });
		expect(
			!approved.error && approved.data?.status === 'approved',
			'Dad approves',
			approved.error?.message
		);
		const twice = await dad.rpc('respond_to_expense', { p_expense_id: id, p_action: 'approve' });
		expect(!!twice.error, 'A second approve fails');
		const momReimburse = await mom.rpc('respond_to_expense', {
			p_expense_id: id,
			p_action: 'reimburse'
		});
		expect(!!momReimburse.error, 'The payer cannot mark it reimbursed (the owing parent does)');
		const reimbursed = await dad.rpc('respond_to_expense', {
			p_expense_id: id,
			p_action: 'reimburse'
		});
		expect(
			!reimbursed.error && reimbursed.data?.status === 'reimbursed',
			'Dad marks it reimbursed',
			reimbursed.error?.message
		);
		const audit = await admin
			.from('audit_log')
			.select('action')
			.eq('entity_id', id)
			.in('action', ['expense.approved', 'expense.reimbursed']);
		expect((audit.data ?? []).length === 2, 'both changes are in the audit log');

		console.log('\nIsolation');
		const anaView = await ana
			.from('v_spending_by_category')
			.select('family_id')
			.eq('family_id', family.id);
		expect((anaView.data ?? []).length === 0, 'Ana sees no Carter rows in the spending view');
		const momView = await mom
			.from('v_spending_by_category')
			.select('family_id')
			.eq('family_id', family.id);
		expect((momView.data ?? []).length > 0, 'Mom sees Carter rows in the spending view');
		const anaFile = await ana.storage
			.from('documents')
			.createSignedUrl(`${family.id}/docs/nope.pdf`, 60);
		expect(!!anaFile.error, 'Ana cannot sign a URL for a Carter file');
	} finally {
		if (created.length) await admin.from('expenses').delete().in('id', created);
		// Rows that should have been refused but weren't (keeps the demo data clean).
		await admin
			.from('expenses')
			.delete()
			.eq('family_id', family.id)
			.in('title', ['Forged', 'Self approved', 'Bad split']);
	}

	console.log(`\n${passed} passed, ${failures.length} failed`);
	if (failures.length) {
		console.log('\nFailures:\n  - ' + failures.join('\n  - '));
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Expense test crashed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
