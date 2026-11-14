-- 0002_parent.sql
-- Parent workspace: custody schedules, calendar, swaps, messaging, expenses,
-- documents, audit log and subscriptions. Money is always integer cents.

-- ---------------------------------------------------------------------------
-- custody_schedules
-- ---------------------------------------------------------------------------
create table public.custody_schedules (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid references public.children (id) on delete cascade,
	template text not null check (
		template in ('2-2-3', 'week_on_week_off', 'alternate_weekends', 'custom')
	),
	start_date date not null,
	exchange_time time,
	-- Holiday rules, starting home, exceptions, etc.
	rules jsonb not null default '{}'::jsonb,
	created_by uuid references public.members (id) on delete set null,
	created_at timestamptz not null default now()
);
create index custody_schedules_family_id_idx on public.custody_schedules (family_id);
create index custody_schedules_child_id_idx on public.custody_schedules (child_id);

-- ---------------------------------------------------------------------------
-- events: calendar entries ("which home tonight" + activities)
-- ---------------------------------------------------------------------------
create table public.events (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid references public.children (id) on delete cascade,
	title text not null check (char_length(title) between 1 and 200),
	starts_at timestamptz not null,
	ends_at timestamptz not null,
	home text check (home in ('A', 'B')),
	source text not null default 'manual' check (source in ('manual', 'plan_pdf', 'planner')),
	created_by uuid references public.members (id) on delete set null,
	created_at timestamptz not null default now(),
	check (ends_at >= starts_at)
);
create index events_family_id_idx on public.events (family_id);
create index events_child_id_idx on public.events (child_id);
create index events_family_starts_idx on public.events (family_id, starts_at);

-- ---------------------------------------------------------------------------
-- swap_requests
-- ---------------------------------------------------------------------------
create table public.swap_requests (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid references public.children (id) on delete cascade,
	requested_by uuid not null references public.members (id),
	original_date date not null,
	proposed_date date,
	note text check (char_length(note) <= 1000),
	status text not null default 'pending' check (
		status in ('pending', 'accepted', 'declined', 'countered', 'cancelled')
	),
	-- When status = 'countered', the counter-proposal row points back here.
	counter_of uuid references public.swap_requests (id) on delete set null,
	responded_by uuid references public.members (id),
	responded_at timestamptz,
	created_at timestamptz not null default now()
);
create index swap_requests_family_id_idx on public.swap_requests (family_id);
create index swap_requests_child_id_idx on public.swap_requests (child_id);

-- ---------------------------------------------------------------------------
-- threads + messages (messages are immutable, see 0005_immutability.sql)
-- ---------------------------------------------------------------------------
create table public.threads (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	topic text not null check (char_length(topic) between 1 and 120),
	created_by uuid references public.members (id) on delete set null,
	created_at timestamptz not null default now()
);
create index threads_family_id_idx on public.threads (family_id);

create table public.messages (
	id uuid primary key default gen_random_uuid(),
	-- Denormalised from threads (filled by trigger) so Realtime can filter by family.
	family_id uuid not null references public.families (id),
	-- No cascade: a thread with messages can never be deleted (court records).
	thread_id uuid not null references public.threads (id),
	sender_id uuid not null references public.members (id),
	body text not null check (char_length(body) between 1 and 8000),
	original_body text, -- the draft before AI rewrite (sender's own record)
	ai_rewritten boolean not null default false,
	created_at timestamptz not null default now(),
	first_read_at timestamptz,
	prev_hash text,
	hash text not null default ''
);
create index messages_family_id_idx on public.messages (family_id);
create index messages_thread_id_idx on public.messages (thread_id, created_at);
create index messages_sender_id_idx on public.messages (sender_id);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table public.expenses (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	child_id uuid references public.children (id) on delete set null,
	paid_by uuid not null references public.members (id),
	amount_cents integer not null check (amount_cents > 0),
	currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
	category text not null check (
		category in ('childcare', 'education', 'medical', 'activities', 'clothing', 'food', 'travel', 'other')
	),
	description text check (char_length(description) <= 500),
	spent_on date not null default current_date,
	receipt_path text, -- Supabase Storage path (private bucket)
	-- e.g. {"mode":"percent","shares":{"<member_id>":50,"<member_id>":50}}
	split jsonb not null default '{"mode":"equal"}'::jsonb,
	status text not null default 'pending' check (status in ('pending', 'approved', 'disputed', 'settled')),
	created_at timestamptz not null default now()
);
create index expenses_family_id_idx on public.expenses (family_id);
create index expenses_child_id_idx on public.expenses (child_id);
create index expenses_family_spent_idx on public.expenses (family_id, spent_on);

-- ---------------------------------------------------------------------------
-- documents (files live in Supabase Storage; this is the index)
-- ---------------------------------------------------------------------------
create table public.documents (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id) on delete cascade,
	kind text not null check (kind in ('parenting_plan', 'medical', 'school', 'legal', 'receipt', 'other')),
	title text not null check (char_length(title) between 1 and 200),
	storage_path text not null,
	mime text,
	extracted jsonb, -- AI extraction result (e.g. PlanExtraction)
	uploaded_by uuid references public.members (id) on delete set null,
	created_at timestamptz not null default now()
);
create index documents_family_id_idx on public.documents (family_id);

-- ---------------------------------------------------------------------------
-- audit_log (append-only, see 0005_immutability.sql). Written by the server.
-- ---------------------------------------------------------------------------
create table public.audit_log (
	id uuid primary key default gen_random_uuid(),
	family_id uuid not null references public.families (id),
	actor_member_id uuid references public.members (id),
	action text not null,
	entity text not null,
	entity_id uuid,
	meta jsonb not null default '{}'::jsonb,
	at timestamptz not null default now(),
	created_at timestamptz not null default now()
);
create index audit_log_family_id_idx on public.audit_log (family_id, at desc);

-- ---------------------------------------------------------------------------
-- subscriptions (Stripe; written only by the webhook via service role)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null unique references auth.users (id) on delete cascade,
	family_id uuid references public.families (id) on delete set null,
	stripe_customer_id text unique,
	stripe_subscription_id text unique,
	plan text,
	status text not null default 'inactive',
	current_period_end timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index subscriptions_family_id_idx on public.subscriptions (family_id);
