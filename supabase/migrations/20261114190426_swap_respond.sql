-- swap_respond (Member 1, feat/swaps)
-- Swap requests are answered ONLY through these functions:
--   respond_to_swap(id, 'accept' | 'decline', tz) and counter_swap(...)
-- The generic update policy is removed, so a parent can't flip a status (or
-- accept their own request) with a plain UPDATE.
--
-- Swap semantics: the requester GIVES the night of original_date (theirs) to
-- the other parent and TAKES the night of proposed_date (the other parent's).
-- Accepting moves those custody nights atomically and writes the audit log.

drop policy if exists swaps_update_parent on public.swap_requests;

-- The signed-in user's parent member id in a family (null if not a parent there).
create or replace function public.parent_member_in_family(fid uuid)
returns uuid
language sql stable security definer
set search_path = public
as $$
	select m.id from public.members m
	where m.family_id = fid and m.user_id = auth.uid() and m.role = 'parent'
	limit 1;
$$;

-- A valid IANA zone name, else 'UTC'.
create or replace function public.safe_tz(p_tz text)
returns text
language sql stable
set search_path = public
as $$
	select case
		when p_tz is not null and exists (select 1 from pg_timezone_names where name = p_tz) then p_tz
		else 'UTC'
	end;
$$;

create or replace function public.respond_to_swap(
	p_swap_id uuid,
	p_action text,
	p_tz text default 'UTC'
)
returns public.swap_requests
language plpgsql security definer
set search_path = public
as $$
declare
	s public.swap_requests;
	v_me uuid;
	v_my_home text;
	v_their_home text;
	v_tz text := public.safe_tz(p_tz);
	v_count int;
begin
	if auth.uid() is null then
		raise exception 'Not signed in' using errcode = '28000';
	end if;
	select * into s from public.swap_requests where id = p_swap_id for update;
	if not found then
		raise exception 'Swap not found' using errcode = 'P0002';
	end if;
	v_me := public.parent_member_in_family(s.family_id);
	if v_me is null then
		raise exception 'Not allowed' using errcode = '42501';
	end if;
	if s.requested_by = v_me then
		raise exception 'You can''t answer your own swap request' using errcode = '42501';
	end if;
	if s.status <> 'pending' then
		raise exception 'Swap already handled' using errcode = 'P0001';
	end if;

	if p_action = 'accept' then
		select home into v_my_home from public.members where id = v_me;
		select home into v_their_home from public.members where id = s.requested_by;
		if v_my_home is null or v_their_home is null or v_my_home = v_their_home then
			raise exception 'Both parents need their own home (A/B) to swap nights' using errcode = 'P0001';
		end if;

		-- The requester's night goes to me.
		update public.events set home = v_my_home
		where family_id = s.family_id and kind = 'custody' and home = v_their_home
			and (starts_at at time zone v_tz)::date = s.original_date;
		get diagnostics v_count = row_count;
		if v_count = 0 then
			raise exception 'The night of % is no longer with the requester', s.original_date using errcode = 'P0001';
		end if;

		-- My night goes to the requester.
		if s.proposed_date is not null then
			update public.events set home = v_their_home
			where family_id = s.family_id and kind = 'custody' and home = v_my_home
				and (starts_at at time zone v_tz)::date = s.proposed_date;
			get diagnostics v_count = row_count;
			if v_count = 0 then
				raise exception 'The night of % is no longer with you', s.proposed_date using errcode = 'P0001';
			end if;
		end if;

		update public.swap_requests
		set status = 'accepted', responded_by = v_me, responded_at = now()
		where id = s.id
		returning * into s;
	elsif p_action = 'decline' then
		update public.swap_requests
		set status = 'declined', responded_by = v_me, responded_at = now()
		where id = s.id
		returning * into s;
	else
		raise exception 'Unknown action %', p_action using errcode = '22023';
	end if;

	insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id)
	values (s.family_id, v_me, 'swap.' || s.status, 'swap_requests', s.id);
	return s;
end;
$$;

-- Counter-offer: marks the original as 'countered' and creates a new pending
-- request from the responder, linked via counter_of. Atomic.
create or replace function public.counter_swap(
	p_swap_id uuid,
	p_original_date date,
	p_proposed_date date default null,
	p_note text default null
)
returns public.swap_requests
language plpgsql security definer
set search_path = public
as $$
declare
	s public.swap_requests;
	v_new public.swap_requests;
	v_me uuid;
begin
	if auth.uid() is null then
		raise exception 'Not signed in' using errcode = '28000';
	end if;
	if p_original_date is null then
		raise exception 'Choose the night you would give' using errcode = '22023';
	end if;
	if p_proposed_date is not null and p_proposed_date = p_original_date then
		raise exception 'Choose two different nights' using errcode = '22023';
	end if;
	if p_note is not null and char_length(p_note) > 280 then
		raise exception 'Note is too long' using errcode = '22023';
	end if;

	select * into s from public.swap_requests where id = p_swap_id for update;
	if not found then
		raise exception 'Swap not found' using errcode = 'P0002';
	end if;
	v_me := public.parent_member_in_family(s.family_id);
	if v_me is null then
		raise exception 'Not allowed' using errcode = '42501';
	end if;
	if s.requested_by = v_me then
		raise exception 'You can''t counter your own swap request' using errcode = '42501';
	end if;
	if s.status <> 'pending' then
		raise exception 'Swap already handled' using errcode = 'P0001';
	end if;

	update public.swap_requests
	set status = 'countered', responded_by = v_me, responded_at = now()
	where id = s.id;

	insert into public.swap_requests (family_id, child_id, requested_by, original_date, proposed_date, note, status, counter_of)
	values (s.family_id, s.child_id, v_me, p_original_date, p_proposed_date, nullif(trim(p_note), ''), 'pending', s.id)
	returning * into v_new;

	insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id, meta)
	values (s.family_id, v_me, 'swap.countered', 'swap_requests', v_new.id, jsonb_build_object('counter_of', s.id));
	return v_new;
end;
$$;

revoke execute on function public.parent_member_in_family(uuid) from public, anon;
revoke execute on function public.respond_to_swap(uuid, text, text) from public, anon;
revoke execute on function public.counter_swap(uuid, date, date, text) from public, anon;
grant execute on function public.parent_member_in_family(uuid) to authenticated, service_role;
grant execute on function public.respond_to_swap(uuid, text, text) to authenticated, service_role;
grant execute on function public.counter_swap(uuid, date, date, text) to authenticated, service_role;
grant execute on function public.safe_tz(text) to authenticated, service_role;
