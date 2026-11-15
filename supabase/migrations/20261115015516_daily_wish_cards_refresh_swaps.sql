-- Daily wish cards, card refresh after parent edits, planner → swap requests.
-- (owner: Member 2; touches events/swap_requests via triggers only)

-- ===========================================================================
-- 1. Daily questions (replaces the weekly wish_decks)
-- ===========================================================================
create table public.wish_questions (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid not null references public.children (id) on delete cascade,
	day date not null,
	slot smallint not null check (slot between 0 and 3),
	kind text not null check (kind in ('everyday', 'interest', 'activity', 'gift')),
	prompt text not null check (char_length(prompt) between 1 and 120),
	max_picks smallint not null default 3 check (max_picks between 1 and 6),
	options jsonb not null,
	source text not null check (source in ('ai', 'fallback')),
	created_at timestamptz not null default now(),
	unique (child_id, day, slot)
);
create index wish_questions_child_day_idx on public.wish_questions (child_id, day desc);
create trigger wish_questions_set_family
	before insert or update of child_id on public.wish_questions
	for each row execute function public.set_family_id_from_child();
alter table public.wish_questions enable row level security;
create policy wish_questions_select_child on public.wish_questions
	for select to authenticated using (child_id = public.current_child_id());
-- Writes: service role only (the server generates and refreshes questions).

drop table public.wish_decks;

alter table public.wish_cards
	add column question_id uuid references public.wish_questions (id) on delete set null,
	add column day date;
create index wish_cards_question_idx on public.wish_cards (question_id);
alter table public.wish_cards drop constraint wish_cards_card_kind_check;
alter table public.wish_cards add constraint wish_cards_card_kind_check
	check (card_kind in ('everyday', 'interest', 'activity', 'gift'));

-- ===========================================================================
-- 2. Refresh today's unanswered cards after profile / weekend calendar edits
-- ===========================================================================
-- requested_at: last relevant parent edit. handled_at: last regeneration.
-- The kid's next page load regenerates once (edits in a burst coalesce).
create table public.wish_refresh (
	child_id uuid primary key references public.children (id) on delete cascade,
	family_id uuid not null references public.families (id) on delete cascade,
	requested_at timestamptz not null default now(),
	handled_at timestamptz
);
alter table public.wish_refresh enable row level security; -- service role only

create or replace function public.request_wish_refresh_for_family(fid uuid)
returns void
language sql
security definer
set search_path = public
as $$
	insert into public.wish_refresh (child_id, family_id, requested_at)
	select c.id, c.family_id, now() from public.children c where c.family_id = fid
	on conflict (child_id) do update set requested_at = excluded.requested_at;
$$;
revoke execute on function public.request_wish_refresh_for_family(uuid) from public, anon, authenticated;

create or replace function public.events_request_wish_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	r record;
begin
	if tg_op = 'DELETE' then r := old; else r := new; end if;
	-- Only what can change the coming days' cards (custody + plans in the next ~8 days).
	if r.starts_at < now() + interval '8 days' and r.ends_at > now() - interval '1 day' then
		perform public.request_wish_refresh_for_family(r.family_id);
	end if;
	return null;
end;
$$;
create trigger events_wish_refresh
	after insert or update or delete on public.events
	for each row execute function public.events_request_wish_refresh();

create or replace function public.profiles_request_wish_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.wish_refresh (child_id, family_id, requested_at)
	values (new.child_id, new.family_id, now())
	on conflict (child_id) do update set requested_at = excluded.requested_at;
	return null;
end;
$$;
create trigger child_profiles_wish_refresh
	after insert or update on public.child_profiles
	for each row execute function public.profiles_request_wish_refresh();

-- ===========================================================================
-- 3. Planner activity on the other parent's day → swap request
-- ===========================================================================
alter table public.events
	add column pending_swap_id uuid references public.swap_requests (id) on delete set null;
create index events_pending_swap_idx on public.events (pending_swap_id);

-- Declined swaps: the activity goes back to the planner as an idea (per parent).
create table public.planner_ideas (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	member_id uuid not null references public.members (id) on delete cascade,
	title text not null check (char_length(title) between 1 and 200),
	place text check (char_length(place) <= 200),
	starts_at timestamptz not null,
	ends_at timestamptz not null,
	created_at timestamptz not null default now()
);
create index planner_ideas_member_idx on public.planner_ideas (member_id);
alter table public.planner_ideas enable row level security;
create policy planner_ideas_select_own on public.planner_ideas
	for select to authenticated using (member_id in (select public.current_member_ids()));
create policy planner_ideas_delete_own on public.planner_ideas
	for delete to authenticated using (member_id in (select public.current_member_ids()));

create or replace function public.swap_requests_sync_planned_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	-- A counter-offer carries the planned activity over to the new request.
	if tg_op = 'INSERT' then
		if new.counter_of is not null then
			update public.events set pending_swap_id = new.id where pending_swap_id = new.counter_of;
		end if;
		return null;
	end if;
	if new.status is not distinct from old.status then
		return null;
	end if;
	if new.status = 'accepted' then
		-- Custody already moved (respond_to_swap): the activity becomes a normal event.
		update public.events set pending_swap_id = null where pending_swap_id = new.id;
	elsif new.status in ('declined', 'cancelled') then
		insert into public.planner_ideas (family_id, member_id, title, place, starts_at, ends_at)
		select e.family_id, e.created_by, e.title, e.place, e.starts_at, e.ends_at
		from public.events e
		where e.pending_swap_id = new.id and e.created_by is not null;
		delete from public.events where pending_swap_id = new.id;
	end if;
	return null;
end;
$$;
create trigger swap_requests_sync_planned_events
	after insert or update on public.swap_requests
	for each row execute function public.swap_requests_sync_planned_events();
