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

Everything in this section works on `main`. Ideas that aren't built yet are listed under [Planned / not built yet](#planned--not-built-yet).

### Parent workspace
- **Onboarding:** create a family, invite the co-parent with a link (`/invite/[token]`), add a child. The child's account turns on only after **both** parents consent.
- **Today dashboard:** briefing, custody line, week strip, next handover, pending swaps, unread messages, the child's shared feeling of the day, safety alerts. Updates live (Supabase Realtime).
- **Custody calendar** (week and month views): templates 2-2-3, week on / week off and alternate weekends, with an exchange time. Events (school, activity, medical, handover, other) with place and notes. Each event has a **"Lily can see this"** switch, so surprises stay hidden from the child.
- **Swap requests:** request → accept / decline / counter, with history. Adding a planner idea on the other parent's day sends a swap request instead.
- **Messaging:** topic threads; messages **cannot be edited or deleted** (trigger + hash chain); read receipts.
- **Expenses:** receipts stored privately, split rules and a proposed family split both parents agree on, **"Ask before spending"** requests, **monthly costs** that log themselves, balance and **settle up**. A private **"My money"** card: a parent's income is never visible to the co-parent.
- **Document vault:** files in a private bucket, opened through 60-second signed links.
- **Safety alerts:** an alert raised in the kids' space shows on both dashboards (category only, never the child's words); either parent can mark it resolved.
- **Billing:** Stripe Checkout for Family Plus in **test mode**. The page stays disabled when Stripe keys are missing.

### AI assistant
All AI goes through one wrapper (`src/lib/server/ai/llm.ts`, `ask()`), with a fast and a smart model tier. With an empty `LLM_API_KEY` it returns deterministic fake output, so the app runs without a key. Prompts and answers are never logged.
- **Tone rewrite** before sending (BIFF: brief, informative, friendly, firm), with a check that the rewrite didn't add or drop facts.
- **Incoming shield:** turns a message from the other parent into neutral facts and requests. Nothing is stored.
- **Parenting plan reader:** upload a PDF (straight from the browser to private Storage) → the AI extracts the custody pattern, exchange time and place, and holidays, each with a confidence level and the source quote → the parent reviews and applies the schedule to the calendar. Holidays are saved with the schedule rules but not yet turned into calendar nights. A sample plan is in `static/demo/parenting-plan-carter.pdf`.
- **Plan this weekend** (panel in the Calendar): real places from **OpenStreetMap** (Overpass) near the chosen city, picked around the parent's free time, the child's shared wishes and the budget. Times are editable, with soft warnings. If Overpass is down, demo places are used and labelled as such.
- **"My time with Lily":** one private suggestion for the next outing, from that parent's own outings and the child's shared wishes.
- **Daily wish cards:** new questions for the child each day; a typed "Other" idea is cleaned into a short label before it's stored. An AI line on the parents' "Lily's week" card, with a rule-based fallback.

No names or exact locations are sent to the model.

### Kids' space (Pebble the turtle)
- **Kid login:** family code + PIN (rate-limited), no email.
- **Pebble home:** a 3D turtle the child names and colours; shell patterns to unlock.
- **Mood and energy check-in.** The child chooses **"Yes, tell them"** or **"Keep it just for me"**. A shared feeling appears live on both parents' dashboards. After several hard days, Pebble gently offers to tell a grown-up (only the child sees this nudge).
- **"Tuck in"** breathing exercise.
- **Wish cards** with choose-to-share, and a **"What do Mom and Dad see?"** page (`/my-sharing`) where the child can stop sharing.
- **Pond Pairs:** a calm memory game that earns pond friends. No streaks, no guilt mechanics.
- **"Where am I tonight?":** nights for the week, today's plans and who picks the child up, a "sleeps until Dad's" countdown, and a packing helper that adds items for upcoming plans (swimsuit for "Swim class"). Hidden events and parents' notes never reach the child.
- **"I need a grown-up"** button: sends an alert to both parents right away.

### Analytics
- **Shared (both parents, identical numbers):** spending by category per month, balance, and **"Lily's week"** (mood trend from the check-ins the child chose to share, counted per day, plus interests from shared wishes).
- **Private (one parent only):** "My time with Lily" (outings together, the child's star ratings, one AI suggestion).
- Never compares parents and never scores anyone (see [Analytics](#analytics)).

### Planned / not built yet
- **Pebble chat** (`/api/pebble/reply`): `src/lib/server/ai/pebble.ts` is a stub. The `kid_chat_raw` table and its 30-day purge exist, but nothing writes to them yet.
- **Weekly insight cron** (`/api/cron/insights`): `ai/weeklyInsight.ts` is a stub. "Lily's week" is rebuilt after each check-in or share instead.
- Thread summary ("What did we agree about X?").
- Receipt photo → amount, date and category.
- PDF export of records for lawyers or court.
- Weekly digest for parents.
- Email sending (Resend is not wired; invites are shared as links).
- `LLM_PROVIDER=openai` (the provider is a placeholder that throws).
- Holidays from the parenting plan applied to the calendar automatically.
- Teen mode (`children.mode` exists in the schema only).
- Analytics: child's week from the calendar, overnights per home, budget vs actual, year-end report.

---

## Architecture

One SvelteKit app does both the UI and the server work. One Vercel project, one Supabase project.

```
┌───────────────────────────────────────────────────────────────┐
│                         Browser                               │
│   Svelte pages: parent workspace + kids' space (Pebble)       │
└──────────────┬───────────────────────────────┬────────────────┘
               │ supabase-js (anon key)        │ form actions / fetch /api/*
               │ Realtime + Storage uploads    │
               │ protected by RLS              ▼
               │              ┌──────────────────────────────────┐
               │              │  SvelteKit server (Vercel)       │
               │              │  hooks.server.ts → session       │
               │              │  src/lib/server/*  (secrets here)│
               │              │  • AI: rewrite, shield, plan PDF,│
               │              │    planner, wish cards, My time  │
               │              │  • Places (OpenStreetMap)        │
               │              │  • Stripe checkout + webhook     │
               │              │  • Weekly insight rebuild        │
               │              └───────┬──────────────┬───────────┘
               ▼                      ▼              ▼
     ┌──────────────────────────────────────┐  ┌───────────────────────────┐
     │  Supabase                            │  │  External APIs            │
     │  Postgres + RLS · Auth · Storage     │  │  Anthropic (Claude)       │
     │  Realtime · pg_cron                  │  │  Stripe (test mode)       │
     └──────────────────────────────────────┘  │  OpenStreetMap (Overpass) │
                                               └───────────────────────────┘
```

**Rule of thumb:**
- **Server load functions and form actions** do most reads and writes, using the signed-in user's Supabase client, so row-level security (RLS) applies to every query.
- **Browser → Supabase directly** only for Realtime subscriptions (live dashboard, messages, swaps, expenses, safety alerts, shared feelings) and for uploading a parenting-plan PDF straight to private Storage (Vercel limits request bodies to 4.5 MB).
- **Service role** (`src/lib/server/supabaseAdmin.ts`) only on the server, where users have no write policy by design or aren't signed in yet: the audit log, weekly insights and daily wish cards, safety alerts, kid login, invites and adding a child, the income-based split suggestion, storage checks and the Stripe webhook.
- **The child never reads `events` directly.** The kids' calendar goes through `kid_calendar()`, which returns safe columns only (no notes, no hidden events).
- Secrets live **only** in `src/lib/server/env.ts` and are declared in `src/env.ts` (`$app/env/private`). SvelteKit refuses to bundle them into browser code, and `pnpm lint` checks it.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| App framework | **SvelteKit 3 + Svelte 5 + TypeScript** | Frontend and backend in one project |
| Adapter | `@sveltejs/adapter-vercel` | Zero-config deploys to Vercel |
| UI | Tailwind CSS 4 + shadcn-svelte (bits-ui) | Polished UI quickly |
| Pebble | Three.js via Threlte | The 3D turtle in the kids' space |
| Database | **Supabase Postgres** | Relational data, RLS, triggers and functions for immutable records and swaps |
| Auth | Supabase Auth via `@supabase/ssr` | Magic link or password for parents; family code + PIN for children |
| Realtime | Supabase Realtime | Live dashboard, messages, swaps, expenses, alerts, shared feelings |
| Files | Supabase Storage (private `documents` bucket) | Parenting plans, vault files, receipts; signed URLs only |
| AI | `@anthropic-ai/sdk` behind one `ask()` wrapper | Fast tier (`LLM_MODEL_FAST`) and smart tier (`LLM_MODEL_SMART`); fake output without a key |
| Validation | Zod 4 | Request bodies, form actions, AI JSON output, env vars |
| Places | **OpenStreetMap** (Overpass API, no key) | Real venues for "Plan this weekend"; demo places as a fallback |
| Payments | Stripe Checkout (REST, test mode) | Family Plus subscription |
| Scheduled jobs | Supabase `pg_cron` | Purge of raw kid chat after 30 days |
| Tests | Vitest + `scripts/test-rls.ts` | Unit tests and RLS tests with real signed-in clients |
| Hosting | **Vercel** | Push to deploy |

---

## Repository structure

```
teamkid/
├── README.md
├── package.json
├── vite.config.ts                  # SvelteKit 3: no svelte.config.js
├── tsconfig.json
├── .env.example
├── docs/                           # MANUAL_STEPS (cloud setup), ARCHITECTURE_NOTES, member briefs
├── scripts/
│   ├── seed.ts                     # demo families (idempotent)
│   ├── test-rls.ts                 # RLS test with real signed-in clients
│   ├── smoke.ts                    # HTTP smoke test (needs pnpm dev)
│   ├── make-sample-plan.ts         # regenerates static/demo/parenting-plan-carter.pdf
│   ├── make-local-env.mjs          # writes .env from `supabase status`
│   └── check-env-imports.ts        # lint: private env only in server files
├── static/
│   ├── demo/                       # sample parenting plan PDF
│   └── landing/                    # Open Graph images
│
├── src/
│   ├── env.ts                      # all env vars, declared and validated (Zod)
│   ├── hooks.server.ts             # Supabase SSR client + session on every request
│   │
│   ├── lib/
│   │   ├── supabase.ts             # browser client
│   │   ├── realtime.ts             # subscribeToFamily()
│   │   ├── types/                  # database.ts (generated), domain.ts
│   │   ├── safety/                 # help options for "I need a grown-up"
│   │   ├── custody/                # schedule patterns, time zones, today/briefing helpers
│   │   ├── expenses/               # balance, chart, income-based split
│   │   ├── kids/                   # moods, insight rules, wish deck, nights, kid calendar, packing, pond
│   │   ├── components/
│   │   │   ├── today/              # dashboard cards (incl. MoodToday)
│   │   │   ├── calendar/           # month/week views, EventForm, swaps
│   │   │   ├── messages/           # threads, composer with AI rewrite, ShieldButton
│   │   │   ├── expenses/           # forms, balance, requests, monthly costs, My money
│   │   │   ├── insights/           # InsightCard ("Lily's week")
│   │   │   ├── analytics/          # SpendingChart (shared), MyTimeCard (private)
│   │   │   ├── kids/               # Pebble, check-in choices, ShareAsk, PackingHelper
│   │   │   ├── plan/, import/      # weekend planner cards, plan PDF review
│   │   │   ├── documents/, family/ # vault upload/list, invite and add-child forms
│   │   │   ├── pebble/             # 3D turtle (Threlte)
│   │   │   ├── safety/             # SafetyAlerts
│   │   │   ├── landing/            # marketing page
│   │   │   └── ui/                 # shadcn-svelte components
│   │   │
│   │   └── server/                 # SERVER ONLY: never imported by the browser
│   │       ├── env.ts              # the only file that reads private env
│   │       ├── supabaseAdmin.ts    # service-role client
│   │       ├── guards.ts           # requireParent(), requireChild()
│   │       ├── kidAuth.ts          # family code + PIN login
│   │       ├── family.ts           # create family, invite, add child, consent
│   │       ├── audit.ts, validation.ts, rateLimit.ts
│   │       ├── ai/
│   │       │   ├── llm.ts, llmCore.ts, providers.ts   # ask() wrapper, tiers, typed errors
│   │       │   ├── rewrite.ts, factCheck.ts
│   │       │   ├── shield.ts, shieldRules.ts
│   │       │   ├── planExtract.ts, pdfCheck.ts        # parenting plan PDF
│   │       │   ├── planner.ts                         # weekend planner
│   │       │   ├── parentSuggestion.ts                # private "My time" suggestion
│   │       │   ├── pebble.ts, weeklyInsight.ts        # STUBS (planned)
│   │       │   └── prompts/                           # prompt templates (.md)
│   │       ├── insights/           # weekly insight build, sharing, daily wish cards, AI week line, My time
│   │       ├── places.ts, openingHours.ts             # OpenStreetMap (Overpass)
│   │       ├── plannerContext.ts, plannerSlot.ts, planPanel.ts, planSwap.ts
│   │       ├── safety.ts           # crisis keyword checks + safety alerts
│   │       └── stripe.ts, stripeCore.ts
│   │
│   └── routes/
│       ├── (marketing)/            # landing, /privacy, /terms
│       ├── login/, logout/, auth/callback/, auth/confirm/
│       ├── onboarding/, invite/[token]/
│       ├── kid-login/              # family code + PIN
│       │
│       ├── (parent)/               # layout guards the parent role
│       │   ├── dashboard/          # Today
│       │   ├── calendar/           # calendar, swaps, "Plan this weekend" panel
│       │   ├── messages/
│       │   ├── expenses/
│       │   ├── documents/          # vault + signed URLs
│       │   ├── family/             # members, invites, child profile
│       │   ├── plan/import/        # parenting plan PDF → calendar (/plan redirects to /calendar)
│       │   └── billing/
│       │
│       ├── (kid)/                  # layout guards the child role
│       │   ├── pebble/             # home with the turtle
│       │   ├── checkin/, tuck-in/, wishes/, my-sharing/
│       │   ├── pond/               # Pond Pairs game
│       │   ├── tonight/            # "Where am I tonight?"
│       │   └── help/               # "I need a grown-up"
│       │
│       └── api/                    # JSON endpoints (+server.ts), see Server endpoints
│
└── supabase/
    ├── config.toml
    └── migrations/                 # 0001–0007 backbone, then one file per feature (see Data model)
```

---

## Data model

The full schema is in `supabase/migrations/` (types: `src/lib/types/database.ts`, generated with `pnpm db:types`). Every table has RLS on; the `anon` role reads nothing.

### Family and roles
| Table | Key columns |
| --- | --- |
| `families` | id, name, family_code (used by kid login) |
| `members` | id, family_id, user_id, role (`parent` / `child` / `bonus` / `professional`), display_name, home (`A` / `B`) |
| `children` | id, family_id, member_id, first_name, birth_year, mode, status, pin_hash (never selectable by users) |
| `consents` | id, child_id, parent_member_id, consented_at (a child account needs **both** parents) |
| `invites` | id, family_id, email, role, token, expires_at, accepted_at |
| `child_profiles` | child_id, interests, dislikes, grade, birthday, notes (written by parents; feeds wish cards and the planner) |
| `kid_login_attempts` | family_code, success, created_at (rate limit; service role only) |

### Parent workspace
| Table | Key columns |
| --- | --- |
| `custody_schedules` | id, family_id, template, start_date, exchange_time, rules (jsonb: exchange place, holidays) |
| `events` | id, family_id, child_id, title, starts_at, ends_at, home, kind (`custody` / `school` / `activity` / `medical` / `handover` / `other`), place, notes, source (`manual` / `plan_pdf` / `planner`), **kid_visible**, pending_swap_id |
| `swap_requests` | id, family_id, requested_by, original_date, proposed_date, status, note, counter_of, responded_by, responded_at |
| `planner_ideas` | id, member_id, title, place, starts_at, ends_at (an activity returned to the planner after a declined swap; own parent only) |
| `threads` | id, family_id, topic |
| `messages` | id, thread_id, sender_id, body, original_body, ai_rewritten, first_read_at, prev_hash, hash |
| `expenses` | id, family_id, paid_by, title, amount_cents, category, spent_on, receipt_path, split, status, request_id, recurring_id, settlement_id |
| `expense_requests` | "Ask before spending": title, estimate_cents, split, status, response_note |
| `recurring_expenses` | monthly costs: title, amount_cents, day_of_month, split, status |
| `settlements` | settle up: paid_by, paid_to, amount_cents, method, confirmed_at |
| `family_finance`, `split_proposals` | the agreed default split and proposals to change it (both parents agree) |
| `parent_income` | member_id, band, share_for_split (**only that parent** can read it; never in Realtime, audit or exports) |
| `documents` | id, family_id, kind, title, mime, storage_path, extracted (jsonb) |
| `audit_log` | id, family_id, actor_member_id, action, entity, entity_id, meta, at (ids only, never content) |
| `subscriptions` | id, user_id, family_id, plan, status, stripe_customer_id, current_period_end |

### Kids' space
| Table | Key columns | Parents can read? |
| --- | --- | --- |
| `pet_state` | child_id, name, colors, shell_patterns, mood_shown, pond | No |
| `mood_checkins` | id, child_id, mood, energy, shared, created_at | **No** |
| `shared_moods` | child_id, mood, energy, shared_at (one row per child: today's feeling, only after "Yes, tell them") | Yes (both parents) |
| `wish_questions` | child_id, day, prompt, options, kind (daily AI questions) | No |
| `wish_cards` | id, child_id, interest, tags, shared_with_parents, shared_at | Only rows the child chose to share |
| `wish_refresh` | child_id, requested_at, handled_at (regenerate today's cards after parent edits) | No (server only) |
| `kid_chat_raw` | id, child_id, role, text, created_at (**deleted after 30 days**; not written yet) | **Never** |
| `weekly_insights` | id, child_id, week_start, mood_trend, interests, summary, ai_line, gentle_flag | **Yes**, identical for both parents |
| `safety_alerts` | id, child_id, level, category, created_at, resolved_at, resolved_by | Yes (both parents) |

The child never reads `events` directly: `kid_calendar(from, to)` returns custody nights and only `kid_visible` events, without notes. `kid_exchange_place()` returns the handover place.

### Analytics
| Object | Type | Key columns | Who can read |
| --- | --- | --- | --- |
| `outings` | table | id, family_id, child_id, parent_member_id, event_id, title, child_rating (1–5), happened_on | Only the parent who logged it |
| `v_spending_by_category` | view | family_id, month, category, total_cents | Both parents of the family |
| `v_parent_time` | view | parent_member_id, child_id, month, outings_count, avg_rating, top_activities | **Only that parent** |

> Views use `security_invoker = true`, so the RLS rules on the underlying tables still apply.

### Database-level guarantees
- **Messages are immutable:** a trigger blocks edits and deletes; the only allowed change is setting `first_read_at` once (read receipts). Each message carries `prev_hash` / `hash` (hash chain).
- **No parent policy exists on `mood_checkins`, `kid_chat_raw` or `pet_state`.** Parents read `weekly_insights`, `shared_moods`, `safety_alerts` and shared `wish_cards` only.
- **Multi-step changes run as `security definer` functions** in one transaction: `replace_custody_schedule`, `respond_to_swap` / `counter_swap`, `respond_to_expense`, `respond_to_expense_request`, `respond_to_recurring`, `settle_up` / `confirm_settlement`, `propose_family_split` / `respond_to_split_proposal`, `create_family`, `accept_invite`.
- **Storage:** one private `documents` bucket; a parent can read and upload only under their own family's folder.

---

## Server endpoints

Endpoints live in `src/routes/api/**/+server.ts`. Each one checks the session from `hooks.server.ts` and the role with `requireParent()` / `requireChild()` from `src/lib/server/guards.ts`, validates the body with Zod, and rate-limits AI calls. Most writes (events, swaps, messages, expenses, check-ins, wish cards) are **form actions** in the page's `+page.server.ts` instead.

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Health check (also warms up the function) |
| POST | `/api/ai/rewrite` | parent | Rewrite a draft message in a calm, BIFF tone |
| POST | `/api/ai/shield` | parent | Neutral facts + requests for a message the other parent sent |
| POST | `/api/documents/register-plan` | parent | Register a parenting-plan PDF the browser uploaded to Storage |
| POST | `/api/documents/parse-plan` | parent | Parenting plan PDF → schedule pattern, exchange time/place, holidays (with confidence + quotes) |
| POST | `/api/documents/apply-plan` | parent | Apply the reviewed schedule (`replace_custody_schedule`) |
| POST | `/api/planner/weekend` | parent | Weekend suggestions from OpenStreetMap places, free time, shared wishes and budget |
| POST | `/api/planner/check-slot` | parent | Soft warnings for a time the parent edits on a suggestion |
| GET / POST | `/api/analytics/my-time` | parent | The signed-in parent's private outings + one AI suggestion; log an outing |
| POST | `/api/safety/alerts/:id/resolve` | parent | Mark a child's safety alert as handled |
| POST | `/api/billing/checkout` | parent | Create a Stripe Checkout session (test mode) |
| POST | `/api/billing/webhook` | Stripe | Verify the signature → update `subscriptions` |

Other server routes:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/auth/callback`, `/auth/confirm` | Magic-link sign-in (PKCE and token-hash flows) |
| POST | `/logout` | Sign out |
| GET | `/documents/signed?path=…` | 60-second signed URL for a vault file (own family only) |
| POST | `/messages/[threadId]/read` | Read receipts |
| GET | `/plan` | Redirects to the Calendar ("Plan this weekend" panel) |

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
- Node.js 20.19+ (22 or 24 recommended) and pnpm 12 (`npm i -g pnpm`)
- Docker Desktop running (for local Supabase). The Supabase CLI is a dev dependency: use `pnpm exec supabase …`.

### 1. Install and start the database
```bash
pnpm install
pnpm db:start                  # local Postgres, Auth, Storage, Realtime, Mailpit (first run pulls images)
pnpm env:local                 # writes .env from `supabase status` + a fresh KID_AUTH_SECRET
pnpm db:seed                   # demo families (idempotent)
```

### 2. Run the app
```bash
pnpm dev                       # http://localhost:5173
```
Magic-link emails land in Mailpit: http://127.0.0.1:54324

### 3. Useful scripts
| Script | What it does |
| --- | --- |
| `pnpm db:reset` | Re-applies `supabase/migrations/*` on an empty DB (run `pnpm db:seed` after) |
| `pnpm db:types` | Regenerates `src/lib/types/database.ts` from the local DB |
| `pnpm check` / `pnpm lint` / `pnpm test` | Types, Prettier + ESLint + private-env import check, Vitest |
| `pnpm test:rls` | Row-level security test with real signed-in clients (needs the seed) |
| `pnpm test:smoke` | HTTP smoke test of logins, guards and the full onboarding flow (needs `pnpm dev`) |

Cloud setup (Supabase + Vercel) is in [docs/MANUAL_STEPS.md](docs/MANUAL_STEPS.md); decisions and
deviations in [docs/ARCHITECTURE_NOTES.md](docs/ARCHITECTURE_NOTES.md).

### 4. Stripe webhooks (optional, local)
```bash
stripe listen --forward-to localhost:5173/api/billing/webhook
```

### Demo accounts (from `pnpm db:seed`)
| Role | Login |
| --- | --- |
| Parent A (Mom, Carter family) | `mom@demo.teamkid.app` / `DemoMom!2026` (or magic link via Mailpit) |
| Parent B (Dad, Carter family) | `dad@demo.teamkid.app` / `DemoDad!2026` |
| Child (Lily, born 2018) | Kid login → family code `TURTLE-1234`, PIN `1234` |
| RLS test only (Ana, Diaz family) | `ana@demo.teamkid.app` / `DemoAna!2026`. Her child Leo (`CORAL-5678`, PIN `4321`) stays pending: only one parent has consented |

The seed is idempotent: it adds only what is missing. It creates two weeks of custody nights (2-2-3, Mom first) from the Monday of the current week, a few events, messages, expenses and outings, and two shared check-ins for Lily.

---

## Environment variables

Copy `.env.example` to `.env` (locally `pnpm env:local` fills it from `supabase status`). On Vercel, add the same variables to **Production** and **Preview**.

| Variable | Needed? | What it's for |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | **yes** | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | **yes** | Supabase anon key (safe in the browser; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Server-only admin client (see Architecture) |
| `KID_AUTH_SECRET` | **yes** | ≥ 32 chars; derives the hidden kid passwords. Keep it stable: changing it locks every child out until the seed is re-run or the child is re-saved |
| `LLM_PROVIDER` | yes | `anthropic` or `fake` (`openai` is a placeholder that throws) |
| `LLM_API_KEY` | for real AI | Anthropic API key. Empty → deterministic fake output |
| `LLM_MODEL_FAST` | optional | Fast tier (rewrite, shield, planner queries, wish cards), e.g. `claude-haiku-5-5` |
| `LLM_MODEL_SMART` | optional | Smart tier (plan PDF, planner pick), e.g. `claude-sonnet-5-5` |
| `LLM_MODEL` | optional | Fallback model when a tier variable is empty |
| `STRIPE_SECRET_KEY` | for billing | Stripe test-mode secret key. Empty → billing page shows "not configured" |
| `STRIPE_WEBHOOK_SECRET` | for billing | Signing secret of the webhook endpoint |
| `STRIPE_PRICE_ID_FAMILY_PLUS` | for billing | Price of the Family Plus plan |

Declared in `src/env.ts` but **not used by the code yet**: `PUBLIC_STRIPE_PUBLISHABLE_KEY`, `GOOGLE_PLACES_API_KEY` (places come from OpenStreetMap, no key), `RESEND_API_KEY` (no email sending), `CRON_SECRET` (no cron endpoint). Leave them empty.

> SvelteKit 3: variables are declared and validated in `src/env.ts` and imported from `$app/env/public` / `$app/env/private` (there is no `$env/static/*`). Private variables are read only in `src/lib/server/env.ts`; SvelteKit refuses to bundle them for the browser and `pnpm lint` fails if one is imported elsewhere. Never put real keys in `.env.example`.

---

## Deployment

One Vercel project, one Supabase project. Step-by-step notes for the cloud are in [docs/MANUAL_STEPS.md](docs/MANUAL_STEPS.md).

1. **Supabase:** create a project (Free plan), then link it and push the migrations. Supabase CLI 3 targets the local stack by default, so `--remote` is required:
   ```bash
   pnpm exec supabase link --project-ref <ref>
   pnpm exec supabase db push --remote --dry-run   # check the list first
   pnpm exec supabase db push --remote
   ```
   If the connection resets, set `SUPABASE_DB_PASSWORD` in the shell or try another network.
2. **Demo data (optional):** with the cloud keys in `.env.cloud`:
   ```bash
   pnpm exec tsx --env-file=.env.cloud scripts/seed.ts
   pnpm exec tsx --env-file=.env.cloud scripts/test-rls.ts
   ```
   The seed creates two weeks of custody nights starting this Monday. `static/demo/parenting-plan-carter.pdf` must match the seed's start date; regenerate it with `scripts/make-sample-plan.ts --start=YYYY-MM-DD` if needed.
3. **Vercel:** import the GitHub repo (SvelteKit is detected automatically). The Vercel GitHub App must be installed on the account that owns the repo. Add the environment variables above to Production and Preview. Don't add Vercel's Supabase integration: the project already has its own.
4. **Release branch:** Vercel → Settings → Environments → Production → Branch Tracking → `production`. Pushes to `main` and feature branches become Preview deployments. Vercel needs one deployment from `production` before it accepts the setting.
5. **Supabase Auth → URL Configuration:**
   - Site URL: `https://<your-app>.vercel.app`
   - Redirect URLs: `https://<your-app>.vercel.app/auth/callback`, `https://<your-app>.vercel.app/auth/confirm`, plus a wildcard for previews such as `https://<project>-*-<team>.vercel.app/**`.
6. **Stripe (optional, test mode):** add a webhook to `https://<your-app>.vercel.app/api/billing/webhook` and set the three Stripe variables.

### Releasing
```bash
pnpm exec supabase db push --remote --dry-run   # new migrations first
pnpm exec supabase db push --remote
git fetch origin && git push origin origin/main:production
```
Push the migrations **before** the code that needs them, and release right after. Never force-push `production`; roll back with Vercel's Instant Rollback.

### Serverless rules
- Keep each request short; AI routes set `maxDuration` where they need it.
- Use **Supabase Realtime** for live updates (no custom WebSockets).
- Store files in **Supabase Storage**, never on disk. Large uploads go from the browser straight to Storage (Vercel caps request bodies at 4.5 MB).
- Open `/api/health` right before the demo to warm up.

### Plan limits to remember
- **Supabase Free** pauses a project after 7 days of inactivity. Restore it before any later demo.
- **Supabase's built-in email** sends only a few auth emails per hour per project. For demos, sign in with the demo passwords; add custom SMTP for real use.
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
