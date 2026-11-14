# TeamKid (working name)

> **Two homes. One team. One kid.**
> A co-parenting web app for separated parents, with an AI assistant and a child-safe AI pet that gives the child a voice in family planning.

Built for **Business Cup 2.0** (24-hour build). Audience: US parents aged 25–45. B2C, web only.

---

## Table of contents

1. [What it is](#what-it-is)
2. [Key features](#key-features)
3. [Architecture](#architecture)
4. [Tech stack](#tech-stack)
5. [Repository structure](#repository-structure)
6. [Data model](#data-model)
7. [API endpoints (FastAPI)](#api-endpoints-fastapi)
8. [Child safety and privacy rules](#child-safety-and-privacy-rules)
9. [Getting started (local)](#getting-started-local)
10. [Environment variables](#environment-variables)
11. [Deployment](#deployment)
12. [MVP scope (24 hours)](#mvp-scope-24-hours)
13. [Demo script](#demo-script)
14. [Team split](#team-split)
15. [Roadmap](#roadmap)

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

---

## Architecture

```
                         ┌──────────────────────────────┐
                         │          Browser             │
                         │  SvelteKit app (web/)        │
                         │  • Parent workspace          │
                         │  • Kids' space (Pebble)      │
                         └──────┬───────────────┬───────┘
                                │               │
            Supabase JS client  │               │  fetch /api/* with Supabase JWT
     (auth, CRUD, realtime,     │               │
      storage, protected by RLS)│               ▼
                                │     ┌────────────────────────┐
                                │     │  FastAPI (api/)        │
                                │     │  Vercel Python runtime │
                                │     │  • AI features         │
                                │     │  • PDF parsing         │
                                │     │  • Stripe webhooks     │
                                │     │  • Weekly insight job  │
                                │     └───┬──────────┬─────────┘
                                ▼         ▼          ▼
                     ┌────────────────────────┐   ┌──────────────────────┐
                     │  Supabase              │   │  External APIs       │
                     │  • Postgres + RLS      │   │  • LLM (Claude / GPT)│
                     │  • Auth                │   │  • Stripe            │
                     │  • Storage (private)   │   │  • Google Places     │
                     │  • Realtime            │   │  • Resend (email)    │
                     │  • pg_cron             │   └──────────────────────┘
                     └────────────────────────┘
```

**Rule of thumb:**
- **Svelte → Supabase directly** for everything simple: reading and writing calendar events, messages, expenses, pet state and live updates. Row-level security protects it.
- **Svelte → FastAPI** only for things that need secrets or heavy logic: AI calls, PDF parsing, Stripe and the weekly insight summary.
- FastAPI verifies the user's Supabase JWT on every request. It uses the Supabase **service role key**, which never reaches the browser.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | **SvelteKit + TypeScript** | Team experience; fast to build |
| UI | Tailwind CSS + shadcn-svelte | Polished UI quickly |
| Animation | Rive (or Lottie) | Pebble's states: idle, happy, sleepy, tuck-in |
| Backend | **FastAPI (Python 3.12)** | Team experience; good for AI and PDF work |
| Database | **Supabase Postgres** | Relational data, RLS, triggers for immutable records |
| Auth | Supabase Auth (magic link) | Parents by email; children by a PIN created by a parent |
| Realtime | Supabase Realtime | Live messages, swap requests, insight cards |
| Files | Supabase Storage (private buckets) | PDFs, receipts, photos |
| AI | LLM API via the official Python SDK | Rewrite, extraction, planning, pet replies |
| PDF | pypdf (text PDFs), or LLM vision for scans | Parenting plan reader |
| Payments | Stripe Checkout + Billing (test mode for demo) | Family Plus subscription |
| Email | Resend | Invites, notifications |
| Places | Google Places API | Real venues for "Plan my weekend" |
| Hosting | **Vercel** (two projects: web + api) | Zero-config deploys for SvelteKit and FastAPI |
| Scheduled jobs | Vercel Cron → FastAPI endpoint | Weekly child insight summary |

---

## Repository structure

```
teamkid/
├── README.md
├── .gitignore
│
├── web/                              # SvelteKit frontend (Vercel project #1)
│   ├── package.json
│   ├── svelte.config.js
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── .env.example
│   ├── static/
│   │   └── pebble/                   # Rive / Lottie files for the turtle
│   └── src/
│       ├── app.html
│       ├── hooks.server.ts           # Supabase session on every request
│       ├── lib/
│       │   ├── supabase.ts           # browser + server clients
│       │   ├── api.ts                # fetch wrapper for FastAPI (adds JWT)
│       │   ├── types.ts              # shared TS types (generated from DB)
│       │   ├── stores/               # session, family, realtime stores
│       │   └── components/
│       │       ├── calendar/         # CustodyCalendar, SwapRequestCard
│       │       ├── messages/         # Thread, Composer (with AI rewrite)
│       │       ├── expenses/         # ExpenseForm, Balance
│       │       ├── insights/         # InsightCard (weekly child summary)
│       │       ├── kids/             # Pebble, MoodWheel, WishCard, TuckIn
│       │       └── ui/               # shadcn-svelte components
│       └── routes/
│           ├── +layout.svelte
│           ├── +page.svelte          # landing page
│           ├── login/                # magic link
│           ├── onboarding/           # create family, invite co-parent, add child
│           ├── (parent)/             # parent-only layout guard
│           │   ├── dashboard/        # week overview + insight card
│           │   ├── calendar/
│           │   ├── messages/
│           │   ├── expenses/
│           │   ├── documents/
│           │   ├── plan/             # "Plan my weekend"
│           │   └── billing/          # Stripe checkout
│           ├── (kid)/                # child-only layout guard
│           │   ├── pebble/           # home screen with the turtle
│           │   ├── checkin/
│           │   ├── wishes/
│           │   └── where-am-i/
│           └── kid-login/            # PIN login for children
│
├── api/                              # FastAPI backend (Vercel project #2)
│   ├── pyproject.toml                # or requirements.txt
│   ├── .python-version               # 3.12
│   ├── .env.example
│   ├── vercel.json                   # cron schedule
│   └── app/
│       ├── main.py                   # FastAPI instance named `app`, CORS, routers
│       ├── config.py                 # settings from env vars
│       ├── deps.py                   # auth dependency: verify Supabase JWT
│       ├── db.py                     # Supabase client (service role)
│       ├── routers/
│       │   ├── ai.py                 # rewrite, shield, summarise
│       │   ├── documents.py          # parenting plan → calendar
│       │   ├── planner.py            # plan my weekend
│       │   ├── pet.py                # Pebble's replies (guarded)
│       │   ├── insights.py           # weekly child insight job
│       │   ├── billing.py            # Stripe checkout + webhook
│       │   └── health.py
│       ├── services/
│       │   ├── llm.py                # LLM client wrapper + prompts
│       │   ├── pdf.py                # text extraction
│       │   ├── places.py             # Google Places
│       │   ├── safety.py             # crisis keyword + classifier checks
│       │   └── stripe_service.py
│       ├── prompts/                  # prompt templates (.md)
│       │   ├── rewrite.md
│       │   ├── shield.md
│       │   ├── plan_extract.md
│       │   ├── planner.md
│       │   ├── pet_system.md
│       │   └── weekly_insight.md
│       └── schemas/                  # Pydantic request/response models
│   └── tests/
│
└── supabase/
    ├── config.toml
    ├── migrations/
    │   ├── 0001_core.sql             # families, members, children, consents
    │   ├── 0002_parent.sql           # schedules, events, swaps, messages, expenses, documents
    │   ├── 0003_kids.sql             # pet_state, mood_checkins, wish_cards, kid_chat_raw, weekly_insights
    │   ├── 0004_rls.sql              # row-level security policies
    │   ├── 0005_immutability.sql     # triggers: messages can't be edited/deleted, hash chain
    │   └── 0006_retention.sql        # pg_cron: delete kid_chat_raw after 30 days
    └── seed.sql                      # demo family, sample plan, a week of check-ins
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

### Kids' space
| Table | Key columns | Parents can read? |
| --- | --- | --- |
| `pet_state` | child_id, name, colors, shell_patterns, mood_shown | No |
| `mood_checkins` | id, child_id, mood (label), energy, created_at | **No** |
| `wish_cards` | id, child_id, interest, shared_with_parents (bool), created_at | Only rows the child chose to share |
| `kid_chat_raw` | id, child_id, text, created_at (**deleted after 30 days**) | **Never** |
| `weekly_insights` | id, child_id, week_start, mood_trend, interests, gentle_flag | **Yes**, identical for both parents |
| `safety_alerts` | id, child_id, level, created_at, resolved_at | Yes (both parents) |

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

## API endpoints (FastAPI)

All endpoints except `/health` and `/billing/webhook` require `Authorization: Bearer <supabase_jwt>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check (also used to warm up before the demo) |
| POST | `/ai/rewrite` | Rewrite a draft message in a calm, BIFF tone |
| POST | `/ai/shield` | Summarise an incoming message into facts and requests |
| POST | `/ai/summarize-thread` | "What did we agree about X?" |
| POST | `/documents/parse-plan` | Parenting plan PDF → schedule template + holidays (writes `events`) |
| POST | `/documents/parse-receipt` | Receipt photo → amount, date, category |
| POST | `/planner/weekend` | Three activity suggestions from wish cards, schedule, budget, location |
| POST | `/pet/reply` | Pebble's guarded reply (scripted first, LLM fallback, safety check) |
| POST | `/insights/run` | Build `weekly_insights` (called by Vercel Cron; protected by a cron secret) |
| POST | `/billing/checkout` | Create a Stripe Checkout session |
| POST | `/billing/webhook` | Stripe webhook → update subscription status |

Example: verifying the Supabase JWT in FastAPI (`app/deps.py`):

```python
from fastapi import Depends, HTTPException, Header
import jwt
from .config import settings

def current_user(authorization: str = Header(...)) -> dict:
    try:
        token = authorization.removeprefix("Bearer ").strip()
        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

> If your Supabase project uses asymmetric JWT signing keys, verify against the project's JWKS endpoint instead of the shared secret.

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
8. **Data minimisation:** raw chat is deleted after 30 days; no children's data is used for AI training or ads; no analytics SDKs in the kids' space.
9. **COPPA:** verifiable parental consent, a written data-retention policy and a security programme are required before a real launch.

---

## Getting started (local)

### Prerequisites
- Node.js 20+ and pnpm (or npm)
- Python 3.12 and [uv](https://github.com/astral-sh/uv) (or pip)
- Supabase CLI and Docker (for local Supabase), or a free Supabase cloud project

### 1. Database
```bash
cd supabase
supabase start                 # local Postgres, Auth, Storage, Realtime
supabase db reset              # applies migrations + seed.sql
```

### 2. Backend (FastAPI)
```bash
cd api
cp .env.example .env           # fill in keys
uv sync                        # or: pip install -r requirements.txt
uv run uvicorn app.main:app --reload --port 8000
# open http://localhost:8000/docs
```

### 3. Frontend (SvelteKit)
```bash
cd web
cp .env.example .env           # fill in keys
pnpm install
pnpm dev                       # http://localhost:5173
```

### Demo accounts (from seed.sql)
| Role | Login |
| --- | --- |
| Parent A (Mom) | `mom@demo.teamkid` (magic link shows in the Supabase Inbucket) |
| Parent B (Dad) | `dad@demo.teamkid` |
| Child (Lily, 8) | Kid login → PIN `1234` |

---

## Environment variables

### `web/.env`
```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
PUBLIC_API_URL=http://localhost:8000
PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### `api/.env`
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=        # server only, never in web/
SUPABASE_JWT_SECRET=
LLM_API_KEY=
LLM_MODEL=
GOOGLE_PLACES_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_FAMILY_PLUS=
RESEND_API_KEY=
CRON_SECRET=
ALLOWED_ORIGINS=http://localhost:5173,https://teamkid.vercel.app
```

---

## Deployment

Two Vercel projects from one GitHub repo, plus one Supabase project.

| What | Where | Settings |
| --- | --- | --- |
| Frontend | Vercel project `teamkid-web` | Root directory: `web/`; framework auto-detected (SvelteKit) |
| Backend | Vercel project `teamkid-api` | Root directory: `api/`; FastAPI auto-detected (exports `app` in `app/main.py`) |
| Database | Supabase cloud (Free plan) | Run `supabase db push` to apply migrations |

Steps:
1. Push the repo to GitHub.
2. Import it twice at vercel.com/new: once with root `web/`, once with root `api/`.
3. Add environment variables in each Vercel project (Settings → Environment Variables).
4. Set `PUBLIC_API_URL` in `web` to the `teamkid-api` production URL, and add the `web` URL to `ALLOWED_ORIGINS` in `api`.
5. In Stripe (test mode), point the webhook to `https://teamkid-api.vercel.app/billing/webhook`.
6. Add the weekly cron in `api/vercel.json`:
   ```json
   { "crons": [{ "path": "/insights/run", "schedule": "0 6 * * 1" }] }
   ```

### Serverless rules (FastAPI on Vercel)
- Keep each request short; no long-running jobs.
- No WebSockets: use **Supabase Realtime** for live updates.
- No local file storage: use **Supabase Storage**.
- Avoid heavy libraries (no PyTorch); call LLM APIs instead.
- Hit `/health` right before the demo to avoid a cold start.

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
- [ ] Incoming message shield
- [ ] Crisis script demo (safe reply + alert to both parents)
- [ ] PDF records export

**C: pitch only**
- Activities marketplace, shared kids' wallet, professional directory, teen mode, school integrations

---

## Demo script

1. **Child (judge on a phone):** logs in with a PIN, meets Pebble, says they feel "a bit tired", and picks "build a fort" and "go to the zoo". Pebble asks, "Want me to tell Mom and Dad about the zoo?" The child taps **Yes**.
2. **Dad's screen:** the insight card appears live: "A bit tired this week; into forts and animals." He taps **Plan my weekend**, and the AI suggests the zoo (times, prices) and a fort night at home.
3. **Dad writes an angry message** about a late pickup. The AI rewrites it calmly before sending.
4. **Mom's screen:** the same insight card, the calm message, and a swap request she accepts in one tap.
5. **Close:** *"Every co-parenting app helps parents argue less. TeamKid is the first that helps them listen to the child."*

---

## Team split

| Person | Owns |
| --- | --- |
| 1 | Supabase: schema, RLS, triggers, seed data, auth and kid PIN login |
| 2 | Svelte parent app: calendar, swaps, messages, dashboard, Stripe UI |
| 3 | Svelte kids' space: Pebble animation, check-in, wish cards, tuck-in |
| 4 | FastAPI: AI endpoints, PDF parsing, planner, insights job, deployment |

**First hour:** everyone deploys a "hello world" (web + api + database) so deployment problems show up early.

---

## Roadmap

1. **Core:** calendar, messaging, expenses, documents, AI assistant, Pebble
2. **Family logistics:** activity booking, childcare and carpools, shared kids' wallet
3. **Divorce journey:** parenting-plan builder, mediator and lawyer marketplace
4. **Money and admin:** tax helper, insurance, savings for the child
5. **Child growth:** Pebble grows with the child; teen mode becomes a life-skills app
6. **Beyond divorce:** blended families, grandparents, foster and military families

---

*TeamKid is a working name for the competition. Check trademarks before using it publicly.*
