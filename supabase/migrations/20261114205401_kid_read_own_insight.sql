-- kid_read_own_insight
-- The child may read their OWN weekly insight, so /my-sharing can show exactly
-- what both parents see. Read-only: inserts/updates stay with the service role.
create policy insights_select_own_child on public.weekly_insights
	for select to authenticated
	using (child_id = public.current_child_id());
