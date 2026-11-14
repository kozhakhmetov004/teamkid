-- 0007_analytics_realtime.sql
-- Analytics views (security_invoker => RLS of the underlying tables applies)
-- and the Realtime publication.

-- Shared: both parents see identical numbers.
create view public.v_spending_by_category
with (security_invoker = true)
as
select
	e.family_id,
	date_trunc('month', e.spent_on)::date as month,
	e.category,
	sum(e.amount_cents)::bigint as total_cents,
	count(*)::integer as expense_count
from public.expenses e
group by e.family_id, date_trunc('month', e.spent_on), e.category;

-- Private: only the parent who logged the outings (also enforced by outings RLS).
create view public.v_parent_time
with (security_invoker = true)
as
select
	o.parent_member_id,
	o.child_id,
	date_trunc('month', o.happened_on)::date as month,
	count(*)::integer as outings_count,
	round(avg(o.child_rating)::numeric, 1) as avg_rating,
	(array_agg(o.title order by o.child_rating desc nulls last, o.happened_on desc))[1:3] as top_activities
from public.outings o
where o.parent_member_id in (select public.current_member_ids())
group by o.parent_member_id, o.child_id, date_trunc('month', o.happened_on);

revoke all on public.v_spending_by_category from anon;
revoke all on public.v_parent_time from anon;
grant select on public.v_spending_by_category to authenticated;
grant select on public.v_parent_time to authenticated;

-- Realtime: postgres_changes respects RLS select policies.
alter publication supabase_realtime
	add table public.messages, public.swap_requests, public.wish_cards, public.weekly_insights;
