-- events_kid_visible: parents choose what the child sees in their calendar
-- (e.g. hide a surprise). Children no longer read public.events directly: that
-- exposed every column (notes!) and every event of the family. They read
-- public.kid_calendar() instead, which returns only safe columns and only
-- events meant for them. Custody nights are always visible.

alter table public.events add column kid_visible boolean not null default true;

drop policy if exists events_select_child on public.events;

create or replace function public.kid_calendar(p_from timestamptz, p_to timestamptz)
returns table (
	id uuid,
	title text,
	kind text,
	starts_at timestamptz,
	ends_at timestamptz,
	home text,
	place text
)
language sql
stable
security definer
set search_path = public
as $$
	select e.id, e.title, e.kind, e.starts_at, e.ends_at, e.home, e.place
	from public.events e
	where public.current_child_id() is not null
		and e.family_id = public.family_of_child(public.current_child_id())
		and (e.child_id is null or e.child_id = public.current_child_id())
		and (e.kind = 'custody' or e.kid_visible)
		and e.ends_at >= p_from
		and e.starts_at < p_to
		and p_to - p_from <= interval '31 days'
	order by e.starts_at;
$$;

-- Where handovers happen ("Dad picks you up at Oakwood Elementary").
create or replace function public.kid_exchange_place()
returns text
language sql
stable
security definer
set search_path = public
as $$
	select nullif(s.rules ->> 'exchange_place', '')
	from public.custody_schedules s
	where public.current_child_id() is not null
		and s.family_id = public.family_of_child(public.current_child_id())
	order by s.created_at desc
	limit 1;
$$;

revoke execute on function public.kid_calendar(timestamptz, timestamptz) from public, anon;
revoke execute on function public.kid_exchange_place() from public, anon;
grant execute on function public.kid_calendar(timestamptz, timestamptz) to authenticated;
grant execute on function public.kid_exchange_place() to authenticated;
