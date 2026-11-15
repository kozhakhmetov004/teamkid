-- A parent may edit or delete only the events they created. Events with no
-- creator (imported, or created by the system) stay editable by both parents.
-- Custody nights still change only through swaps / the schedule setup
-- (security-definer functions bypass these policies).

drop policy if exists events_update_parent on public.events;
drop policy if exists events_delete_parent on public.events;

create policy events_update_parent on public.events
	for update to authenticated
	using (
		public.is_family_parent(family_id)
		and kind <> 'custody'
		and (created_by is null or created_by in (select public.current_member_ids()))
	)
	with check (public.is_family_parent(family_id) and kind <> 'custody');

create policy events_delete_parent on public.events
	for delete to authenticated
	using (
		public.is_family_parent(family_id)
		and kind <> 'custody'
		and (created_by is null or created_by in (select public.current_member_ids()))
	);
