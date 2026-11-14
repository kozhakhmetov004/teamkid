# Manual steps

These steps can't be done from the terminal by the backbone script. Do them once, in order.
Commands assume the repo root and `pnpm install` done.

## 0. Demo accounts (after seeding)

| Role                             | Login                     | Secret         | Where                               |
| -------------------------------- | ------------------------- | -------------- | ----------------------------------- |
| Parent A (Mom)                   | `mom@demo.teamkid.app`    | `DemoMom!2026` | `/login` → "Use a password instead" |
| Parent B (Dad)                   | `dad@demo.teamkid.app`    | `DemoDad!2026` | `/login` → "Use a password instead" |
| Child (Lily, born 2018)          | family code `TURTLE-1234` | PIN `1234`     | `/kid-login`                        |
| RLS test only (Ana, Diaz family) | `ana@demo.teamkid.app`    | `DemoAna!2026` | not for demos                       |

> These are demo credentials for a demo project. Don't reuse them anywhere real.

---

## 1. Create the Supabase cloud project

1. Go to <https://supabase.com/dashboard> → **New project** (Free plan is fine).
2. Region: closest to the judges/users (e.g. `East US (North Virginia)`). Save the DB password in your password manager.
3. When it's ready, open **Project Settings → API** and note:
   - Project URL → `PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (**server only, never in the browser or git**)
   - Project ref (the `xxxx` in `https://xxxx.supabase.co`)

## 2. Link and push the schema

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push          # applies supabase/migrations/0001 … 0007
```

Then check the result in **SQL Editor**:

```sql
select jobname, schedule from cron.job;              -- expect purge-kid-chat-raw | 15 3 * * *
select count(*) from pg_publication_tables where pubname = 'supabase_realtime'; -- expect 4
```

## 3. Enable pg_cron (kid chat retention)

`0006_retention.sql` enables `pg_cron` and schedules `purge_old_kid_chat()` automatically **if the
extension is available**. If the first query above returns no row:

1. Dashboard → **Database → Extensions** → enable **pg_cron**.
2. SQL Editor:
   ```sql
   select cron.schedule('purge-kid-chat-raw', '15 3 * * *', 'select public.purge_old_kid_chat()');
   ```

## 4. Auth settings (Dashboard → Authentication)

1. **Sign In / Providers → Email**: enabled. Keep "Confirm email" on (magic link confirms it).
   Password sign-in is used only for the demo accounts.
2. **URL Configuration**:
   - Site URL: `https://<your-app>.vercel.app`
   - Redirect URLs (add all):
     - `https://<your-app>.vercel.app/auth/callback`
     - `https://<your-app>.vercel.app/auth/confirm`
     - `https://*-<your-team>.vercel.app/auth/callback` (Vercel preview deployments, optional)
     - `http://localhost:5173/auth/callback` (local dev against the cloud project, optional)
3. **Emails / SMTP**: Supabase's built-in mailer is heavily rate-limited (a few emails per hour). For
   the demo either use the password logins above, or set up custom SMTP (e.g. Resend) under
   **Authentication → Emails → SMTP Settings**.
4. (Optional, recommended) **Email Templates → Magic Link**: to make links work even when opened in
   a different browser, change the link to:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   (the default `{{ .ConfirmationURL }}` uses `/auth/callback`, which needs the same browser.)

## 5. Create the Vercel project

1. Push the repo to GitHub (you're committing yourself; `backbone` → PR → `main`).
2. <https://vercel.com/new> → import the repo. Framework preset: **SvelteKit** (auto-detected).
   - Install command: `pnpm install` · Build command: `pnpm build` (defaults).
   - Node.js version (Project Settings → Build and Deployment): **22.x or 24.x**.
   - The repo pins `"packageManager": "pnpm@12.18.0"`. If the build fails on the pnpm version or
     lockfile, add the env var `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses that exact pnpm.
3. **Environment variables** (Project Settings → Environment Variables; Production + Preview):

   | Name                                                                                                                                                    | Value                                                                      | Notes                                                                                                       |
   | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
   | `PUBLIC_SUPABASE_URL`                                                                                                                                   | from step 1                                                                |                                                                                                             |
   | `PUBLIC_SUPABASE_ANON_KEY`                                                                                                                              | from step 1                                                                |                                                                                                             |
   | `SUPABASE_SERVICE_ROLE_KEY`                                                                                                                             | from step 1                                                                | mark **Sensitive**                                                                                          |
   | `KID_AUTH_SECRET`                                                                                                                                       | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | **new** value (not the local one); mark Sensitive. Must be identical wherever the cloud seed runs (step 6). |
   | `LLM_PROVIDER`                                                                                                                                          | `anthropic`                                                                |                                                                                                             |
   | `LLM_API_KEY`                                                                                                                                           | your Anthropic key                                                         | empty ⇒ deterministic fake output                                                                           |
   | `LLM_MODEL`                                                                                                                                             | (empty)                                                                    | defaults to `claude-opus-5-5`                                                                               |
   | `CRON_SECRET`                                                                                                                                           | random string                                                              | used later by `/api/cron/insights`                                                                          |
   | `PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_FAMILY_PLUS`, `GOOGLE_PLACES_API_KEY`, `RESEND_API_KEY` | later                                                                      | optional for the backbone                                                                                   |

4. Deploy. Then put the final URL into Supabase Auth (step 4.2) if you guessed it before.

## 6. Seed the cloud project

Create a local, git-ignored file `.env.cloud` (the `.env*` pattern ignores it) with the **cloud** values:

```bash
PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
KID_AUTH_SECRET=<exactly the value set in Vercel>
```

```bash
pnpm exec tsx --env-file=.env.cloud scripts/seed.ts       # safe to run again
pnpm exec tsx --env-file=.env.cloud scripts/test-rls.ts   # RLS check against the cloud DB
```

> If `KID_AUTH_SECRET` differs between the seed and Vercel, kid login fails ("Something went
> wrong"). Fix: re-run the seed with the Vercel value (it re-syncs the hidden kid passwords).

## 7. Verify the deployment (definition of done)

1. `https://<your-app>.vercel.app/api/health` → `{"ok":true,"db":true,…}` (also warms it up before a demo).
2. Mom and Dad log in with the passwords above → `/dashboard` with the four cards.
3. Lily: `/kid-login`, `TURTLE-1234` + `1234` → `/pebble`.
4. Mom opens `/pebble` → sent back to `/dashboard`; Lily opens `/dashboard` → sent to `/pebble`.

## 8. Local notes

- First time: `pnpm db:start`, then `pnpm env:local` (writes `.env` from `supabase status` + a fresh
  `KID_AUTH_SECRET`), `pnpm db:seed`, `pnpm dev`.
- Local magic-link emails: Mailpit at <http://127.0.0.1:54324>.
- `pnpm build` **on Windows** fails at the very end (`EPERM … symlink`) because `adapter-vercel`
  creates symlinks. Either enable **Windows Developer Mode** (Settings → System → For developers),
  build in WSL, or rely on Vercel (Linux) / `pnpm check`. The app itself compiles fine.
- Every `pnpm test:smoke` run records one failed kid PIN attempt for `TURTLE-1234` (it tests the
  wrong-PIN message). After 5 runs within 15 minutes Lily is rate-limited; wait, or run
  `pnpm db:reset && pnpm db:seed`.
