-- 0004_rls.sql
-- Row-level security. RLS is enabled on EVERY public table, which means
-- "deny by default": a role can only do what a policy below explicitly allows.
-- The service role (server only) bypasses RLS.

-- ===========================================================================
-- Helper functions (security definer => no recursive RLS evaluation)
-- ===========================================================================

-- Member ids of the signed-in user (one per family they belong to).
create or replace function public.current_member_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
	select m.id from public.members m where m.user_id = auth.uid();
$$;

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
	select exists (
		select 1 from public.members m where m.family_id = fid and m.user_id = auth.uid()
	);
$$;

create or replace function public.is_family_parent(fid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
	select exists (
		select 1 from public.members m
		where m.family_id = fid and m.user_id = auth.uid() and m.role = 'parent'
	);
$$;

-- children.id of the signed-in child (only while the account is active), else null.
create or replace function public.current_child_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
	select c.id
	from public.children c
	join public.members m on m.id = c.member_id
	where m.user_id = auth.uid() and c.status = 'active'
	limit 1;
$$;

create or replace function public.family_of_child(cid uuid)
returns uuid
language sql stable security definer
set search_path = public
as $$
	select c.family_id from public.children c where c.id = cid;
$$;

-- Helpers are only useful to signed-in users.
revoke execute on function public.current_member_ids() from public, anon;
revoke execute on function public.is_family_member(uuid) from public, anon;
revoke execute on function public.is_family_parent(uuid) from public, anon;
revoke execute on function public.current_child_id() from public, anon;
revoke execute on function public.family_of_child(uuid) from public, anon;
grant execute on function public.current_member_ids() to authenticated, service_role;
grant execute on function public.is_family_member(uuid) to authenticated, service_role;
grant execute on function public.is_family_parent(uuid) to authenticated, service_role;
grant execute on function public.current_child_id() to authenticated, service_role;
grant execute on function public.family_of_child(uuid) to authenticated, service_role;

-- ===========================================================================
-- Enable RLS everywhere
-- ===========================================================================
alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.children enable row level security;
alter table public.consents enable row level security;
alter table public.invites enable row level security;
alter table public.kid_login_attempts enable row level security;
alter table public.custody_schedules enable row level security;
alter table public.events enable row level security;
alter table public.swap_requests enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.expenses enable row level security;
alter table public.documents enable row level security;
alter table public.audit_log enable row level security;
alter table public.subscriptions enable row level security;
alter table public.pet_state enable row level security;
alter table public.mood_checkins enable row level security;
alter table public.wish_cards enable row level security;
alter table public.kid_chat_raw enable row level security;
alter table public.weekly_insights enable row level security;
alter table public.safety_alerts enable row level security;
alter table public.outings enable row level security;

-- The anon role never touches app tables directly.
revoke all on all tables in schema public from anon;
-- Rate-limit table: service role only.
revoke all on public.kid_login_attempts from authenticated;

-- ===========================================================================
-- families / members / invites
-- ===========================================================================
create policy families_select_parent on public.families
	for select to authenticated using (public.is_family_parent(id));
create policy families_update_parent on public.families
	for update to authenticated
	using (public.is_family_parent(id)) with check (public.is_family_parent(id));
-- Insert happens through public.create_family() below.

create policy members_select on public.members
	for select to authenticated
	using (public.is_family_parent(family_id) or user_id = auth.uid());
create policy members_insert_parent on public.members
	for insert to authenticated
	with check (public.is_family_parent(family_id) and role in ('bonus', 'professional'));
create policy members_update_self on public.members
	for update to authenticated
	using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Parents and children are created via create_family()/accept_invite() and the
-- server (add child), so nobody can promote themselves to 'parent'.

create policy invites_select_parent on public.invites
	for select to authenticated using (public.is_family_parent(family_id));
create policy invites_insert_parent on public.invites
	for insert to authenticated
	with check (
		public.is_family_parent(family_id)
		and invited_by in (select public.current_member_ids())
		and accepted_at is null
	);

-- Stop members from changing role/family/user on their own row.
create or replace function public.members_guard_update()
returns trigger
language plpgsql
as $$
begin
	if current_user = 'authenticated'
		and (new.role is distinct from old.role
			or new.family_id is distinct from old.family_id
			or new.user_id is distinct from old.user_id) then
		raise exception 'only display_name and home can be changed' using errcode = '42501';
	end if;
	return new;
end;
$$;
create trigger members_guard_update before update on public.members
	for each row execute function public.members_guard_update();

-- ===========================================================================
-- children / consents
-- ===========================================================================
create policy children_select on public.children
	for select to authenticated
	using (public.is_family_parent(family_id) or id = public.current_child_id());
-- Children are created and activated by the server (service role) only.

-- pin_hash never leaves the server: a bcrypt hash of a 4-digit PIN can be
-- brute-forced offline in seconds. Users may read every column except it.
revoke select on public.children from authenticated;
grant select (id, family_id, member_id, first_name, birth_year, mode, status, created_at)
	on public.children to authenticated;

create policy consents_select_parent on public.consents
	for select to authenticated
	using (public.is_family_parent(public.family_of_child(child_id)));
create policy consents_insert_self on public.consents
	for insert to authenticated
	with check (
		exists (
			select 1 from public.members m
			where m.id = parent_member_id
				and m.user_id = auth.uid()
				and m.role = 'parent'
				and m.family_id = public.family_of_child(child_id)
		)
	);

-- When every parent (min. 2) has consented, activate the child.
create or replace function public.activate_child_if_consented()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_family uuid;
	v_parents int;
	v_consents int;
begin
	select family_id into v_family from public.children where id = new.child_id;
	select count(*) into v_parents
		from public.members where family_id = v_family and role = 'parent' and user_id is not null;
	select count(distinct c.parent_member_id) into v_consents
		from public.consents c
		join public.members m on m.id = c.parent_member_id and m.role = 'parent'
		where c.child_id = new.child_id;
	if v_parents >= 2 and v_consents >= v_parents then
		update public.children set status = 'active'
		where id = new.child_id and status = 'pending_consent';
	end if;
	return new;
end;
$$;
create trigger consents_activate_child after insert on public.consents
	for each row execute function public.activate_child_if_consented();

-- ===========================================================================
-- Parent workspace tables
-- ===========================================================================
-- custody_schedules
create policy custody_select_parent on public.custody_schedules
	for select to authenticated using (public.is_family_parent(family_id));
create policy custody_insert_parent on public.custody_schedules
	for insert to authenticated with check (public.is_family_parent(family_id));
create policy custody_update_parent on public.custody_schedules
	for update to authenticated
	using (public.is_family_parent(family_id)) with check (public.is_family_parent(family_id));
create policy custody_delete_parent on public.custody_schedules
	for delete to authenticated using (public.is_family_parent(family_id));

-- events (children can read their own family's calendar: "where am I tonight?")
create policy events_select_parent on public.events
	for select to authenticated using (public.is_family_parent(family_id));
create policy events_select_child on public.events
	for select to authenticated
	using (
		public.current_child_id() is not null
		and family_id = public.family_of_child(public.current_child_id())
		and (child_id is null or child_id = public.current_child_id())
	);
create policy events_insert_parent on public.events
	for insert to authenticated with check (public.is_family_parent(family_id));
create policy events_update_parent on public.events
	for update to authenticated
	using (public.is_family_parent(family_id)) with check (public.is_family_parent(family_id));
create policy events_delete_parent on public.events
	for delete to authenticated using (public.is_family_parent(family_id));

-- swap_requests (status changes are the only expected update)
create policy swaps_select_parent on public.swap_requests
	for select to authenticated using (public.is_family_parent(family_id));
create policy swaps_insert_parent on public.swap_requests
	for insert to authenticated
	with check (
		public.is_family_parent(family_id)
		and requested_by in (select public.current_member_ids())
		and status = 'pending'
	);
create policy swaps_update_parent on public.swap_requests
	for update to authenticated
	using (public.is_family_parent(family_id)) with check (public.is_family_parent(family_id));

-- threads
create policy threads_select_parent on public.threads
	for select to authenticated using (public.is_family_parent(family_id));
create policy threads_insert_parent on public.threads
	for insert to authenticated
	with check (
		public.is_family_parent(family_id)
		and (created_by is null or created_by in (select public.current_member_ids()))
	);

-- messages (no delete policy; update limited to first_read_at by trigger)
create policy messages_select_parent on public.messages
	for select to authenticated using (public.is_family_parent(family_id));
create policy messages_insert_parent on public.messages
	for insert to authenticated
	with check (
		public.is_family_parent(family_id)
		and sender_id in (select public.current_member_ids())
	);
create policy messages_mark_read on public.messages
	for update to authenticated
	using (
		public.is_family_parent(family_id)
		and sender_id not in (select public.current_member_ids())
	)
	with check (public.is_family_parent(family_id));

-- expenses
create policy expenses_select_parent on public.expenses
	for select to authenticated using (public.is_family_parent(family_id));
create policy expenses_insert_parent on public.expenses
	for insert to authenticated
	with check (
		public.is_family_parent(family_id)
		and exists (select 1 from public.members m where m.id = paid_by and m.family_id = expenses.family_id)
	);
create policy expenses_update_parent on public.expenses
	for update to authenticated
	using (public.is_family_parent(family_id)) with check (public.is_family_parent(family_id));

-- documents
create policy documents_select_parent on public.documents
	for select to authenticated using (public.is_family_parent(family_id));
create policy documents_insert_parent on public.documents
	for insert to authenticated with check (public.is_family_parent(family_id));
create policy documents_update_parent on public.documents
	for update to authenticated
	using (public.is_family_parent(family_id)) with check (public.is_family_parent(family_id));

-- audit_log: read-only for parents; written by the server (service role)
create policy audit_select_parent on public.audit_log
	for select to authenticated using (public.is_family_parent(family_id));

-- subscriptions: own row only; written by the Stripe webhook (service role)
create policy subscriptions_select_own on public.subscriptions
	for select to authenticated using (user_id = auth.uid());

-- ===========================================================================
-- Kids' space
-- ===========================================================================
-- pet_state / mood_checkins / kid_chat_raw: ONLY the child. No parent policy.
create policy pet_state_select_child on public.pet_state
	for select to authenticated using (child_id = public.current_child_id());
create policy pet_state_insert_child on public.pet_state
	for insert to authenticated with check (child_id = public.current_child_id());
create policy pet_state_update_child on public.pet_state
	for update to authenticated
	using (child_id = public.current_child_id()) with check (child_id = public.current_child_id());

create policy mood_select_child on public.mood_checkins
	for select to authenticated using (child_id = public.current_child_id());
create policy mood_insert_child on public.mood_checkins
	for insert to authenticated with check (child_id = public.current_child_id());

create policy kid_chat_select_child on public.kid_chat_raw
	for select to authenticated using (child_id = public.current_child_id());
create policy kid_chat_insert_child on public.kid_chat_raw
	for insert to authenticated with check (child_id = public.current_child_id());

-- wish_cards: child owns them; parents see ONLY shared ones
create policy wish_select_child on public.wish_cards
	for select to authenticated using (child_id = public.current_child_id());
create policy wish_insert_child on public.wish_cards
	for insert to authenticated with check (child_id = public.current_child_id());
create policy wish_update_child on public.wish_cards
	for update to authenticated
	using (child_id = public.current_child_id()) with check (child_id = public.current_child_id());
create policy wish_select_parent_shared on public.wish_cards
	for select to authenticated
	using (shared_with_parents = true and public.is_family_parent(family_id));

-- weekly_insights / safety_alerts: parents read (identical for both);
-- inserts only by the server (service role).
create policy insights_select_parent on public.weekly_insights
	for select to authenticated using (public.is_family_parent(family_id));

create policy alerts_select_parent on public.safety_alerts
	for select to authenticated using (public.is_family_parent(family_id));
create policy alerts_resolve_parent on public.safety_alerts
	for update to authenticated
	using (public.is_family_parent(family_id)) with check (public.is_family_parent(family_id));

-- outings: private to the parent who logged them (README Analytics: never
-- compare parents). See docs/ARCHITECTURE_NOTES.md.
create policy outings_select_own on public.outings
	for select to authenticated
	using (public.is_family_parent(family_id) and parent_member_id in (select public.current_member_ids()));
create policy outings_insert_own on public.outings
	for insert to authenticated
	with check (public.is_family_parent(family_id) and parent_member_id in (select public.current_member_ids()));
create policy outings_update_own on public.outings
	for update to authenticated
	using (parent_member_id in (select public.current_member_ids()))
	with check (public.is_family_parent(family_id) and parent_member_id in (select public.current_member_ids()));

-- ===========================================================================
-- Family flow RPCs (security definer: multi-table writes RLS can't express)
-- ===========================================================================

-- Memberships of the signed-in user, used by hooks.server.ts (locals.member).
create or replace function public.my_memberships()
returns table (
	member_id uuid,
	family_id uuid,
	family_name text,
	family_code text,
	role public.member_role,
	display_name text,
	home text,
	child_id uuid,
	child_status public.child_status
)
language sql stable security definer
set search_path = public
as $$
	select m.id, f.id, f.name,
		case when m.role = 'parent' then f.family_code end,
		m.role, m.display_name, m.home, c.id, c.status
	from public.members m
	join public.families f on f.id = m.family_id
	left join public.children c on c.member_id = m.id
	where m.user_id = auth.uid()
	order by m.created_at;
$$;

create or replace function public.generate_family_code()
returns text
language plpgsql volatile
set search_path = public
as $$
declare
	words text[] := array['TURTLE', 'SHELL', 'OCEAN', 'PEBBLE', 'CORAL', 'WAVE', 'REEF', 'TIDE', 'LAGOON', 'KELP'];
	v_code text;
begin
	loop
		v_code := words[1 + floor(random() * array_length(words, 1))::int]
			|| '-' || lpad(floor(random() * 10000)::int::text, 4, '0');
		exit when not exists (select 1 from public.families where family_code = v_code);
	end loop;
	return v_code;
end;
$$;

-- First parent creates the family. Returns the new ids.
create or replace function public.create_family(p_family_name text, p_display_name text)
returns table (family_id uuid, member_id uuid, family_code text)
language plpgsql security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_family uuid;
	v_member uuid;
	v_code text;
begin
	if v_uid is null then
		raise exception 'not signed in' using errcode = '28000';
	end if;
	if exists (select 1 from public.members m where m.user_id = v_uid) then
		raise exception 'you already belong to a family' using errcode = 'P0001';
	end if;
	v_code := public.generate_family_code();
	insert into public.families (name, family_code)
		values (trim(p_family_name), v_code) returning id into v_family;
	insert into public.members (family_id, user_id, role, display_name, home)
		values (v_family, v_uid, 'parent', trim(p_display_name), 'A') returning id into v_member;
	return query select v_family, v_member, v_code;
end;
$$;

-- Public info for the invite landing page (no secrets, no member list).
create or replace function public.invite_preview(p_token text)
returns table (family_name text, invited_email text, inviter_name text, expired boolean, accepted boolean)
language sql stable security definer
set search_path = public
as $$
	select f.name, i.email, m.display_name, i.expires_at < now(), i.accepted_at is not null
	from public.invites i
	join public.families f on f.id = i.family_id
	left join public.members m on m.id = i.invited_by
	where i.token = p_token;
$$;

-- Signed-in user accepts an invite. Email must match the invite.
create or replace function public.accept_invite(p_token text, p_display_name text)
returns table (family_id uuid, member_id uuid)
language plpgsql security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_email text;
	v_inv public.invites%rowtype;
	v_member uuid;
	v_home text;
begin
	if v_uid is null then
		raise exception 'not signed in' using errcode = '28000';
	end if;
	select * into v_inv from public.invites where token = p_token for update;
	if not found then
		raise exception 'invite not found' using errcode = 'P0002';
	end if;
	if v_inv.accepted_at is not null then
		raise exception 'invite already used' using errcode = 'P0001';
	end if;
	if v_inv.expires_at < now() then
		raise exception 'invite expired' using errcode = 'P0001';
	end if;
	select lower(u.email) into v_email from auth.users u where u.id = v_uid;
	if v_email is distinct from lower(v_inv.email) then
		raise exception 'this invite was sent to a different email address' using errcode = '42501';
	end if;
	if exists (select 1 from public.members m where m.user_id = v_uid) then
		raise exception 'you already belong to a family' using errcode = 'P0001';
	end if;
	-- Second parent gets home 'B' if 'A' is taken.
	if v_inv.role = 'parent' then
		v_home := case when exists (
			select 1 from public.members m where m.family_id = v_inv.family_id and m.home = 'A'
		) then 'B' else 'A' end;
	end if;
	insert into public.members (family_id, user_id, role, display_name, home)
		values (v_inv.family_id, v_uid, v_inv.role, trim(p_display_name), v_home)
		returning id into v_member;
	update public.invites set accepted_at = now(), accepted_by = v_member where id = v_inv.id;
	return query select v_inv.family_id, v_member;
end;
$$;

revoke execute on function public.my_memberships() from public, anon;
revoke execute on function public.generate_family_code() from public, anon, authenticated;
revoke execute on function public.create_family(text, text) from public, anon;
revoke execute on function public.invite_preview(text) from public, anon;
revoke execute on function public.accept_invite(text, text) from public, anon;
grant execute on function public.my_memberships() to authenticated, service_role;
grant execute on function public.generate_family_code() to service_role;
grant execute on function public.create_family(text, text) to authenticated, service_role;
grant execute on function public.invite_preview(text) to authenticated, service_role;
grant execute on function public.accept_invite(text, text) to authenticated, service_role;
-- Trigger functions must not be callable as RPCs.
revoke execute on function public.set_family_id_from_child() from public, anon, authenticated;
revoke execute on function public.activate_child_if_consented() from public, anon, authenticated;
revoke execute on function public.members_guard_update() from public, anon, authenticated;
