-- 0003_kids.sql
-- Kids' space + analytics source tables.
-- Privacy (enforced by RLS in 0004): parents NEVER read pet_state,
-- mood_checkins or kid_chat_raw. They read weekly_insights, safety_alerts and
-- only the wish_cards the child chose to share.

-- ---------------------------------------------------------------------------
-- Trigger helper: copy family_id from the child row so it can't be spoofed
-- and so Realtime can filter by family_id.
-- ---------------------------------------------------------------------------
create or replace function public.set_family_id_from_child()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	select c.family_id into new.family_id from public.children c where c.id = new.child_id;
	if new.family_id is null then
		raise exception 'unknown child %', new.child_id using errcode = '23503';
	end if;
	return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- pet_state: Pebble's look and shown mood (one row per child)
-- ---------------------------------------------------------------------------
create table public.pet_state (
	child_id uuid primary key references public.children (id) on delete cascade,
	name text not null default 'Pebble' check (char_length(name) between 1 and 30),
	colors jsonb not null default '{"shell":"#5BA88F","skin":"#A8D5BA"}'::jsonb,
	shell_patterns jsonb not null default '[]'::jsonb,
	mood_shown text not null default 'happy' check (mood_shown in ('happy', 'sleepy', 'calm', 'curious', 'tucked_in')),
	updated_at timestamptz not null default now(),
	created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- mood_checkins (child only)
-- ---------------------------------------------------------------------------
create table public.mood_checkins (
	id uuid primary key default gen_random_uuid(),
	child_id uuid not null references public.children (id) on delete cascade,
	mood text not null check (
		mood in ('happy', 'excited', 'calm', 'okay', 'tired', 'sad', 'worried', 'angry')
	),
	energy smallint check (energy between 1 and 5),
	created_at timestamptz not null default now()
);
create index mood_checkins_child_id_idx on public.mood_checkins (child_id, created_at desc);

-- ---------------------------------------------------------------------------
-- wish_cards (child owns; parents see only shared ones)
-- ---------------------------------------------------------------------------
create table public.wish_cards (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid not null references public.children (id) on delete cascade,
	prompt text, -- the fun question shown, e.g. "If you could go anywhere this weekend..."
	interest text not null check (char_length(interest) between 1 and 200),
	shared_with_parents boolean not null default false,
	shared_at timestamptz,
	created_at timestamptz not null default now()
);
create index wish_cards_family_id_idx on public.wish_cards (family_id);
create index wish_cards_child_id_idx on public.wish_cards (child_id);
create trigger wish_cards_set_family
	before insert or update of child_id on public.wish_cards
	for each row execute function public.set_family_id_from_child();

-- ---------------------------------------------------------------------------
-- kid_chat_raw (child only; parents NEVER; deleted after 30 days, see 0006)
-- ---------------------------------------------------------------------------
create table public.kid_chat_raw (
	id uuid primary key default gen_random_uuid(),
	child_id uuid not null references public.children (id) on delete cascade,
	role text not null default 'child' check (role in ('child', 'pebble')),
	text text not null check (char_length(text) <= 2000),
	created_at timestamptz not null default now()
);
create index kid_chat_raw_child_id_idx on public.kid_chat_raw (child_id, created_at desc);
create index kid_chat_raw_created_at_idx on public.kid_chat_raw (created_at);

-- ---------------------------------------------------------------------------
-- weekly_insights (built by the server; identical for both parents)
-- ---------------------------------------------------------------------------
create table public.weekly_insights (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid not null references public.children (id) on delete cascade,
	week_start date not null,
	mood_trend text not null, -- e.g. 'mostly_calm', 'a_bit_tired', 'mixed'
	interests text[] not null default '{}',
	summary text, -- one gentle sentence, never the child's words
	gentle_flag boolean not null default false,
	created_at timestamptz not null default now(),
	unique (child_id, week_start)
);
create index weekly_insights_family_id_idx on public.weekly_insights (family_id);
create index weekly_insights_child_id_idx on public.weekly_insights (child_id);
create trigger weekly_insights_set_family
	before insert or update of child_id on public.weekly_insights
	for each row execute function public.set_family_id_from_child();

-- ---------------------------------------------------------------------------
-- safety_alerts (no child words stored here, only level + category)
-- ---------------------------------------------------------------------------
create table public.safety_alerts (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid not null references public.children (id) on delete cascade,
	level text not null check (level in ('flag', 'crisis')),
	category text, -- e.g. 'self_harm', 'abuse', 'danger', 'distress'
	resolved_at timestamptz,
	resolved_by uuid references public.members (id) on delete set null,
	created_at timestamptz not null default now()
);
create index safety_alerts_family_id_idx on public.safety_alerts (family_id);
create index safety_alerts_child_id_idx on public.safety_alerts (child_id);
create trigger safety_alerts_set_family
	before insert or update of child_id on public.safety_alerts
	for each row execute function public.set_family_id_from_child();

-- ---------------------------------------------------------------------------
-- outings: source for the private "My time with <child>" card
-- ---------------------------------------------------------------------------
create table public.outings (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid not null references public.children (id) on delete cascade,
	parent_member_id uuid not null references public.members (id) on delete cascade,
	event_id uuid references public.events (id) on delete set null,
	title text not null check (char_length(title) between 1 and 200),
	child_rating smallint check (child_rating between 1 and 5),
	happened_on date not null,
	created_at timestamptz not null default now()
);
create index outings_family_id_idx on public.outings (family_id);
create index outings_child_id_idx on public.outings (child_id);
create index outings_parent_member_id_idx on public.outings (parent_member_id);
