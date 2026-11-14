-- 0001_core.sql
-- Families, members, children, consents, invites and kid login rate limiting.
-- Every table gets RLS in 0004_rls.sql (deny by default).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('parent', 'child', 'bonus', 'professional');
create type public.child_mode as enum ('pet', 'teen');
create type public.child_status as enum ('pending_consent', 'active', 'disabled');

-- ---------------------------------------------------------------------------
-- families
-- ---------------------------------------------------------------------------
create table public.families (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(name) between 1 and 80),
	-- Human-friendly code children type on the kid login screen, e.g. TURTLE-4821.
	family_code text not null unique check (family_code ~ '^[A-Z]{3,10}-[0-9]{4}$'),
	created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- members: one row per person per family. user_id is null for pending people.
-- ---------------------------------------------------------------------------
create table public.members (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	user_id uuid references auth.users (id) on delete set null,
	role public.member_role not null,
	display_name text not null check (char_length(display_name) between 1 and 60),
	-- Which home this parent represents on the custody calendar ('A' or 'B').
	home text check (home in ('A', 'B')),
	created_at timestamptz not null default now(),
	unique (family_id, user_id)
);
create index members_family_id_idx on public.members (family_id);
create index members_user_id_idx on public.members (user_id);

-- ---------------------------------------------------------------------------
-- children: the child profile. The child's login is a hidden auth user linked
-- through members.user_id (see src/lib/server/kidAuth.ts).
-- ---------------------------------------------------------------------------
create table public.children (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	member_id uuid not null unique references public.members (id) on delete cascade,
	first_name text not null check (char_length(first_name) between 1 and 40),
	birth_year integer not null check (birth_year between 2000 and 2100),
	mode public.child_mode not null default 'pet',
	pin_hash text, -- bcrypt hash only; the PIN itself is never stored
	status public.child_status not null default 'pending_consent',
	created_at timestamptz not null default now()
);
create index children_family_id_idx on public.children (family_id);

-- ---------------------------------------------------------------------------
-- consents: a child account needs a consent row from every parent (min. 2).
-- ---------------------------------------------------------------------------
create table public.consents (
	id uuid primary key default gen_random_uuid(),
	child_id uuid not null references public.children (id) on delete cascade,
	parent_member_id uuid not null references public.members (id) on delete cascade,
	consented_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	unique (child_id, parent_member_id)
);
create index consents_child_id_idx on public.consents (child_id);
create index consents_parent_member_id_idx on public.consents (parent_member_id);

-- ---------------------------------------------------------------------------
-- invites: co-parent (and later bonus/professional) invitations.
-- ---------------------------------------------------------------------------
create table public.invites (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	email text not null check (position('@' in email) > 1),
	token text not null unique check (char_length(token) >= 32),
	role public.member_role not null default 'parent' check (role <> 'child'),
	invited_by uuid references public.members (id) on delete set null,
	expires_at timestamptz not null default (now() + interval '7 days'),
	accepted_at timestamptz,
	accepted_by uuid references public.members (id) on delete set null,
	created_at timestamptz not null default now()
);
create index invites_family_id_idx on public.invites (family_id);

-- ---------------------------------------------------------------------------
-- kid_login_attempts: rate limiting for the PIN login (service role only).
-- No IP or PIN is stored (data minimisation).
-- ---------------------------------------------------------------------------
create table public.kid_login_attempts (
	id uuid primary key default gen_random_uuid(),
	family_code text not null,
	success boolean not null default false,
	created_at timestamptz not null default now()
);
create index kid_login_attempts_code_time_idx on public.kid_login_attempts (family_code, created_at desc);
