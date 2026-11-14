# TeamKid (working name)

> **Two homes. One team. One kid.**
> A co-parenting web app for separated parents, with an AI assistant and a child-safe AI pet that gives the child a voice in family planning.

Built for **Business Cup 2.0** (24-hour build). Audience: US parents aged 25–45. B2C, web only.

**Stack in one line:** SvelteKit (frontend + backend) on Vercel, Supabase (Postgres, Auth, Storage, Realtime), an LLM API, and Stripe.

---

## Table of contents

1. [What it is](#what-it-is)
2. [Key features](#key-features)
3. [Architecture](#architecture)
4. [Tech stack](#tech-stack)
5. [Repository structure](#repository-structure)
6. [Data model](#data-model)
7. [Server endpoints](#server-endpoints)
8. [Analytics](#analytics)
9. [Child safety and privacy rules](#child-safety-and-privacy-rules)
10. [Getting started (local)](#getting-started-local)
11. [Environment variables](#environment-variables)
12. [Deployment](#deployment)
13. [MVP scope (24 hours)](#mvp-scope-24-hours)
14. [Demo script](#demo-script)
15. [Team split](#team-split)
16. [Roadmap](#roadmap)

---

## What it is

TeamKid has three parts:

| Part | Who uses it | What it does |
| --- | --- | --- |
| **Parent workspace** | Both parents | Custody calendar, swap requests, documented messaging, shared expenses, document vault, court-ready records |
| **AI assistant** | Each parent, privately | Rewrites heated messages calmly, reads the parenting plan PDF into the calendar, plans activities, summarises threads |
| **Kids' space with Pebble the turtle** | Child (ages 6–12) | Daily mood check-in, calming "tuck in" breathing, wish cards about what they want to do, "where am I tonight?" calendar |

**Why it's different:** every co-parenting app now has AI tone-checking. None gives the child a safe, structured voice. TeamKid turns what the child chooses to share into plans both parents can act on.

**Why a turtle:** its shell is a home it carries everywhere, a symbol of continuity across two homes. It also uses the "Turtle Technique" (recognise the feeling → stop → tuck in and take 3 breaths → come out and solve), a calming method already taught in US preschools.

---

## Key features

### Parent workspace
- Custody calendar with templates (2-2-3, week on/week off, alternate weekends) and holiday rules
- Swap requests: request → accept / decline / counter, with full history
- Messaging that **cannot be edited or deleted**, with read receipts and topic threads
- Shared expenses with receipt photo, split rules (50/50, 60/40) and a "who owes whom" balance
- Document vault (parenting plan, medical, school)
- PDF export of records for lawyers or court

### AI assistant
- **Tone rewrite** before sending (BIFF: brief, informative, friendly, firm)
- **Incoming shield**: summarises hostile messages into facts and requests
- **Parenting plan reader**: upload a PDF → calendar and holidays filled automatically
- **Plan my weekend**: suggests real places based on the child's wish cards, the parent's schedule, budget and location
- **Weekly digest**: the week ahead, open requests, money owed, child highlights

### Kids' space (Pebble the turtle)
- Mood check-in with faces and colours (2–5 minutes a day)
- "Tuck in" calming exercise led by Pebble
- Wish cards: fun questions that reveal what the child wants to do
- **The child chooses** which wishes to send to parents
- Picture calendar: which home tonight, who picks me up
- Packing helper ("What should we carry in our shell to Dad's?")
- Pebble never gets sick or sad if the child doesn't play; no guilt mechanics

### Analytics
- **Shared (both parents, identical numbers):** spending by category per month, and later the child's week, overnights per home, budget vs actual and a year-end report
- **Private (one parent only):** "My time with Lily", covering outings together and the child's star ratings, plus an AI suggestion for the next activity
- Never compares parents and never scores anyone (see [Analytics](#analytics))

---

## Architecture

One SvelteKit app does both the UI and the server work. One Vercel project, one Supabase project.

```
┌───────────────────────────────────────────────────────────────┐
│                         Browser                               │
│   Svelte pages: parent workspace + kids' space (Pebble)       │
└──────────────┬───────────────────────────────┬────────────────┘
               │ supabase-js (anon key)        │ form actions / fetch /api/*
               │ CRUD + Realtime + Storage     │
               │ protected by RLS              ▼
               │              ┌──────────────────────────────────┐
               │              │  SvelteKit server (Vercel)       │
               │              │  hooks.server.ts → session       │
               │              │  src/lib/server/*  (secrets here)│
               │              │  • AI (rewrite, plan PDF, Pebble)│
               │              │  • Planner (Google Places)       │
               │              │  • Stripe checkout + webhook     │
               │              │  • Weekly insight job (cron)     │
               │              └───────┬──────────────┬───────────┘
               ▼                      ▼              ▼
     ┌──────────────────────────────────────┐  ┌───────────────────────┐
     │  Supabase                            │  │  External APIs        │
     │  Postgres + RLS · Auth · Storage     │  │  LLM (Claude / GPT)   │
     │  Realtime · pg_cron                  │  │  Stripe · Places      │
     └──────────────────────────────────────┘  │  Resend               │
                                               └───────────────────────┘
```

**Rule of thumb:**
- **Browser → Supabase directly** for simple reads and writes: calendar, messages, expenses, pet state and live updates. Row-level security (RLS) protects it.
- **Browser → SvelteKit server** for anything that needs a secret or heavy logic: AI calls, PDF reading, Stripe and the weekly insight summary.
- Secrets live **only** in `src/lib/server/` and `$env/static/private`. SvelteKit refuses to bundle these into browser code.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| App framework | **SvelteKit + TypeScript** | Frontend and backend in one project; team experience |
| Adapter | `@sveltejs/adapter-vercel` | Zero-config deploys to Vercel |
| UI | Tailwind CSS + shadcn-svelte | Polished UI quickly |
| Animation | Rive (or Lottie) | Pebble's states: idle, happy, sleepy, tuck-in |
| Database | **Supabase Postgres** | Relational data, RLS, triggers for immutable records |
| Auth | Supabase Auth via `@supabase/ssr` | Magic link for parents; PIN login for children |
| Realtime | Supabase Realtime | Live messages, swap requests, insight cards |
| Files | Supabase Storage (private buckets) | PDFs, receipts, photos |
| AI | LLM provider's TypeScript SDK | Rewrite, PDF extraction (the model reads the PDF directly), planning, Pebble replies |
| Validation | Zod | Validate requests and AI JSON output |
| Payments | Stripe Checkout + Billing (test mode for demo) | Family Plus subscription |
| Email | Resend | Invites, notifications |
| Places | Google Places API | Real venues for "Plan my weekend" |
| Scheduled jobs | Vercel Cron → `/api/cron/insights` | Weekly child insight summary |
| Hosting | **Vercel** (one project) | Push to deploy |

---

## Repository structure

```
teamkid/
├── README.md
├── package.json
├── svelte.config.js                # adapter-vercel
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json                     # cron schedule
├── .env.example
│
├── static/
│   └── pebble/                     # Rive / Lottie files for the turtle
│
├── src/
│   ├── app.html
│   ├── app.d.ts                    # Locals: supabase, session, member
│   ├── hooks.server.ts             # Supabase SSR client + session on every request
│   │
│   ├── lib/
│   │   ├── supabase.ts             # browser client
│   │   ├── types.ts                # DB types (generated by Supabase CLI)
│   │   ├── stores/                 # session, family, realtime subscriptions
│   │   ├── components/
│   │   │   ├── calendar/           # CustodyCalendar, SwapRequestCard
│   │   │   ├── messages/           # Thread, Composer (with AI rewrite)
│   │   │   ├── expenses/           # ExpenseForm, Balance
│   │   │   ├── insights/           # InsightCard (weekly child summary)
│   │   │   ├── analytics/          # SpendingChart (shared), MyTimeCard (private)
│   │   │   ├── kids/               # Pebble, MoodWheel, WishCard, TuckIn
│   │   │   └── ui/                 # shadcn-svelte components
│   │   │
│   │   └── server/                 # SERVER ONLY: never imported by the browser
│   │       ├── env.ts              # re-exports $env/static/private
│   │       ├── supabaseAdmin.ts    # service-role client (insights job, webhooks)
│   │       ├── guards.ts           # requireParent(), requireChild(), requireFamily()
│   │       ├── ai/
│   │       │   ├── llm.ts          # LLM client wrapper
│   │       │   ├── rewrite.ts
│   │       │   ├── shield.ts
│   │       │   ├── planExtract.ts  # parenting plan PDF → schedule JSON
│   │       │   ├── planner.ts
│   │       │   ├── pebble.ts       # scripted replies + guarded LLM fallback
│   │       │   ├── weeklyInsight.ts
│   │       │   ├── parentSuggestion.ts  # private "My time" suggestion
│   │       │   └── prompts/        # prompt templates (.md)
│   │       ├── safety.ts           # crisis keyword + classifier checks
│   │       ├── places.ts           # Google Places
│   │       └── stripe.ts
│   │
│   └── routes/
│       ├── +layout.svelte
│       ├── +layout.server.ts       # passes session to pages
│       ├── +page.svelte            # landing page
│       ├── login/                  # magic link
│       ├── auth/callback/+server.ts
│       ├── onboarding/             # create family, invite co-parent, add child (both consents)
│       │
│       ├── (parent)/               # +layout.server.ts guards parent role
│       │   ├── dashboard/          # week overview + insight card
│       │   ├── calendar/
│       │   ├── messages/
│       │   ├── expenses/
│       │   ├── documents/
│       │   ├── plan/               # "Plan my weekend"
│       │   └── billing/
│       │
│       ├── kid-login/              # PIN login for children
│       ├── (kid)/                  # +layout.server.ts guards child role
│       │   ├── pebble/             # home screen with the turtle
│       │   ├── checkin/
│       │   ├── wishes/
│       │   └── where-am-i/
│       │
│       └── api/                    # JSON endpoints (+server.ts)
│           ├── health/
│           ├── ai/
│           │   ├── rewrite/
│           │   ├── shield/
│           │   └── summarize-thread/
│           ├── documents/
│           │   ├── parse-plan/
│           │   └── parse-receipt/
│           ├── planner/weekend/
│           ├── pebble/reply/
│           ├── analytics/
│           │   ├── spending/
│           │   └── my-time/
│           ├── billing/
│           │   ├── checkout/
│           │   └── webhook/
│           └── cron/insights/
│
└── supabase/
    ├── config.toml
    ├── migrations/
    │   ├── 0001_core.sql           # families, members, children, consents
    │   ├── 0002_parent.sql         # schedules, events, swaps, threads, messages, expenses, documents
    │   ├── 0003_kids.sql           # pet_state, mood_checkins, wish_cards, kid_chat_raw, weekly_insights, safety_alerts
    │   ├── 0004_rls.sql            # row-level security policies
    │   ├── 0005_immutability.sql   # messages can't be edited/deleted + hash chain
    │   ├── 0006_retention.sql      # pg_cron: delete kid_chat_raw after 30 days
    │   └── 0007_analytics.sql      # outings table (if not in 0003), v_spending_by_category, v_parent_time
    └── seed.sql                    # demo family, sample plan, a week of check-ins
```

---

## Data model

### Family and roles
| Table | Key columns |
| --- | --- |
| `families` | id, name, created_at |
| `members` | id, family_id, user_id, role (`parent` / `child` / `bonus` / `professional`), display_name |
| `children` | id, family_id, member_id, first_name, birth_year, mode (`pet` / `teen`), pin_hash |
| `consents` | id, child_id, parent_member_id, consented_at (a child account needs **both** parents) |

### Parent workspace
| Table | Key columns |
| --- | --- |
| `custody_schedules` | id, family_id, template, start_date, rules (jsonb) |
| `events` | id, family_id, child_id, title, starts_at, ends_at, home (`A` / `B`), source (`manual` / `plan_pdf` / `planner`) |
| `swap_requests` | id, family_id, requested_by, original_date, proposed_date, status, responded_at |
| `threads` | id, family_id, topic |
| `messages` | id, thread_id, sender_id, body, original_body, ai_rewritten (bool), created_at, first_read_at, prev_hash, hash |
| `expenses` | id, family_id, paid_by, amount_cents, category, receipt_path, split (jsonb), status |
| `documents` | id, family_id, kind, storage_path, extracted (jsonb) |
| `audit_log` | id, family_id, actor_id, action, entity, entity_id, at |
| `subscriptions` | id, user_id, stripe_customer_id, status, current_period_end |

### Kids' space
| Table | Key columns | Parents can read? |
| --- | --- | --- |
| `pet_state` | child_id, name, colors, shell_patterns, mood_shown | No |
| `mood_checkins` | id, child_id, mood (label), energy, created_at | **No** |
| `wish_cards` | id, child_id, interest, shared_with_parents (bool), created_at | Only rows the child chose to share |
| `kid_chat_raw` | id, child_id, text, created_at (**deleted after 30 days**) | **Never** |
| `weekly_insights` | id, child_id, week_start, mood_trend, interests, gentle_flag | **Yes**, identical for both parents |
| `safety_alerts` | id, child_id, level, created_at, resolved_at | Yes (both parents) |

### Analytics
| Object | Type | Key columns | Who can read |
| --- | --- | --- | --- |
| `outings` | table | id, family_id, child_id, parent_member_id, event_id, title, child_rating (1–5), happened_on | Parents of the family (the private view filters to self) |
| `v_spending_by_category` | view | family_id, month, category, total_cents | Both parents of the family |
| `v_parent_time` | view | parent_member_id, child_id, month, outings_count, avg_rating, top_activities | **Only that parent** (`parent_member_id` in `current_member_ids()`) |

> Create views with `security_invoker = true` so the RLS rules on the underlying tables still apply.

### Database-level guarantees
```sql
-- Messages can never be edited or deleted
create or replace function raise_immutable() returns trigger as $$
begin
  raise exception 'messages are immutable';
end; $$ language plpgsql;

create trigger messages_no_update before update on messages
  for each row when (old.body is distinct from new.body) execute function raise_immutable();
create trigger messages_no_delete before delete on messages
  for each row execute function raise_immutable();

-- Parents may read weekly insights, never raw child data
create policy parents_read_insights on weekly_insights
  for select using (is_parent_in_family(auth.uid(), family_of_child(child_id)));
-- (no parent policy exists on mood_checkins or kid_chat_raw)
```

---

## Server endpoints

All endpoints live in `src/routes/api/**/+server.ts`. Each one checks the session from `hooks.server.ts` and the role via `src/lib/server/guards.ts`. Simple form submissions (create event, send message, log expense) use **form actions** in the page's `+page.server.ts` instead.

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Health check |
| POST | `/api/ai/rewrite` | parent | Rewrite a draft message in a calm, BIFF tone |
| POST | `/api/ai/shield` | parent | Summarise an incoming message into facts and requests |
| POST | `/api/ai/summarize-thread` | parent | "What did we agree about X?" |
| POST | `/api/documents/parse-plan` | parent | Parenting plan PDF → schedule template + holidays (writes `events`) |
| POST | `/api/documents/parse-receipt` | parent | Receipt photo → amount, date, category |
| POST | `/api/planner/weekend` | parent | Three activity suggestions from wish cards, schedule, budget, location |
| POST | `/api/pebble/reply` | child | Pebble's guarded reply (scripted first, LLM fallback, safety check) |
| GET | `/api/analytics/spending` | parent | Spending by category for a month range (shared) |
| GET | `/api/analytics/my-time` | parent | The signed-in parent's private outing stats + one AI suggestion |
| POST | `/api/billing/checkout` | parent | Create a Stripe Checkout session |
| POST | `/api/billing/webhook` | Stripe | Verify signature → update `subscriptions` |
| GET | `/api/cron/insights` | Vercel Cron | Build `weekly_insights` (checks `CRON_SECRET`) |

### Session in `hooks.server.ts`
```ts
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookies) =>
        cookies.forEach(({ name, value, options }) =>
          event.cookies.set(name, value, { ...options, path: '/' })
        )
    }
  });

  event.locals.getUser = async () => {
    const { data } = await event.locals.supabase.auth.getUser(); // verified with Supabase
    return data.user;
  };

  return resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
  });
};
```

### Example endpoint: `src/routes/api/ai/rewrite/+server.ts`
```ts
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireParent } from '$lib/server/guards';
import { rewriteMessage } from '$lib/server/ai/rewrite';

const Body = z.object({ draft: z.string().min(1).max(4000) });

export async function POST({ request, locals }) {
  await requireParent(locals);                       // 401/403 if not a parent
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) throw error(400, 'Invalid body');

  const rewritten = await rewriteMessage(parsed.data.draft);
  return json({ rewritten });
}
```

---

## Analytics

Analytics gives parents a reason to come back every week. In a separated family, though, any number that compares one parent with the other can become ammunition. The rule: **share facts, keep reflection private, never rank one parent against the other.**

| Feature | Who sees it | Status |
| --- | --- | --- |
| Spending by category (monthly, per category, "who owes whom") | Both parents, identical | **MVP (P2)** |
| "My time with Lily" + AI suggestion | That parent only | **MVP (P2)** |
| Child's week (school, activities, free time, from the calendar) | Both parents | After the competition |
| Overnights per home (factual, no judgement) | Both parents | After the competition |
| Budget vs actual (agreed limits per category) | Both parents | After the competition |
| Year-end report (childcare, medical, education totals for tax and child-support reviews) | Both parents | Paid tier |
| AI monthly review ("3 things that went well") | Each parent, private | Paid tier |
| Benchmarks vs similar families (anonymised, opt-in) | Each parent | Later |

**Never build:**
- comparisons of one parent's time or spending with the other's;
- parent scores or quality ratings;
- the child's mood broken down by home;
- analytics on the child's chat.

**Data honesty:** analytics only reflects what parents log (expenses, calendar, rated outings). The app never claims automatic tracking it doesn't have.

**AI suggestion rules (`suggestForParent`):** uses only that parent's outings and calendar plus the child's **shared** wish cards. It never mentions the other parent and never judges how much time someone spends.

---

## Child safety and privacy rules

These rules are part of the product. Every PR must respect them.

1. **Both parents consent** before a child account is created.
2. **Parents never see the child's words.** They see only `weekly_insights` (trends and themes) plus wishes the child chose to share.
3. **Identical feed for both parents**, with no breakdown by home.
4. **Child data is never exported** and is excluded from court reports.
5. **Pebble is a companion, not a therapist.** It doesn't claim to be human, has no romance or secrets, and nudges the child toward real people.
6. **Mostly scripted.** The LLM only fills small gaps, behind safety filters.
7. **Crisis escalation:** self-harm, abuse or danger → calm pre-written reply, trusted-adult prompt, 988 Lifeline, and a `safety_alerts` row for both parents. The abuse-disclosure protocol must be reviewed by child-protection experts before launch.
8. **No parent-vs-parent analytics:** no comparisons, scores or child mood by home.
9. **Data minimisation:** raw chat is deleted after 30 days; no children's data is used for AI training or ads; no analytics SDKs in the kids' space.
10. **COPPA:** verifiable parental consent, a written data-retention policy and a security programme are required before a real launch.

---

## Getting started (local)

### Prerequisites
- Node.js 20+ and pnpm (or npm)
- Supabase CLI and Docker (for local Supabase), or a free Supabase cloud project

### 1. Database
```bash
supabase start                 # local Postgres, Auth, Storage, Realtime
supabase db reset              # applies migrations + seed.sql
supabase gen types typescript --local > src/lib/types.ts
```

### 2. App
```bash
cp .env.example .env           # fill in keys
pnpm install
pnpm dev                       # http://localhost:5173
```

### 3. Stripe webhooks (optional, local)
```bash
stripe listen --forward-to localhost:5173/api/billing/webhook
```

### Demo accounts (from seed.sql)
| Role | Login |
| --- | --- |
| Parent A (Mom) | `mom@demo.teamkid` (magic link shows in Supabase Inbucket) |
| Parent B (Dad) | `dad@demo.teamkid` |
| Child (Lily, 8) | Kid login → PIN `1234` |

---

## Environment variables

`.env` (one file for the whole app):

```
# Public (safe in the browser)
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Private (server only; import from $env/static/private)
SUPABASE_SERVICE_ROLE_KEY=
LLM_API_KEY=
LLM_MODEL=
GOOGLE_PLACES_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_FAMILY_PLUS=
RESEND_API_KEY=
CRON_SECRET=
```

> Never import a private variable outside `src/lib/server/` or a `+server.ts` / `+page.server.ts` file. SvelteKit will fail the build if you try.

---

## Deployment

One Vercel project and one Supabase project.

1. **Supabase:** create a project (Free plan), then run:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
2. **Vercel:** push the repo to GitHub, import it at vercel.com/new (SvelteKit is detected automatically), and add all environment variables.
3. **Supabase Auth:** add your Vercel URL to *Authentication → URL Configuration* (site URL and redirect `https://teamkid.vercel.app/auth/callback`).
4. **Stripe (test mode):** add a webhook to `https://teamkid.vercel.app/api/billing/webhook`.
5. **Cron:** `vercel.json`
   ```json
   { "crons": [{ "path": "/api/cron/insights", "schedule": "0 6 * * 1" }] }
   ```
   The endpoint checks the `Authorization: Bearer <CRON_SECRET>` header that Vercel sends.

### Serverless rules
- Keep each request short; no long-running jobs (process the weekly insights one family at a time).
- Use **Supabase Realtime** for live updates (no custom WebSockets).
- Store files in **Supabase Storage**, never on disk.
- Open `/api/health` right before the demo to warm up.

### Plan limits to remember
- **Supabase Free** pauses a project after 7 days of inactivity. Restore it before any later demo.
- **Vercel Hobby** is for non-commercial use. Move to Pro before charging real customers.

---

## MVP scope (24 hours)

**A: must ship**
- [ ] Magic-link auth, family creation, invite co-parent, add child (with both consents)
- [ ] Custody calendar (2-2-3 template) and swap request flow
- [ ] Messaging with AI rewrite before sending (immutable messages)
- [ ] Parenting plan PDF → calendar
- [ ] Kids' space: Pebble, mood check-in, 3 wish cards, choose-to-share
- [ ] Weekly insight card, identical on both parent dashboards
- [ ] "Plan my weekend" with real places
- [ ] Stripe Checkout (test mode)
- [ ] Deployed on Vercel + Supabase

**B: if time allows**
- [ ] Expense with receipt photo → auto-split
- [ ] **Spending by category chart** on the shared dashboard
- [ ] **Private "My time with Lily" card** with one AI suggestion
- [ ] Incoming message shield
- [ ] Crisis script demo (safe reply + alert to both parents)
- [ ] PDF records export

**C: pitch only**
- Activities marketplace, shared kids' wallet, professional directory, teen mode, school integrations

---

## Demo script

1. **Child (judge on a phone):** logs in with a PIN, meets Pebble, says they feel "a bit tired", and picks "build a fort" and "go to the zoo". Pebble asks, "Want me to tell Mom and Dad about the zoo?" The child taps **Yes**.
2. **Dad's screen:** the insight card appears live: "A bit tired this week; into forts and animals." He sees the shared **spending chart** and his private card: *"You and Lily did 2 outings this month; she's into animals lately, and the zoo is open Saturday."* He taps **Plan my weekend**, and the AI suggests the zoo (times, prices) and a fort night at home.
3. **Dad writes an angry message** about a late pickup. The AI rewrites it calmly before sending.
4. **Mom's screen:** the same insight card, the calm message, and a swap request she accepts in one tap.
5. **Close:** *"Every co-parenting app helps parents argue less. TeamKid is the first that helps them listen to the child."*

---

## Team split

**Backbone (hours 0–5): all three together.** Project setup and deploy, full database schema with RLS, parent and kid auth, onboarding, layouts, `ask()` wrapper, stubs and seed data. Work as a mob (one types, two guide, rotate every 30–45 min). Don't split until Mom, Dad and Lily can log in on the live URL.

**Then split by feature:**

| | Member 1: Parent core | Member 2: Kids' space + insights | Member 3: AI and integrations |
| --- | --- | --- | --- |
| **P1** (hours 5–12) | Calendar, swap requests, messaging UI, dashboard | Pebble, mood check-in, wish cards with "Tell Mom and Dad?", weekly insight card | AI rewrite, parenting plan PDF → calendar, "Plan my weekend" |
| **P2** (hours 12–18) | Expenses → **spending chart**, document vault | Tuck-in, "where am I tonight?" → **"My time with Lily" card** | Stripe, message shield, crisis demo, review of the suggestion prompt |
| **P3** (pitch only) | Records PDF export | Teen mode, weekly insight cron | Marketplace, kids' wallet |

**Checkpoints:** backbone live (hour 5) → full demo on the live site (hour 12) → feature freeze (hour 18) → three clean demo runs (hour 22).

**If behind at hour 16, drop in this order:** private time card → message shield → crisis demo → document vault. Keep the spending chart and Stripe.

---

## Roadmap

1. **Core:** calendar, messaging, expenses, documents, AI assistant, Pebble, shared spending and private time analytics
2. **Family logistics:** activity booking, childcare and carpools, shared kids' wallet
3. **Divorce journey:** parenting-plan builder, mediator and lawyer marketplace
4. **Money and admin:** tax helper, insurance, savings for the child
5. **Child growth:** Pebble grows with the child; teen mode becomes a life-skills app
6. **Beyond divorce:** blended families, grandparents, foster and military families

> If the AI logic later needs Python (custom models, heavy data work), move `src/lib/server/ai/` into a separate FastAPI service. The rest of the app stays the same.

---

*TeamKid is a working name for the competition. Check trademarks before using it publicly.*
