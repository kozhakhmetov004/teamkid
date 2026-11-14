-- expenses_flow (Member 1, P2)
-- Shared child expenses: log -> approve / dispute / cancel -> reimburse.
--
--  * description -> title (1–80), + note, status_note, responded_by/at,
--    reimbursed_at, resubmit_of
--  * categories: school (was education) + entertainment
--  * statuses: pending | approved | disputed | reimbursed (was settled) | cancelled
--  * split = {"payer_share_pct": 50, "other_share_pct": 50} (shape enforced)
--  * status changes ONLY through respond_to_expense(); the direct UPDATE policy
--    is removed (same pattern as swaps). Insert only as yourself (paid_by =
--    caller) and only 'pending', or 'approved' when the other parent owes 0.
--  * expenses published for Realtime.

-- ---- columns ------------------------------------------------------------------------
alter table public.expenses rename column description to title;
alter table public.expenses drop constraint if exists expenses_description_check;
update public.expenses set title = initcap(category) where title is null or btrim(title) = '';
update public.expenses set title = left(title, 80) where char_length(title) > 80;
alter table public.expenses
	alter column title set not null,
	add constraint expenses_title_check check (char_length(btrim(title)) between 1 and 80),
	add column note text check (note is null or char_length(note) <= 280),
	add column status_note text check (status_note is null or char_length(status_note) <= 280),
	add column responded_by uuid references public.members (id) on delete set null,
	add column responded_at timestamptz,
	add column reimbursed_at timestamptz,
	add column resubmit_of uuid references public.expenses (id) on delete set null;

-- ---- categories & statuses --------------------------------------------------------------
update public.expenses set category = 'school' where category = 'education';
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check check (
	category in ('school', 'medical', 'activities', 'entertainment', 'clothing', 'childcare', 'food', 'travel', 'other')
);

update public.expenses set status = 'reimbursed' where status = 'settled';
alter table public.expenses drop constraint if exists expenses_status_check;
alter table public.expenses add constraint expenses_status_check check (
	status in ('pending', 'approved', 'disputed', 'reimbursed', 'cancelled')
);

-- ---- amount & split -----------------------------------------------------------------------
alter table public.expenses drop constraint if exists expenses_amount_cents_check;
alter table public.expenses add constraint expenses_amount_cents_check
	check (amount_cents > 0 and amount_cents <= 1000000); -- max $10,000

update public.expenses
set split = jsonb_build_object('payer_share_pct', 50, 'other_share_pct', 50)
where split is null or split ? 'payer_share_pct' = false;
alter table public.expenses
	alter column split set default '{"payer_share_pct": 50, "other_share_pct": 50}'::jsonb,
	-- `?` first: a missing key would make the rest NULL, and CHECK treats NULL as pass.
	add constraint expenses_split_shape check (
		split ? 'payer_share_pct'
		and split ? 'other_share_pct'
		and jsonb_typeof(split -> 'payer_share_pct') = 'number'
		and jsonb_typeof(split -> 'other_share_pct') = 'number'
		and (split ->> 'payer_share_pct')::numeric between 0 and 100
		and (split ->> 'other_share_pct')::numeric between 0 and 100
		and abs((split ->> 'payer_share_pct')::numeric + (split ->> 'other_share_pct')::numeric - 100) < 0.01
	);

create index if not exists expenses_family_status_idx on public.expenses (family_id, status);

-- ---- RLS: no direct updates; insert only as yourself ----------------------------------------
drop policy if exists expenses_update_parent on public.expenses;
drop policy if exists expenses_insert_parent on public.expenses;
create policy expenses_insert_parent on public.expenses
	for insert to authenticated
	with check (
		public.is_family_parent(family_id)
		and paid_by in (select public.current_member_ids())
		and (
			status = 'pending'
			or (status = 'approved' and (split ->> 'other_share_pct')::numeric = 0)
		)
	);

-- ---- status changes -------------------------------------------------------------------------
create or replace function public.respond_to_expense(
	p_expense_id uuid,
	p_action text,
	p_note text default null
)
returns public.expenses
language plpgsql security definer
set search_path = public
as $$
declare
	e public.expenses;
	v_me uuid;
	v_payer boolean;
	v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
	if auth.uid() is null then
		raise exception 'Not signed in' using errcode = '28000';
	end if;
	select * into e from public.expenses where id = p_expense_id for update;
	if not found then
		raise exception 'Expense not found' using errcode = 'P0002';
	end if;
	v_me := public.parent_member_in_family(e.family_id);
	if v_me is null then
		raise exception 'Not allowed' using errcode = '42501';
	end if;
	v_payer := e.paid_by = v_me;

	if p_action = 'approve' then
		if v_payer then raise exception 'You can''t approve your own expense' using errcode = '42501'; end if;
		if e.status <> 'pending' then raise exception 'Only pending expenses can be approved' using errcode = 'P0001'; end if;
		update public.expenses set status = 'approved', responded_by = v_me, responded_at = now()
		where id = e.id returning * into e;
	elsif p_action = 'dispute' then
		if v_payer then raise exception 'You can''t dispute your own expense' using errcode = '42501'; end if;
		if e.status <> 'pending' then raise exception 'Only pending expenses can be disputed' using errcode = 'P0001'; end if;
		if v_note is null or char_length(v_note) < 5 or char_length(v_note) > 280 then
			raise exception 'Please add a short note (5–280 characters)' using errcode = '22023';
		end if;
		update public.expenses set status = 'disputed', status_note = v_note, responded_by = v_me, responded_at = now()
		where id = e.id returning * into e;
	elsif p_action = 'cancel' then
		if not v_payer then raise exception 'Only the parent who logged it can cancel' using errcode = '42501'; end if;
		if e.status not in ('pending', 'disputed') then raise exception 'This expense can''t be cancelled any more' using errcode = 'P0001'; end if;
		update public.expenses set status = 'cancelled', responded_by = v_me, responded_at = now()
		where id = e.id returning * into e;
	elsif p_action = 'reimburse' then
		if v_payer then raise exception 'The parent who owes records the reimbursement' using errcode = '42501'; end if;
		if e.status <> 'approved' then raise exception 'Only approved expenses can be marked as reimbursed' using errcode = 'P0001'; end if;
		if (e.split ->> 'other_share_pct')::numeric = 0 then
			raise exception 'Nothing to reimburse on this expense' using errcode = 'P0001';
		end if;
		update public.expenses set status = 'reimbursed', reimbursed_at = now(), responded_by = v_me, responded_at = now()
		where id = e.id returning * into e;
	else
		raise exception 'Unknown action %', p_action using errcode = '22023';
	end if;

	insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id)
	values (e.family_id, v_me, 'expense.' || e.status, 'expenses', e.id);
	return e;
end;
$$;

revoke execute on function public.respond_to_expense(uuid, text, text) from public, anon;
grant execute on function public.respond_to_expense(uuid, text, text) to authenticated, service_role;

alter publication supabase_realtime add table public.expenses;
