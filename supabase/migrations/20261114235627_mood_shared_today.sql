-- shared_moods: today's feeling, ONLY when the child chose "Yes, tell them",
-- plus mood_checkins.shared (see the end of this file).
-- mood_checkins stays child-only (no parent policy is added there). This table
-- holds one row per child: the child's latest answer. "Keep it just for me"
-- clears mood/energy (an UPDATE, not a DELETE, so Realtime delivers it to the
-- parents' dashboards and the old feeling disappears at once).

create table public.shared_moods (
	child_id uuid primary key references public.children (id) on delete cascade,
	family_id uuid not null references public.families (id) on delete cascade,
	mood text check (
		mood in ('happy', 'excited', 'calm', 'okay', 'tired', 'sad', 'worried', 'angry')
	),
	energy smallint check (energy between 1 and 5),
	shared_at timestamptz not null default now(),
	-- Energy is only shared together with a feeling.
	constraint shared_moods_energy_needs_mood check (mood is not null or energy is null)
);
create index shared_moods_family_id_idx on public.shared_moods (family_id);
create trigger shared_moods_set_family
	before insert or update of child_id on public.shared_moods
	for each row execute function public.set_family_id_from_child();

alter table public.shared_moods enable row level security;
revoke all on public.shared_moods from anon;

-- The child owns the row (share, change, or take it back).
create policy shared_moods_select_child on public.shared_moods
	for select to authenticated using (child_id = public.current_child_id());
create policy shared_moods_insert_child on public.shared_moods
	for insert to authenticated with check (child_id = public.current_child_id());
create policy shared_moods_update_child on public.shared_moods
	for update to authenticated
	using (child_id = public.current_child_id()) with check (child_id = public.current_child_id());

-- Both parents read it (identical for both); they can never write it.
create policy shared_moods_select_parent on public.shared_moods
	for select to authenticated using (public.is_family_parent(family_id));

alter publication supabase_realtime add table public.shared_moods;

-- mood_checkins.shared: the child's answer for that check-in. Only shared
-- check-ins feed the parents' weekly insight; "just for me" ones never do.
-- The child may later share a check-in (Pebble's "tell a grown-up?" nudge), so
-- the child can update this ONE column of their own rows. Still no parent policy.
alter table public.mood_checkins add column shared boolean not null default false;
revoke update on public.mood_checkins from authenticated;
grant update (shared) on public.mood_checkins to authenticated;
create policy mood_update_child_shared on public.mood_checkins
	for update to authenticated
	using (child_id = public.current_child_id()) with check (child_id = public.current_child_id());
