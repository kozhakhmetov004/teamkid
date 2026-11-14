-- calendar_events (Member 1, feat/calendar)
-- 1. Live calendar: publish events for Realtime (RLS still applies).
-- 2. Custody nights (kind = 'custody') can't be inserted, edited or deleted by
--    users directly. They change only through security-definer functions:
--    respond_to_swap() and replace_custody_schedule(). Other events stay
--    editable by parents of the family.

alter publication supabase_realtime add table public.events;

drop policy if exists events_insert_parent on public.events;
drop policy if exists events_update_parent on public.events;
drop policy if exists events_delete_parent on public.events;

create policy events_insert_parent on public.events
	for insert to authenticated
	with check (public.is_family_parent(family_id) and kind <> 'custody');

create policy events_update_parent on public.events
	for update to authenticated
	using (public.is_family_parent(family_id) and kind <> 'custody')
	with check (public.is_family_parent(family_id) and kind <> 'custody');

create policy events_delete_parent on public.events
	for delete to authenticated
	using (public.is_family_parent(family_id) and kind <> 'custody');
