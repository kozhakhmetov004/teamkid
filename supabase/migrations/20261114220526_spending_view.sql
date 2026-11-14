-- spending_view (Member 1, P2)
-- Shared spending by category and month. security_invoker => the RLS on
-- expenses applies, so each parent sees only their family. Cancelled and
-- disputed expenses are excluded. Identical numbers for both parents: there is
-- deliberately no per-parent breakdown here.

drop view if exists public.v_spending_by_category;
create view public.v_spending_by_category
with (security_invoker = true)
as
select
	e.family_id,
	date_trunc('month', e.spent_on)::date as month,
	e.category,
	sum(e.amount_cents)::bigint as total_cents,
	count(*)::integer as items
from public.expenses e
where e.status in ('pending', 'approved', 'reimbursed')
group by e.family_id, date_trunc('month', e.spent_on), e.category;

revoke all on public.v_spending_by_category from anon;
grant select on public.v_spending_by_category to authenticated;
