# Member 1: Parent core, P2 (supplementary)

**Window:** hours 12–18 (about 6 hours). Start **only after the hour-12 checkpoint passes** (the full P1 demo runs on the live URL).
**Owner:** Member 1
**Goal:** by hour 18, parents can log shared child expenses, agree on them, see "who owes whom", see a **shared spending-by-category chart** on the dashboard, and keep important documents in a **document vault**.

**Feature freeze is at hour 18.** After that, bug fixes only.

---

## 0. Ground truth (what's on main now; verify before coding)

| Thing             | Real state (from P1 and the other members' reports)                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guards            | `requireParent(event)` returns `{ user, member }`; 401/403 on `/api/*`, redirect on pages                                                                                                                                                |
| Member            | `member_id`, `family_id`, `family_name`, `display_name`, `role`, `home ('A'/'B')` via `locals.getMember()`                                                                                                                               |
| Forms             | `parseForm()` / `formFailure()` with Zod; `logAudit()` (service role, ids only)                                                                                                                                                          |
| Time zone         | The tz cookie plus `zonedToUtc()` / helpers from P1; insight weeks stay UTC                                                                                                                                                              |
| `expenses` table  | Backbone columns (verify): `id, family_id, paid_by, amount_cents, category, receipt_path, split jsonb, status` (+ maybe `title`, `spent_on`, `note`). **Check the real columns, check constraints (category and status values) and RLS** |
| Storage           | Member 3 created the private bucket **`documents`**: PDF/PNG/JPEG, 10 MB, path `{family_id}/...`, select/insert for parents of that family only, **no update/delete**                                                                    |
| `documents` table | `kind, title (not null), storage_path, mime, extracted, uploaded_by`; no delete                                                                                                                                                          |
| Vercel limits     | A function request body is limited to **4.5 MB**: upload files **directly from the browser to Storage**, never through a SvelteKit endpoint. `maxDuration` 60 s is fine                                                                  |
| Dashboard         | Your P1 dashboard (`/dashboard`) still shows simple placeholder cards for spending and my-time. Member 2's `<InsightCard>` replaces the "{child}'s week" card                                                                            |
| PDF import page   | Member 3's `/documents/import-plan` **or** `/plan/import` (confirm which one shipped)                                                                                                                                                    |
| Seed              | Member 2 is changing `scripts/seed.ts` (kid check-ins and wishes). Your seed change must be small and rebased on theirs                                                                                                                  |

---

## 1. What P2 adds to the demo

| Moment                    | What judges see                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dad's dashboard           | A **Spending** card: this month by category (School, Activities, Entertainment, Medical…), the same for both parents, plus "Alex owes you $42.50"                           |
| (Optional, 20 s) Expenses | Mom logs "Zoo tickets $38, Entertainment, 50/50" with a receipt photo → Dad sees it live and taps **Approve** → the balance updates                                         |
| (Pitch, "Does it work?")  | The Documents page shows the parenting plan, a school letter and an insurance card, each opened with a secure link; "Import a parenting plan" leads to Member 3's AI import |

**Priority order:** Expenses (core) → Balance → Spending chart → Document vault → Receipt upload polish.

---

## 2. Scope

### In scope (P2)

1. **Expenses** (`/expenses`): log, list, filter, approve / dispute / cancel, mark as reimbursed, receipt upload and view
2. **Balance:** "who owes whom" from approved, not-yet-reimbursed expenses
3. **Spending analytics:** DB view `v_spending_by_category` + `<SpendingChart>` on the dashboard (shared, identical for both parents)
4. **Document vault** (`/documents`): upload, list by type, open with a short-lived signed link, link to the PDF import
5. Small seed additions so the chart looks full in the demo

### Out of scope

- Real money transfers (Stripe Connect / Venmo): "Mark as reimbursed" only **records** a payment made elsewhere
- Year-end tax report, budget vs actual, overnights per home (after the competition)
- AI receipt reading: only if Member 3 ships `parse-receipt`; otherwise skip it (manual entry is fine)
- Deleting expenses or documents: never; they are records
- **Never build:** comparisons of one parent's spending with the other's, per-parent rankings, or "who spends more" charts (see README → Analytics)

---

## 3. Files you own

```
src/routes/(parent)/expenses/+page.server.ts, +page.svelte
src/routes/(parent)/documents/+page.server.ts, +page.svelte      # replaces the placeholder
src/lib/components/expenses/   ExpenseForm, ExpenseList, ExpenseRow, ExpenseActions, BalanceCard, ReceiptUpload, ReceiptViewer, SplitPicker
src/lib/components/analytics/  SpendingChart.svelte (Member 2 owns MyTimeCard.svelte in the same folder)
src/lib/components/documents/  DocumentUpload, DocumentList, DocumentRow
src/lib/expenses/              money.ts, balance.ts, split.ts (+ *.spec.ts), categories.ts
src/lib/storage/upload.ts      # browser helper: direct upload to the documents bucket (shared helper; you own it)
src/routes/(parent)/dashboard/ # only to replace the placeholder spending card with <SpendingChart>
supabase/migrations/<ts>_expenses_flow.sql      # via `supabase migration new expenses_flow`
supabase/migrations/<ts>_spending_view.sql      # via `supabase migration new spending_view`
scripts/seed.ts                                  # minimal additions only (shared; coordinate with Member 2)
```

Don't edit: guards, hooks, realtime, llm/ai files, Member 2's kid pages/insights, Member 3's plan/import pages, the storage bucket migration (Member 3's; add a new migration if something must change and tell them).

---

## 4. Feature specs

### 4.1 Expenses (`/expenses`)

**Categories** (match the DB check constraint; add the missing ones in your migration if needed): `school`, `medical`, `activities`, `entertainment`, `clothing`, `childcare`, `food`, `travel`, `other`. Each has a label and an icon; never colour alone.

**Log an expense** (`ExpenseForm` in a dialog, form action `?/create`):

- Title (1–80), amount (> 0, ≤ $10,000, entered as dollars and stored as **integer cents**; never floats), date spent (not in the future, not more than 1 year back), category, child, optional note (≤ 280).
- **Split** (`SplitPicker`): 50/50 (default), 60/40, 70/30, 100% the other parent, 100% me (logged for the record only), or custom % (0–100). Stored in `split` as `{ "payer_share_pct": 50, "other_share_pct": 50 }` (adapt to the real shape; document it).
- **Receipt (optional):** see 4.4.
- Created with `status = 'pending'` when the other parent owes anything, otherwise `'approved'`.
- Audit `expense.created`. Live update for the other parent.

**List** (`ExpenseList`): month filter (current month default), category filter, status filter (All / Needs your OK / Pending / Approved / Reimbursed / Disputed). Each row: date, title, category chip, amount, who paid (display name), split, the other parent's share, status badge (text + icon), receipt icon if attached.

**Actions** (`ExpenseActions`); who can do what:

| Status                    | Payer (who logged it)                                                                                  | Other parent                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `pending`                 | **Cancel**                                                                                             | **Approve** / **Dispute** (note required, 5–280 chars)           |
| `disputed`                | **Cancel**, or **Re-submit** (creates a new expense with an edited amount/split and links the old one) | —                                                                |
| `approved`                | —                                                                                                      | **Mark as reimbursed** (the owing parent records that they paid) |
| `reimbursed`, `cancelled` | final                                                                                                  | final                                                            |

Nothing is ever edited in place or deleted.

**All status changes go through one DB function** (`supabase migration new expenses_flow`), like `respond_to_swap`:

```
respond_to_expense(p_expense_id uuid, p_action text, p_note text default null) returns expenses
-- actions: approve | dispute | cancel | reimburse
-- checks: caller is a parent of the family; approve/dispute/reimburse only by the NON-payer;
--         cancel only by the payer; only valid transitions from the table above; locks the row (FOR UPDATE)
-- writes audit_log (actor_member_id) inside the function
-- security definer, set search_path = public; revoke from public/anon; grant to authenticated
```

In the same migration, **remove any RLS policy that lets parents UPDATE expenses directly** (status changes only through the function; same pattern as swaps). Keep insert for parents of the family with `paid_by` = the caller and `status` in (`pending`, `approved`). Add `expenses` to the Realtime publication if it's missing. Add a `test-rls` line (or a small script in your folder): the payer can't approve their own expense; a direct UPDATE is refused; an invalid transition is refused.

**Dispute note tone:** run the note through Member 3's `POST /api/ai/rewrite` like a message (same dialog, never blocking).

### 4.2 Balance (`BalanceCard`, on `/expenses` and the dashboard)

- Pure function in `src/lib/expenses/balance.ts` (unit-tested): from **approved, not reimbursed** expenses, compute the net amount and direction, e.g. "Alex owes you $42.50", "You owe Alex $12.00" or "All settled ✓".
- Shows the count of items behind it and links to them (filter Approved).
- Cents math only; round half away from zero once at the end; tests for 33.33% splits, 100% splits and many items.
- Wording stays neutral and factual: no "Alex is behind on payments" style text.

### 4.3 Spending analytics (`SpendingChart`, shared)

**View** (`supabase migration new spending_view`):

```sql
create view public.v_spending_by_category with (security_invoker = true) as
select family_id,
       date_trunc('month', spent_on)::date as month,      -- use the real date column
       category,
       sum(amount_cents)::bigint as total_cents,
       count(*) as items
from public.expenses
where status in ('pending','approved','reimbursed')       -- exclude cancelled and disputed
group by family_id, date_trunc('month', spent_on), category;
```

`security_invoker = true` makes the view respect the RLS on `expenses`, so a parent sees only their family. Add a check to the RLS test: Carter parents see only Carter rows.

**Component** `<SpendingChart familyId? />` on the dashboard (replaces the placeholder spending card) and at the top of `/expenses`:

- Default: **this month by category** as horizontal bars (largest first) with the amount label on each bar, plus the month total. A toggle shows **the last 3 months** as small grouped bars or a simple per-month total.
- Pure **SVG + Svelte, no chart library** (ask before adding any package). Accessible: each bar has a text label and amount; the chart has an `aria-label`, and a visually hidden table holds the same numbers.
- Identical for both parents: **no split by who paid** and no per-parent totals.
- Empty state: "No expenses logged this month. Add one on Expenses."
- The BalanceCard sits next to it on the dashboard.
- Live: refresh when `expenses` changes (debounced).

### 4.4 Uploads (receipts and documents): direct to Storage

`src/lib/storage/upload.ts` (browser):

- Validates **before** upload: type (PDF, PNG, JPEG), size ≤ 10 MB.
- Uploads with `getSupabaseBrowserClient().storage.from('documents').upload(path, file)` to `{family_id}/receipts/{uuid}.{ext}` or `{family_id}/docs/{uuid}.{ext}`. Uploads never go through a SvelteKit endpoint (Vercel's 4.5 MB limit).
- Returns the path; the form action then stores it (`expenses.receipt_path` or a `documents` row).
- The server action **re-checks** that the path starts with the caller's `family_id/`, that the object exists, and checks its MIME/magic bytes (`%PDF`, PNG and JPEG signatures). If the check fails, delete the object with the admin client and reject. Share one server helper `verifyUploadedObject(path, familyId)` in `src/lib/server/storageVerify.ts` (you own it; tell Member 3 so their import can reuse it).
- Viewing: a server-generated **signed URL, valid 60 seconds**, created on click (`?/signedUrl` action or a small endpoint). Never public URLs.
- An image receipt is shown in a dialog; a PDF opens in a new tab.

### 4.5 Document vault (`/documents`)

- **Types** (`documents.kind`, match the check constraint): `parenting_plan`, `court_order`, `school`, `medical`, `insurance`, `id_travel`, `receipt` (optional), `other`.
- **Upload** (`DocumentUpload`): pick a file (PDF/PNG/JPEG ≤ 10 MB) → title (default: file name, 1–80) → type → direct upload (4.4) → `?/register` inserts a `documents` row (`uploaded_by` = me) → audit `document.uploaded`.
- **List** (`DocumentList`): grouped by type, newest first; title, type chip, uploaded by (display name), date, file type icon, **Open** (signed URL). Both parents see the same list. **No delete or rename** ("Documents are kept as a record").
- **Import a parenting plan** button → Member 3's import page (use the route that actually shipped).
- If a `documents` row has `extracted` data (from the AI import), show a small "Read by AI ✓" badge.
- Search/filter by type and text (client-side is fine).
- Children never see this page (the `(parent)` guard plus storage policies).

### 4.6 Seed additions (minimal; coordinate with Member 2)

Add about **15 expenses over the last 3 months** across categories (school, activities, **entertainment**, medical, clothing), with a mix of statuses (mostly approved, 2 pending, 1 reimbursed, 1 disputed), so the chart and balance look real. Dates relative to today, never in the future. Add 2–3 `documents` rows **only if** you also upload real sample files (otherwise skip; broken "Open" links look bad). Rebase on Member 2's seed changes first; keep the diff small; tell the team to run `pnpm db:reset && pnpm db:seed`.

---

## 5. Security and privacy checklist

- [ ] `requireParent(event)` on every load/action; `locals.supabase` for user data (RLS).
- [ ] Zod on every input; money in integer cents; dates validated; uuids validated.
- [ ] Expense status changes **only** through `respond_to_expense`; direct UPDATE refused by RLS.
- [ ] Uploads go browser → Storage; the server verifies path, existence and magic bytes; bad files are deleted.
- [ ] Signed URLs only (60 s); no public bucket URLs; never log file contents or names of children in logs.
- [ ] No delete/edit of expenses or documents.
- [ ] The spending view uses `security_invoker = true`; the RLS test proves family isolation.
- [ ] No per-parent comparison charts or rankings anywhere.
- [ ] Every write is audited (ids only in the audit metadata).

---

## 6. Hour-by-hour plan

| Hour        | Branch                | Deliverable                                                                                                   | Merge?            |
| ----------- | --------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------- |
| 12:00–12:20 | —                     | Read main, verify the expenses/documents schema, post the plan to the team                                    | —                 |
| 12:20–14:30 | `feat/expenses`       | Migration `expenses_flow`, create/list/filter, actions via the DB function, balance (pure + tested), Realtime | ✅ Merge at 14:30 |
| 14:30–15:30 | `feat/spending-chart` | Migration `spending_view`, `SpendingChart` + `BalanceCard` on the dashboard and `/expenses`, seed expenses    | ✅ Merge at 15:30 |
| 15:30–17:15 | `feat/documents`      | `upload.ts` + `storageVerify.ts`, receipts on expenses, the document vault, signed URLs                       | ✅ Merge at 17:15 |
| 17:15–18:00 | —                     | Live run with both parents on the deployed URL; fix bugs; **feature freeze at 18:00**                         | Checkpoint        |

**If behind at hour 16, cut in this order:** document vault search → re-submit after dispute (cancel + new expense is enough) → 3-month toggle on the chart → receipt upload (keep the vault). **Never cut:** the spending chart and balance on the dashboard.

---

## 7. Testing

**Automated (Vitest, next to the code):** `money.ts` (parse "$12.5" → 1250, format), `split.ts` (all presets, custom %, rounding), `balance.ts` (directions, settled, 33.33% splits, reimbursed excluded, cancelled/disputed excluded), category list integrity, upload validation (type/size).
**RLS / DB:** the payer can't approve their own expense; direct UPDATE refused; invalid transitions refused; the other family can't read expenses, the view or storage objects; a child can't read expenses/documents.
**Manual (Mom and Dad in two browser windows, 1280–1440 px):**

1. Mom logs "Zoo tickets $38, Entertainment, 50/50" with a JPEG receipt → Dad sees it live in "Needs your OK" → Approve → both balances show "Alex owes you $19.00" / "You owe Dana $19.00".
2. Dad disputes another expense with an angry note → the tone dialog appears → the calm note is saved.
3. Dad marks an approved expense as reimbursed → the balance updates on both screens.
4. The dashboard chart shows this month by category, identical for both; the 3-month toggle works.
5. Upload a 12 MB file → refused before upload; upload a renamed .exe as .pdf → refused and deleted by the server check.
6. Documents: upload a PDF and a PNG → both open via signed links; the links expire after a minute; "Import a parenting plan" opens Member 3's page.

---

## 8. Definition of done (hour 18)

- [ ] On the **live URL**: expenses (log, approve, dispute, reimburse), balance, spending chart on the dashboard, and the document vault all work for both parents with live updates.
- [ ] Status changes only through the DB function; uploads verified; signed URLs only; no deletes.
- [ ] No parent-vs-parent comparisons anywhere.
- [ ] All checks pass (`format`, `check`, `lint`, `test`, `test:rls`, `build` on Linux/Vercel); branches merged; the team told about the new migrations, the seed change and `storageVerify.ts`.
