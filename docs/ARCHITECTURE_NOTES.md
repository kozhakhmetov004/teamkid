# Architecture notes (backbone)

Short record of decisions, deviations from the README, and known limitations.
The README stays the product source of truth; this file explains where the code differs and why.

## Stack as installed

| Piece                       | Version              | Note                                                                     |
| --------------------------- | -------------------- | ------------------------------------------------------------------------ |
| SvelteKit                   | 3.2                  | Svelte 5 runes everywhere                                                |
| Svelte                      | 5.57                 |                                                                          |
| Vite                        | 8                    | config in `vite.config.ts` (there is **no** `svelte.config.js` in Kit 3) |
| Tailwind                    | 4.3                  | CSS-first config in `src/routes/layout.css` (no `tailwind.config.ts`)    |
| shadcn-svelte               | 1.8 (`nova` preset)  | button, input, label, card, dialog, dropdown-menu, avatar, badge, sonner |
| @supabase/ssr / supabase-js | 0.12 / 2.119         |                                                                          |
| Supabase CLI                | 3.1 (dev dependency) | `pnpm exec supabase …`; local Postgres 17                                |
| Zod                         | 4                    | also used as the Standard Schema validator for env vars                  |
| @anthropic-ai/sdk           | 1.8                  | default model `claude-opus-5-5`                                          |
| pnpm                        | 12.18                | pinned via `packageManager`                                              |

## SvelteKit 3 differences the team will notice

- **Imports use `#lib/...js`** (Node subpath imports in `package.json`), e.g.
  `import { requireParent } from '#lib/server/guards.js'`. Use the `.js` extension for TS files.
- **Env vars**: there is no `$env/static/private` in Kit 3. Variables are declared and validated
  (Zod) in `src/env.ts` and read from `$app/env/public` / `$app/env/private`. In this repo, private
  vars are read **only** through `src/lib/server/env.ts` (`serverEnv`). `pnpm lint` runs
  `scripts/check-env-imports.ts`, which fails if private env is imported anywhere except
  `src/lib/server/**`, `hooks.server.ts` or `+server/+page.server/+layout.server.ts` (it also
  flags the deprecated `$env/*` modules).
- `Handle` is imported from `@sveltejs/kit/hooks`.
- A form POST without `Accept: text/html` gets a JSON `ActionResult` (that's how `use:enhance` works).

## Deviations from the README

1. **Generated types** live in `src/lib/types/database.ts` (README: `src/lib/types.ts`); domain
   types in `src/lib/types/domain.ts`. `pnpm db:types` regenerates and formats them.
2. **Seed**: `scripts/seed.ts` (TypeScript, service role, idempotent) instead of `supabase/seed.sql`,
   because auth users and the hidden kid users must be created through the Auth admin API.
   `[db.seed]` is disabled in `supabase/config.toml`.
3. **Demo emails** are `@demo.teamkid.app` (README had `@demo.teamkid`).
4. **Migration 0007** (`0007_analytics_realtime.sql`) holds the two analytics views and the Realtime
   publication (`messages`, `swap_requests`, `wish_cards`, `weekly_insights`). `outings` is in 0003.
5. **Extra columns** (all additive):
   - `families.family_code` (kid login code, e.g. `TURTLE-4821`).
   - `members.home` (`A`/`B`): which calendar home a parent represents (first parent `A`, second `B`).
   - Denormalised `family_id` on `messages`, `wish_cards`, `weekly_insights`, `safety_alerts`, filled
     by triggers from the thread/child (can't be spoofed), so Realtime and RLS filter by family.
   - `audit_log.actor_member_id` (+ `meta jsonb`), `invites.invited_by/accepted_by`,
     `swap_requests.child_id/note/counter_of/responded_by`, `expenses.child_id/currency/description/spent_on`,
     `documents.title/mime/uploaded_by`, `weekly_insights.summary`, `safety_alerts.category/resolved_by`,
     `wish_cards.prompt/shared_at`, `kid_chat_raw.role`, `subscriptions.family_id/plan/stripe_subscription_id`.
6. **`outings` RLS is stricter than the README**: a parent can read only **their own** outings
   (README: all parents of the family). This follows the README's own rule "never compare parents";
   `v_parent_time` was private anyway. Loosen it only with a clear product reason.
7. **`children.pin_hash` is not selectable** by any user (column grants). PIN checks happen on the
   server with the service role.
8. **`anon` has no table privileges at all**; everything requires a signed-in user. `/api/health`
   therefore checks the DB with the service role (head-only query, returns a boolean).
9. **Guards take the request event** (`{ locals, url }`), not just `locals`, so they can tell pages
   (redirect) from `/api/*` (401/403). `requireChild` sends signed-out users to `/kid-login`.
10. **Invites are bound to the invited email**: `accept_invite()` refuses if the signed-in email differs.
11. **One family per user** for now: `create_family()` / `accept_invite()` refuse if the user is
    already a member somewhere. `getMember()` returns the first membership.
12. **Session data in pages**: the root layout returns `signedIn`, `sessionExpiresAt` and `member`,
    not the Supabase `session` object, so access/refresh tokens are never serialised into HTML.
13. **`/logout` is POST-only** (forms), so prefetching or a third-party link can't sign users out.
14. ESLint rule `svelte/no-navigation-without-resolve` is off (no `paths.base`; shadcn's Button
    trips it too). `_`-prefixed unused args are allowed.
15. `/onboarding` contains all three steps (family → invite → child); `/family` repeats invite and
    add-child and adds consent. Both use `src/lib/server/family.ts`.

## Key design decisions

- **RLS helpers** (`current_member_ids`, `is_family_member`, `is_family_parent`, `current_child_id`,
  `family_of_child`) are `security definer` + `stable` + `search_path = public` to avoid recursive RLS.
  `current_child_id()` returns null unless the child is `active`, so a disabled child loses access
  to its data immediately.
- **Consent**: an `after insert` trigger on `consents` activates the child when at least 2 parents
  exist and all of them consented. Parents can't update `children.status` themselves.
- **Kid auth**: hidden auth user `kid-<child_uuid>@kids.teamkid.invalid`, password
  `HMAC_SHA256(KID_AUTH_SECRET, child_uuid)` (derived, never stored), `app_metadata.role = 'child'`.
  The PIN (bcrypt) picks the child within a family, so PINs must be unique per family (enforced on add).
  Rate limit: 5 failed attempts per family code per 15 minutes (`kid_login_attempts`, no IP/PIN stored).
- **Messages**: immutable (trigger blocks delete and every update except `first_read_at` null → value,
  for every role including the service role; truncate is blocked too). Hash chain:
  `hash = sha256(coalesce(prev_hash,'') || sender_id || body || to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))`.
  `created_at` is set by the trigger (`clock_timestamp()`) after a per-thread advisory lock, so the
  chain can't fork or be back-dated. `audit_log` is append-only the same way.
- **Families with messages/audit rows can't be deleted** (FKs without cascade). Intended: they are records.
- **`ask()`** (`src/lib/server/ai/llm.ts`): provider from `LLM_PROVIDER` (anthropic implemented;
  openai is a clear stub in `providers.ts`). No key ⇒ deterministic fake. JSON mode uses structured
  outputs (`output_config.format` via `zodOutputFormat`) **and** validates with Zod, retrying once with
  the validation error. Requests use effort `medium` and **server-side refusal fallbacks**
  (`fallbacks: 'default'`, beta `server-side-fallback-2026-07-01`). Pure logic is in `llmCore.ts`
  (unit-tested without SvelteKit).
- **Audit**: `logAudit()` throws if the write fails; an action without its audit record is a bug.
  Only ids go into `meta` (no names, emails or child words).

## Known limitations / follow-ups

- **Time zones**: the dashboard formats dates in UTC on the server (avoids hydration mismatch);
  seed events use UTC hours. The calendar feature should add a family time zone.
- **Rate limit is per family code**: a stranger who knows the code can lock the family's kids out
  for 15 minutes. Fine for the MVP; consider per-device limits later.
- **Rotating `KID_AUTH_SECRET`** locks every child out until their hidden passwords are re-synced
  (`ensureKidAuthUser()` for each child; the seed does it for demo kids).
- Invite **emails are not sent** (copy the link). Resend can be added behind `RESEND_API_KEY`.
- **Storage buckets** (documents, receipts) and their policies are not created yet: the documents
  workstream adds a migration (`0008_storage.sql`).
- **No `vercel.json` cron yet**, because `/api/cron/insights` doesn't exist. Add both together.
- No hash-chain **verification** function yet (only the chain itself).
- The root JS chunk (~270 kB) includes supabase-js for the auth listener; lazy-load it later if needed.
- `pnpm build` fails on Windows without Developer Mode (adapter-vercel symlinks); Linux/Vercel is fine.
- Peer warning: `runed` (used by bits-ui) still declares `@sveltejs/kit@^2`; it works with Kit 3.
- `findAuthUserIdByEmail()` pages through `listUsers` (fine for hundreds of users, not millions).
