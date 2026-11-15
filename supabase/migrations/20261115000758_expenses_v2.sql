-- expenses_v2 (Member 1)
--   1. Ask before spending  (expense_requests)
--   2. Monthly costs        (recurring_expenses, generated lazily, no cron)
--   3. Settle up            (settlements: one payment for the whole balance, or partial)
--   4. Family split         (family_finance + split_proposals; both parents approve)
--   5. Private income range (parent_income: ONLY its owner can read it, never the co-parent)
-- Status changes go through security-definer functions (same pattern as expenses/swaps);
-- there are no direct UPDATE policies on any of these tables.

-- ---- shared helpers -------------------------------------------------------------------
create or replace function public.valid_split(s jsonb)
returns boolean language sql immutable as $$
	select s ? 'payer_share_pct'
		and s ? 'other_share_pct'
		and jsonb_typeof(s -> 'payer_share_pct') = 'number'
		and jsonb_typeof(s -> 'other_share_pct') = 'number'
		and (s ->> 'payer_share_pct')::numeric between 0 and 100
		and (s ->> 'other_share_pct')::numeric between 0 and 100
		and abs((s ->> 'payer_share_pct')::numeric + (s ->> 'other_share_pct')::numeric - 100) < 0.01
$$;

create or replace function public.other_parent_of(p_family_id uuid, p_member_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
	select id from public.members
	where family_id = p_family_id and role = 'parent' and id <> p_member_id
	order by created_at limit 1
$$;
revoke execute on function public.other_parent_of(uuid, uuid) from public, anon;
grant execute on function public.other_parent_of(uuid, uuid) to authenticated, service_role;

-- =====================================================================================
-- 1. Ask before spending
-- =====================================================================================
create table public.expense_requests (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid references public.children (id) on delete set null,
	requested_by uuid not null references public.members (id) on delete cascade,
	title text not null check (char_length(btrim(title)) between 1 and 80),
	category text not null check (
		category in ('school', 'medical', 'activities', 'entertainment', 'clothing', 'childcare', 'food', 'travel', 'other')
	),
	estimate_cents integer not null check (estimate_cents > 0 and estimate_cents <= 1000000),
	split jsonb not null default '{"payer_share_pct": 50, "other_share_pct": 50}'::jsonb
		check (public.valid_split(split)),
	note text check (note is null or char_length(note) <= 280),
	status text not null default 'pending'
		check (status in ('pending', 'approved', 'declined', 'cancelled', 'used')),
	response_note text check (response_note is null or char_length(response_note) <= 280),
	responded_by uuid references public.members (id) on delete set null,
	responded_at timestamptz,
	expense_id uuid references public.expenses (id) on delete set null,
	created_at timestamptz not null default now()
);
create index expense_requests_family_idx on public.expense_requests (family_id, status, created_at desc);
alter table public.expense_requests enable row level security;
revoke all on public.expense_requests from anon;

create policy expense_requests_select_parent on public.expense_requests
	for select to authenticated using (public.is_family_parent(family_id));
create policy expense_requests_insert_parent on public.expense_requests
	for insert to authenticated
	with check (
		public.is_family_parent(family_id)
		and requested_by in (select public.current_member_ids())
		and status = 'pending'
		and responded_by is null and expense_id is null
	);

create or replace function public.respond_to_expense_request(
	p_request_id uuid,
	p_action text,
	p_note text default null
)
returns public.expense_requests
language plpgsql security definer set search_path = public
as $$
declare
	r public.expense_requests;
	v_me uuid;
	v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
	select * into r from public.expense_requests where id = p_request_id for update;
	if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
	v_me := public.parent_member_in_family(r.family_id);
	if v_me is null then raise exception 'Not allowed' using errcode = '42501'; end if;
	if v_note is not null and char_length(v_note) > 280 then
		raise exception 'Keep the note under 280 characters' using errcode = '22023';
	end if;

	if p_action in ('approve', 'decline') then
		if r.requested_by = v_me then raise exception 'You can''t answer your own request' using errcode = '42501'; end if;
		if r.status <> 'pending' then raise exception 'This request was already answered' using errcode = 'P0001'; end if;
		if p_action = 'decline' and (v_note is null or char_length(v_note) < 5) then
			raise exception 'Please add a short note (5–280 characters)' using errcode = '22023';
		end if;
		update public.expense_requests
		set status = case when p_action = 'approve' then 'approved' else 'declined' end,
			response_note = v_note, responded_by = v_me, responded_at = now()
		where id = r.id returning * into r;
	elsif p_action = 'cancel' then
		if r.requested_by <> v_me then raise exception 'Only the parent who asked can cancel' using errcode = '42501'; end if;
		if r.status not in ('pending', 'approved') then raise exception 'This request can''t be cancelled' using errcode = 'P0001'; end if;
		update public.expense_requests set status = 'cancelled', responded_by = v_me, responded_at = now()
		where id = r.id returning * into r;
	else
		raise exception 'Unknown action %', p_action using errcode = '22023';
	end if;

	insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id)
	values (r.family_id, v_me, 'expense_request.' || r.status, 'expense_requests', r.id);
	return r;
end;
$$;
revoke execute on function public.respond_to_expense_request(uuid, text, text) from public, anon;
grant execute on function public.respond_to_expense_request(uuid, text, text) to authenticated, service_role;

-- An approved request lets the requester log the real expense as already approved,
-- if it costs at most 10% more than the estimate and keeps the agreed split.
create or replace function public.request_covers(
	p_request_id uuid, p_family_id uuid, p_paid_by uuid, p_amount integer, p_split jsonb
)
returns boolean language sql stable security definer set search_path = public as $$
	select exists (
		select 1 from public.expense_requests r
		where r.id = p_request_id and r.family_id = p_family_id and r.status = 'approved'
			and r.requested_by = p_paid_by
			and p_amount <= ceil(r.estimate_cents * 1.10)
			and r.split = p_split
	)
$$;
revoke execute on function public.request_covers(uuid, uuid, uuid, integer, jsonb) from public, anon;
grant execute on function public.request_covers(uuid, uuid, uuid, integer, jsonb) to authenticated, service_role;

-- =====================================================================================
-- 2. Monthly costs
-- =====================================================================================
create table public.recurring_expenses (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid references public.children (id) on delete set null,
	created_by uuid not null references public.members (id) on delete cascade,
	title text not null check (char_length(btrim(title)) between 1 and 80),
	category text not null check (
		category in ('school', 'medical', 'activities', 'entertainment', 'clothing', 'childcare', 'food', 'travel', 'other')
	),
	amount_cents integer not null check (amount_cents > 0 and amount_cents <= 1000000),
	split jsonb not null default '{"payer_share_pct": 50, "other_share_pct": 50}'::jsonb
		check (public.valid_split(split)),
	day_of_month smallint not null check (day_of_month between 1 and 28),
	start_month date not null check (extract(day from start_month) = 1),
	status text not null default 'pending' check (status in ('pending', 'active', 'declined', 'stopped')),
	responded_by uuid references public.members (id) on delete set null,
	responded_at timestamptz,
	last_month date,
	created_at timestamptz not null default now()
);
create index recurring_expenses_family_idx on public.recurring_expenses (family_id, status);
alter table public.recurring_expenses enable row level security;
revoke all on public.recurring_expenses from anon;

create policy recurring_select_parent on public.recurring_expenses
	for select to authenticated using (public.is_family_parent(family_id));
create policy recurring_insert_parent on public.recurring_expenses
	for insert to authenticated
	with check (
		public.is_family_parent(family_id)
		and created_by in (select public.current_member_ids())
		-- the other parent approves once; a cost only I pay needs no approval
		and (status = 'pending' or (status = 'active' and (split ->> 'other_share_pct')::numeric = 0))
		and responded_by is null and last_month is null
	);

create or replace function public.respond_to_recurring(p_recurring_id uuid, p_action text)
returns public.recurring_expenses
language plpgsql security definer set search_path = public
as $$
declare
	r public.recurring_expenses;
	v_me uuid;
begin
	select * into r from public.recurring_expenses where id = p_recurring_id for update;
	if not found then raise exception 'Monthly cost not found' using errcode = 'P0002'; end if;
	v_me := public.parent_member_in_family(r.family_id);
	if v_me is null then raise exception 'Not allowed' using errcode = '42501'; end if;

	if p_action in ('approve', 'decline') then
		if r.created_by = v_me then raise exception 'You can''t approve your own monthly cost' using errcode = '42501'; end if;
		if r.status <> 'pending' then raise exception 'This was already answered' using errcode = 'P0001'; end if;
		update public.recurring_expenses
		set status = case when p_action = 'approve' then 'active' else 'declined' end,
			responded_by = v_me, responded_at = now()
		where id = r.id returning * into r;
	elsif p_action = 'stop' then
		-- Either parent can stop future months (or withdraw a pending one they created).
		if not (r.status = 'active' or (r.status = 'pending' and r.created_by = v_me)) then
			raise exception 'This monthly cost can''t be stopped' using errcode = 'P0001';
		end if;
		update public.recurring_expenses set status = 'stopped', responded_by = v_me, responded_at = now()
		where id = r.id returning * into r;
	else
		raise exception 'Unknown action %', p_action using errcode = '22023';
	end if;

	insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id)
	values (r.family_id, v_me, 'recurring.' || r.status, 'recurring_expenses', r.id);
	return r;
end;
$$;
revoke execute on function public.respond_to_recurring(uuid, text) from public, anon;
grant execute on function public.respond_to_recurring(uuid, text) to authenticated, service_role;

alter table public.expenses
	add column request_id uuid references public.expense_requests (id) on delete set null,
	add column recurring_id uuid references public.recurring_expenses (id) on delete set null,
	add column recurring_month date;
create unique index expenses_recurring_month_uq on public.expenses (recurring_id, recurring_month);

-- Logs every due month of each ACTIVE monthly cost (both parents agreed to the rule,
-- so the generated expenses are approved). Idempotent; at most 12 months back.
create or replace function public.generate_recurring_expenses(p_family_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
	r public.recurring_expenses;
	m date;
	d date;
	v_id uuid;
	n integer := 0;
	v_cur date := date_trunc('month', current_date)::date;
begin
	if not public.is_family_parent(p_family_id) then
		raise exception 'Not allowed' using errcode = '42501';
	end if;
	for r in
		select * from public.recurring_expenses
		where family_id = p_family_id and status = 'active'
		for update
	loop
		m := greatest(
			r.start_month,
			coalesce((r.last_month + interval '1 month')::date, r.start_month),
			(v_cur - interval '11 months')::date
		);
		while m <= v_cur loop
			d := make_date(extract(year from m)::int, extract(month from m)::int, r.day_of_month);
			exit when d > current_date;
			v_id := null;
			insert into public.expenses (
				family_id, child_id, paid_by, amount_cents, category, title, note, spent_on,
				split, status, recurring_id, recurring_month
			)
			values (
				r.family_id, r.child_id, r.created_by, r.amount_cents, r.category, r.title, 'Monthly cost', d,
				r.split, 'approved', r.id, m
			)
			on conflict (recurring_id, recurring_month) do nothing
			returning id into v_id;
			if v_id is not null then
				n := n + 1;
				insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id)
				values (r.family_id, null, 'expense.recurring', 'expenses', v_id);
			end if;
			update public.recurring_expenses set last_month = m where id = r.id;
			m := (m + interval '1 month')::date;
		end loop;
	end loop;
	return n;
end;
$$;
revoke execute on function public.generate_recurring_expenses(uuid) from public, anon;
grant execute on function public.generate_recurring_expenses(uuid) to authenticated, service_role;

-- =====================================================================================
-- 3. Settle up
-- =====================================================================================
create table public.settlements (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	paid_by uuid not null references public.members (id) on delete cascade,
	paid_to uuid not null references public.members (id) on delete cascade,
	amount_cents integer not null check (amount_cents > 0 and amount_cents <= 10000000),
	kind text not null check (kind in ('full', 'partial')),
	-- part of a partial payment not yet matched to expenses (lowers the balance)
	credit_cents integer not null default 0 check (credit_cents >= 0),
	method text not null check (method in ('zelle', 'venmo', 'paypal', 'cash', 'check', 'bank', 'other')),
	note text check (note is null or char_length(note) <= 140),
	confirmed_at timestamptz,
	created_at timestamptz not null default now()
);
create index settlements_family_idx on public.settlements (family_id, created_at desc);
alter table public.settlements enable row level security;
revoke all on public.settlements from anon;
create policy settlements_select_parent on public.settlements
	for select to authenticated using (public.is_family_parent(family_id));
-- no insert/update policies: settle_up() / confirm_settlement() only

alter table public.expenses
	add column settlement_id uuid references public.settlements (id) on delete set null;

-- Records a payment from the caller (who must owe money) to the co-parent.
-- Paying the whole balance marks every approved expense reimbursed; a smaller
-- amount is kept as credit until the balance is settled. No money moves in the app.
create or replace function public.settle_up(
	p_family_id uuid,
	p_amount_cents integer,
	p_method text,
	p_note text default null
)
returns public.settlements
language plpgsql security definer set search_path = public
as $$
declare
	v_me uuid;
	v_other uuid;
	v_owed_by_me bigint;
	v_owed_to_me bigint;
	v_my_credit bigint;
	v_their_credit bigint;
	v_net bigint;
	v_note text := nullif(btrim(coalesce(p_note, '')), '');
	s public.settlements;
begin
	v_me := public.parent_member_in_family(p_family_id);
	if v_me is null then raise exception 'Not allowed' using errcode = '42501'; end if;
	v_other := public.other_parent_of(p_family_id, v_me);
	if v_other is null then raise exception 'Invite your co-parent first' using errcode = 'P0001'; end if;
	if v_note is not null and char_length(v_note) > 140 then
		raise exception 'Keep the note under 140 characters' using errcode = '22023';
	end if;

	perform 1 from public.expenses where family_id = p_family_id and status = 'approved' for update;
	select
		coalesce(sum(round(amount_cents * (split ->> 'other_share_pct')::numeric / 100)) filter (where paid_by = v_other), 0),
		coalesce(sum(round(amount_cents * (split ->> 'other_share_pct')::numeric / 100)) filter (where paid_by = v_me), 0)
	into v_owed_by_me, v_owed_to_me
	from public.expenses where family_id = p_family_id and status = 'approved';
	select
		coalesce(sum(credit_cents) filter (where paid_by = v_me), 0),
		coalesce(sum(credit_cents) filter (where paid_by = v_other), 0)
	into v_my_credit, v_their_credit
	from public.settlements where family_id = p_family_id;
	v_net := v_owed_by_me - v_owed_to_me - v_my_credit + v_their_credit;

	if v_net <= 0 then raise exception 'You don''t owe anything right now' using errcode = 'P0001'; end if;
	if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > v_net then
		raise exception 'Enter an amount up to %', to_char(v_net / 100.0, 'FM$999,999,990.00') using errcode = '22023';
	end if;

	if p_amount_cents = v_net then
		insert into public.settlements (family_id, paid_by, paid_to, amount_cents, kind, credit_cents, method, note)
		values (p_family_id, v_me, v_other, p_amount_cents, 'full', 0, p_method, v_note)
		returning * into s;
		update public.expenses
		set status = 'reimbursed', reimbursed_at = now(), responded_by = v_me, responded_at = now(),
			settlement_id = s.id
		where family_id = p_family_id and status = 'approved'
			and (split ->> 'other_share_pct')::numeric > 0;
		update public.settlements set credit_cents = 0
		where family_id = p_family_id and id <> s.id and credit_cents > 0;
	else
		insert into public.settlements (family_id, paid_by, paid_to, amount_cents, kind, credit_cents, method, note)
		values (p_family_id, v_me, v_other, p_amount_cents, 'partial', p_amount_cents, p_method, v_note)
		returning * into s;
	end if;

	insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id, meta)
	values (p_family_id, v_me, 'settlement.' || s.kind, 'settlements', s.id,
		jsonb_build_object('amount_cents', s.amount_cents, 'method', s.method));
	return s;
end;
$$;
revoke execute on function public.settle_up(uuid, integer, text, text) from public, anon;
grant execute on function public.settle_up(uuid, integer, text, text) to authenticated, service_role;

-- The parent who received the money confirms it (trust, not a requirement).
create or replace function public.confirm_settlement(p_settlement_id uuid)
returns public.settlements
language plpgsql security definer set search_path = public
as $$
declare
	s public.settlements;
	v_me uuid;
begin
	select * into s from public.settlements where id = p_settlement_id for update;
	if not found then raise exception 'Payment not found' using errcode = 'P0002'; end if;
	v_me := public.parent_member_in_family(s.family_id);
	if v_me is null or s.paid_to <> v_me then
		raise exception 'Only the parent who received it can confirm' using errcode = '42501';
	end if;
	if s.confirmed_at is not null then return s; end if;
	update public.settlements set confirmed_at = now() where id = s.id returning * into s;
	insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id)
	values (s.family_id, v_me, 'settlement.confirmed', 'settlements', s.id);
	return s;
end;
$$;
revoke execute on function public.confirm_settlement(uuid) from public, anon;
grant execute on function public.confirm_settlement(uuid) to authenticated, service_role;

-- =====================================================================================
-- 4. Family split (shared default, both parents agree)
-- =====================================================================================
create table public.family_finance (
	family_id uuid primary key references public.families (id) on delete cascade,
	-- {"<member_id>": 60, "<member_id>": 40}
	default_shares jsonb not null,
	basis text not null check (basis in ('custom', 'income')),
	agreed_at timestamptz not null default now()
);
alter table public.family_finance enable row level security;
revoke all on public.family_finance from anon;
create policy family_finance_select_parent on public.family_finance
	for select to authenticated using (public.is_family_parent(family_id));

create table public.split_proposals (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	proposed_by uuid not null references public.members (id) on delete cascade,
	shares jsonb not null,
	basis text not null check (basis in ('custom', 'income')),
	status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
	responded_by uuid references public.members (id) on delete set null,
	responded_at timestamptz,
	created_at timestamptz not null default now()
);
create index split_proposals_family_idx on public.split_proposals (family_id, created_at desc);
alter table public.split_proposals enable row level security;
revoke all on public.split_proposals from anon;
create policy split_proposals_select_parent on public.split_proposals
	for select to authenticated using (public.is_family_parent(family_id));

create or replace function public.propose_family_split(p_family_id uuid, p_my_pct numeric, p_basis text)
returns public.split_proposals
language plpgsql security definer set search_path = public
as $$
declare
	v_me uuid;
	v_other uuid;
	p public.split_proposals;
begin
	v_me := public.parent_member_in_family(p_family_id);
	if v_me is null then raise exception 'Not allowed' using errcode = '42501'; end if;
	v_other := public.other_parent_of(p_family_id, v_me);
	if v_other is null then raise exception 'Invite your co-parent first' using errcode = 'P0001'; end if;
	if p_my_pct is null or p_my_pct < 0 or p_my_pct > 100 or p_my_pct <> round(p_my_pct) then
		raise exception 'Choose a whole percentage from 0 to 100' using errcode = '22023';
	end if;
	if p_basis not in ('custom', 'income') then raise exception 'Unknown basis' using errcode = '22023'; end if;

	update public.split_proposals set status = 'cancelled', responded_by = v_me, responded_at = now()
	where family_id = p_family_id and status = 'pending';
	insert into public.split_proposals (family_id, proposed_by, shares, basis)
	values (p_family_id, v_me, jsonb_build_object(v_me::text, p_my_pct, v_other::text, 100 - p_my_pct), p_basis)
	returning * into p;

	insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id)
	values (p_family_id, v_me, 'split.proposed', 'split_proposals', p.id);
	return p;
end;
$$;
revoke execute on function public.propose_family_split(uuid, numeric, text) from public, anon;
grant execute on function public.propose_family_split(uuid, numeric, text) to authenticated, service_role;

create or replace function public.respond_to_split_proposal(p_proposal_id uuid, p_action text)
returns public.split_proposals
language plpgsql security definer set search_path = public
as $$
declare
	p public.split_proposals;
	v_me uuid;
begin
	select * into p from public.split_proposals where id = p_proposal_id for update;
	if not found then raise exception 'Proposal not found' using errcode = 'P0002'; end if;
	v_me := public.parent_member_in_family(p.family_id);
	if v_me is null then raise exception 'Not allowed' using errcode = '42501'; end if;
	if p.status <> 'pending' then raise exception 'This proposal was already answered' using errcode = 'P0001'; end if;

	if p_action in ('accept', 'decline') then
		if p.proposed_by = v_me then raise exception 'Your co-parent answers this one' using errcode = '42501'; end if;
		update public.split_proposals
		set status = case when p_action = 'accept' then 'accepted' else 'declined' end,
			responded_by = v_me, responded_at = now()
		where id = p.id returning * into p;
		if p.status = 'accepted' then
			insert into public.family_finance (family_id, default_shares, basis, agreed_at)
			values (p.family_id, p.shares, p.basis, now())
			on conflict (family_id) do update
				set default_shares = excluded.default_shares, basis = excluded.basis, agreed_at = now();
		end if;
	elsif p_action = 'cancel' then
		if p.proposed_by <> v_me then raise exception 'Only the parent who proposed can cancel' using errcode = '42501'; end if;
		update public.split_proposals set status = 'cancelled', responded_by = v_me, responded_at = now()
		where id = p.id returning * into p;
	else
		raise exception 'Unknown action %', p_action using errcode = '22023';
	end if;

	insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id)
	values (p.family_id, v_me, 'split.' || p.status, 'split_proposals', p.id);
	return p;
end;
$$;
revoke execute on function public.respond_to_split_proposal(uuid, text) from public, anon;
grant execute on function public.respond_to_split_proposal(uuid, text) to authenticated, service_role;

-- =====================================================================================
-- 5. Private income range (owner only)
-- =====================================================================================
-- Never readable by the co-parent: no family-wide policy, not in Realtime, not in
-- the audit log, not in exports. The only cross-parent use is the income-based
-- split suggestion, computed on the server ONLY when both parents turned on
-- share_for_split, and it returns a percentage, never the range.
create table public.parent_income (
	member_id uuid primary key references public.members (id) on delete cascade,
	family_id uuid not null references public.families (id) on delete cascade,
	band text not null check (
		band in ('under_25k', '25_50k', '50_75k', '75_100k', '100_150k', '150_250k', '250k_plus')
	),
	share_for_split boolean not null default false,
	updated_at timestamptz not null default now()
);
alter table public.parent_income enable row level security;
revoke all on public.parent_income from anon;
create policy parent_income_select_own on public.parent_income
	for select to authenticated using (member_id in (select public.current_member_ids()));
create policy parent_income_insert_own on public.parent_income
	for insert to authenticated
	with check (member_id in (select public.current_member_ids()) and public.is_family_parent(family_id));
create policy parent_income_update_own on public.parent_income
	for update to authenticated
	using (member_id in (select public.current_member_ids()))
	with check (member_id in (select public.current_member_ids()) and public.is_family_parent(family_id));
create policy parent_income_delete_own on public.parent_income
	for delete to authenticated using (member_id in (select public.current_member_ids()));

-- =====================================================================================
-- Expenses: insert rules + request bookkeeping
-- =====================================================================================
drop policy if exists expenses_insert_parent on public.expenses;
create policy expenses_insert_parent on public.expenses
	for insert to authenticated
	with check (
		public.is_family_parent(family_id)
		and paid_by in (select public.current_member_ids())
		and recurring_id is null and recurring_month is null and settlement_id is null
		and (
			status = 'pending'
			or (status = 'approved' and (split ->> 'other_share_pct')::numeric = 0)
			or (
				status = 'approved' and request_id is not null
				and public.request_covers(request_id, family_id, paid_by, amount_cents, split)
			)
		)
	);

-- Logging the expense for an approved request closes the request.
create or replace function public.expenses_mark_request_used()
returns trigger language plpgsql security definer set search_path = public as $$
begin
	if new.request_id is not null then
		update public.expense_requests
		set status = 'used', expense_id = new.id
		where id = new.request_id and status = 'approved' and requested_by = new.paid_by;
	end if;
	return new;
end;
$$;
create trigger expenses_request_used
	after insert on public.expenses
	for each row execute function public.expenses_mark_request_used();

-- Live updates for both parents (parent_income is deliberately NOT published).
alter publication supabase_realtime
	add table public.expense_requests, public.recurring_expenses, public.settlements,
		public.split_proposals, public.family_finance;
