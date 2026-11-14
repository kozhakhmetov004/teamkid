# Member 1: Parent core, P1 (demo path)

**Window:** hours 5–12 (about 7 hours)
**Owner:** Member 1
**Goal:** by hour 12, on the live URL, a parent can see today and this week, message the co-parent with AI help, and request and accept a custody swap, all updating live on the other parent's screen.

---

## 1. What the demo needs from you

From the demo script (README → Demo script), Member 1 owns everything the judges see on the **parent side**, except the AI logic and the kid insight card:

| Demo moment                                 | What must work                                                                                       | Owner                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Dad opens his **Today** page                | Greeting, who has Lily, this-week strip, today's events, cards for pending swaps and unread messages | **You**                                             |
| Insight card appears live                   | A slot on Today where `<InsightCard>` renders                                                        | Slot: **you** · card: Member 2                      |
| Dad writes an angry message, AI rewrites it | Composer → tone check → "send calm version" → message sent                                           | UI and flow: **you** · `rewriteMessage()`: Member 3 |
| Mom sees the calm message                   | Thread updates live, read receipt appears for Dad                                                    | **You**                                             |
| Mom accepts a swap in one tap               | Swap request card → Accept → calendar changes on both screens                                        | **You**                                             |
| "Plan my weekend"                           | A button/link on Today that goes to `/plan`                                                          | Link: **you** · page: Member 3                      |

**Priority order (build in this order):** Today page → Messages → Swap requests → Calendar views → Calendar editing. The seed data already contains a 2-2-3 schedule and a week of events, so the demo works even if calendar editing is unfinished.

---

## 2. Scope

### In scope (P1)

1. **Today page** (`/today`, the parent home after login)
2. **Messages** (`/messages`, `/messages/[threadId]`): topic threads, immutable messages, read receipts, AI tone check before sending, live updates
3. **Swap requests**: create from the calendar or Today; accept, decline or counter; calendar updates; live updates
4. **Calendar** (`/calendar`): week and month view, custody days shown per home, events list, add or edit a simple event
5. **2-2-3 schedule generator**: create custody blocks from a template (if time allows; the seed covers the demo)

### Out of scope (later or other members)

- Expenses, spending chart, document vault (your P2)
- AI logic itself (Member 3; you call the stubs)
- Kids' space, insight card, "My time with Lily" (Member 2)
- Records PDF export (P3)
- Editing or deleting messages: **never**, by design

---

## 3. Contracts you depend on (do not change without telling the team)

| Contract                                                                                   | Provided by         | Shape                                              | Status at hour 5                                 |
| ------------------------------------------------------------------------------------------ | ------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `requireParent(locals)`                                                                    | Backbone            | throws redirect/401/403                            | Done                                             |
| `locals.supabase`, `locals.safeGetSession()`, `locals.member`                              | Backbone            | see `app.d.ts`                                     | Done                                             |
| `subscribeToFamily(table, familyId, cb)`                                                   | Backbone            | returns `unsubscribe()`                            | Done                                             |
| `logAudit({...})`                                                                          | Backbone            | server only                                        | Done                                             |
| `POST /api/ai/rewrite` → `{ rewritten: string, changed: boolean }`                         | Member 3            | body `{ draft }`                                   | **Stub** returns fake text; real by about hour 9 |
| `<InsightCard childId>`                                                                    | Member 2            | Svelte component in `src/lib/components/insights/` | Stub or placeholder until about hour 10          |
| Tables: `events`, `custody_schedules`, `swap_requests`, `threads`, `messages`, `audit_log` | Backbone migrations | see README → Data model                            | Done                                             |

If the stub's response shape is `{ rewritten }` only, treat `changed` as `rewritten.trim() !== draft.trim()`.

---

## 4. Files you own

```
src/routes/(parent)/
  today/+page.server.ts, +page.svelte
  calendar/+page.server.ts, +page.svelte
  calendar/swap/+page.server.ts            # form actions: create, respond
  messages/+page.server.ts, +page.svelte   # thread list
  messages/[threadId]/+page.server.ts, +page.svelte
src/lib/components/
  today/      TodayHeader, WeekStrip, TodayEvents, NextHandover, PendingSwapsCard, UnreadMessagesCard, DashboardSlot
  calendar/   WeekView, MonthView, DayCell, EventForm, CustodyLegend, SwapRequestDialog, SwapRequestCard
  messages/   ThreadList, ThreadView, MessageBubble, Composer, ToneCheckDialog, ReadReceipt
src/lib/custody/
  pattern.ts        # 2-2-3 and other templates (pure functions)
  pattern.test.ts
src/lib/nav.ts      # add your nav lines only
supabase/migrations/<timestamp>_swap_respond.sql   # DB function for swaps (via `supabase migration new`)
```

**Shared/frozen (don't edit):** `hooks.server.ts`, `guards.ts`, `llm.ts`, `realtime.ts`, layouts, `app.css`. Ask the team first if you need a change.

---

## 5. Feature specs

### 5.1 Today page (`/today`)

Matches the existing dashboard design (dark green sidebar, cream background, "Good morning, Dana").

**Layout (top to bottom):**

1. **Header:** "Good morning, {firstName}" plus the date and custody line: _"Monday, November 14 · Lily is with you through Wednesday"_ or _"Lily is with Alex until Friday 3:15 pm"_.
2. **Briefing card** (green panel with Pebble): for P1, a **rule-based** summary, not AI: who has the child, number of pending swaps, unread messages and today's first event. Example: _"Lily is with you through Wednesday. Alex asked about a weekend swap, and you have 2 unread messages."_ Leave a prop so Member 3 can swap in an AI briefing later.
3. **This week strip:** 7 days, each showing the home that night (colour **and** a text label "You" / "Alex", never colour alone) and dots for events. Clicking a day goes to `/calendar?date=…`.
4. **Today's events list:** time, title, place (e.g. "3:15 School pickup · Oakwood Elementary").
5. **Next handover card:** date, time, place, who drops off. Button: "Request a swap".
6. **Pending swaps card:** each request shows "Alex asks: Sat 19 → Sun 20" with **Accept / Decline / Counter**. Requests you sent show "Waiting for Alex".
7. **Unread messages card:** count and latest snippet; links to the thread.
8. **Slots** (empty containers with fixed layout), so others can drop in components without editing your page logic:
   - `<DashboardSlot name="insights">` → Member 2's `<InsightCard>`
   - `<DashboardSlot name="spending">` → P2
   - `<DashboardSlot name="my-time">` → P2
   - "Plan my weekend" button → `/plan` (Member 3)

**Data loading (`+page.server.ts`):** in one `load`, query in parallel with `Promise.all`:

- the family and members (from `locals.member`)
- events from today to today+6
- pending `swap_requests` (status `pending`)
- the unread count: messages where `sender_id != me` and `first_read_at is null`
- the latest message per thread (limit 3)

**Live updates:** subscribe to `swap_requests` and `messages` for the family; on change, call `invalidate('app:today')`. Unsubscribe on destroy.

**Empty states:** no events ("A quiet day."), no swaps (card hidden), no co-parent yet ("Invite Alex to share the calendar" → `/family`).

### 5.2 Messages (`/messages`, `/messages/[threadId]`)

**Thread list:** topics ("School", "Health", "Schedule", "Money", "General"). The seed has one; allow "New topic". Each row: title, last message snippet, time, unread badge (count plus the text "unread", not a dot alone).

**Thread view:**

- Bubbles: mine on the right, theirs on the left; each shows time sent and, for my messages, **"Read 3:42 pm"** once `first_read_at` is set.
- A small note at the top: _"Messages can't be edited or deleted. They're kept as a record."_
- An "AI-assisted" label on messages where `ai_rewritten = true`. This is honest and shows judges the feature.
- Live: subscribe to `messages` for this thread; new messages appear without a refresh.

**Read receipts:** when the thread opens (and when new messages arrive while it's open), call a form action or endpoint that sets `first_read_at = now()` on messages **from the other parent** where it's null. The immutability trigger allows exactly this update. Don't update your own messages.

**Composer and tone check (the demo moment):**

1. The parent types and presses **Send**.
2. The client calls `POST /api/ai/rewrite` with `{ draft }`, showing a "Checking tone…" state (max 8 s timeout).
3. If `changed` is false, send as is.
4. If `changed` is true, open **ToneCheckDialog**: left "Your message", right "Calmer version" (editable). Buttons: **Send calmer version** (primary), **Edit**, **Send mine anyway**.
5. Send through a **form action** (`?/send`) with `{ threadId, body, aiRewritten }`. Validate with Zod (1–4,000 chars). Insert into `messages`; the DB trigger sets the hash chain. Write `logAudit({ action: 'message.sent' })`.
6. If the AI call fails or times out, show _"Couldn't check tone right now"_ and allow sending normally. **Never block sending on AI.**

> ⚠️ **Privacy decision: do not save the angry draft.** The backbone schema has `original_body`, but RLS lets **both** parents read `messages`, so saving the draft would show the other parent what you almost sent. Always insert `original_body = null` (or drop the column in your migration after telling the team). Save only the sent text and the `ai_rewritten` flag.

**Keyboard and accessibility:** Enter sends, Shift+Enter adds a new line; the dialog traps focus; buttons have clear labels.

### 5.3 Swap requests

**Create:** from Today ("Request a swap") or by clicking a custody day in the calendar → **SwapRequestDialog**:

- "Give Alex: Sat 19 Nov" → "Take instead: Sun 20 Nov" (date pickers limited to the next 60 days)
- optional note (max 280 chars; goes through the same tone check as messages)
- action `?/createSwap` → insert into `swap_requests` (`status = 'pending'`) and audit, then post a system message in the "Schedule" thread: _"Dana requested a swap: Sat 19 → Sun 20."_ This keeps a record in the messages log.

**Respond:** Accept / Decline / Counter (Counter opens the dialog pre-filled and creates a new request linked to the original).

**Accept must be atomic.** Create a Postgres function via `supabase migration new swap_respond`:

```sql
create or replace function respond_to_swap(p_swap_id uuid, p_action text, p_note text default null)
returns swap_requests
language plpgsql security definer set search_path = public as $$
declare s swap_requests;
begin
  select * into s from swap_requests where id = p_swap_id for update;
  if s.status <> 'pending' then raise exception 'Swap already handled'; end if;
  -- caller must be a parent in the family AND not the requester
  if not is_family_parent(s.family_id) or s.requested_by = any(current_member_ids()) then
    raise exception 'Not allowed';
  end if;
  if p_action = 'accept' then
    -- move the custody blocks: swap the `home` value of the custody events on the two dates
    update events set home = case home when 'A' then 'B' else 'A' end
     where family_id = s.family_id and kind = 'custody'
       and starts_at::date in (s.original_date, s.proposed_date);
    update swap_requests set status = 'accepted', responded_at = now() where id = s.id returning * into s;
  elsif p_action = 'decline' then
    update swap_requests set status = 'declined', responded_at = now() where id = s.id returning * into s;
  else
    raise exception 'Unknown action';
  end if;
  insert into audit_log(family_id, actor_id, action, entity, entity_id)
  values (s.family_id, (current_member_ids())[1], 'swap.' || p_action, 'swap_requests', s.id);
  return s;
end $$;
```

> Adjust column names (`kind`, `home`, `requested_by`) to what the backbone migration actually created. If `events` has no `kind` column, mark custody blocks by `source = 'schedule'` instead. **Ask Claude Code to read the migrations first.**

Call it from the form action with `locals.supabase.rpc('respond_to_swap', {...})`, so it runs as the signed-in user and the checks inside apply.

**Live:** both parents' Today and Calendar pages refresh on `swap_requests` and `events` changes.

**Edge cases:**

- You can't respond to your own request (the UI hides the buttons and the DB function refuses).
- A request for a past date is rejected by Zod validation.
- A second Accept click after acceptance gets "Swap already handled" (friendly toast).

### 5.4 Calendar (`/calendar`)

**Views:** week (default on desktop) and month; on mobile, an agenda list. Navigation: previous / today / next; `?date=YYYY-MM-DD` in the URL.

**Each day shows:**

- the custody home for that night: background tint **plus** a label ("With you" / "With Alex"), and a legend
- events: time and title; colour by category (school, activity, medical, handover), always with text

**Add or edit an event** (`EventForm` in a dialog): title, date, start/end time, place, category, child, notes. Form actions `?/createEvent`, `?/updateEvent` (only non-custody events are editable; custody blocks change only through swaps). Validate with Zod; audit log.

**Clicking a custody day** → "Request a swap for this day" → SwapRequestDialog.

### 5.5 2-2-3 schedule generator (stretch for P1)

`src/lib/custody/pattern.ts`, as pure, unit-tested functions:

```ts
export type Template = '2-2-3' | 'week-on-week-off' | 'alternate-weekends';
// Returns which parent ('A' | 'B') has the child each night from start for `days` days
export function generateNights(
	template: Template,
	start: Date,
	firstParent: 'A' | 'B',
	days: number
): { date: string; home: 'A' | 'B' }[];
```

- **2-2-3** over 14 days: `A A B B A A A | B B A A B B B`, then repeat.
- **Week on/week off:** 7 A, 7 B.
- **Alternate weekends:** A on weekdays, B Fri–Sun every other weekend.

A "Set up schedule" form on `/calendar` (template, start date, who starts, exchange time) saves `custody_schedules` and creates custody `events` for the next 12 weeks (delete future custody events first, keep past ones). Member 3's parenting-plan PDF feature will later call the same function with values extracted from the PDF, so **export it and keep its signature stable.**

Tests (`pattern.test.ts`): 2-2-3 repeats every 14 days; each parent gets 7 of 14 nights; the first night belongs to `firstParent`; works across month boundaries and DST changes (use date strings, not local midnight math).

---

## 6. Security checklist (must pass)

- [ ] Every `+page.server.ts` load and action starts with `requireParent(locals)`.
- [ ] All queries use `locals.supabase` (the user's session, RLS applies), **never** the service-role client.
- [ ] Every action input is validated with Zod; IDs are `z.string().uuid()`.
- [ ] No UI or endpoint for editing or deleting messages.
- [ ] No angry draft is stored (`original_body` stays null).
- [ ] Swap accept goes through `respond_to_swap` only.
- [ ] Nothing from kid tables (`mood_checkins`, `kid_chat_raw`, `pet_state`) is queried in your code.
- [ ] Every action writes `logAudit`.

---

## 7. Hour-by-hour plan

| Hour        | Branch                   | Deliverable                                                                                                                          | Merge?                                      |
| ----------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| 5:00–6:15   | `feat/today`             | Today page with real seed data, week strip, slots, live refresh                                                                      | ✅ Merge at 6:15 (unblocks Member 2's slot) |
| 6:15–8:15   | `feat/messages`          | Thread list and view, send, read receipts, realtime, tone-check dialog using the stub                                                | ✅ Merge at 8:15                            |
| 8:15–9:45   | `feat/swaps`             | Create, accept, decline, counter; `respond_to_swap` migration; Today card wired; system message in Schedule thread                   | ✅ Merge at 9:45                            |
| 9:45–11:00  | `feat/calendar`          | Week/month/agenda views, legend, add/edit event, swap from day click                                                                 | ✅ Merge at 11:00                           |
| 11:00–11:30 | `feat/calendar-template` | 2-2-3 generator and tests (skip if behind)                                                                                           | Optional                                    |
| 11:30–12:00 | —                        | Plug in Member 2's `InsightCard` and Member 3's real `/api/ai/rewrite`; run the demo on the live URL with two browsers (Mom and Dad) | Checkpoint                                  |

**If you're behind at hour 10:** skip month view and event editing; keep the week strip, messages and swaps. Those are the demo.

---

## 8. Claude Code prompts (one per branch)

Start each session on a fresh branch from `main`. Paste the prompt, then **review the plan before saying OK**.

**`feat/today`**

> Read CLAUDE.md, README.md and docs/MEMBER1_P1.md section 5.1. Implement the Today page at `src/routes/(parent)/today` with components in `src/lib/components/today/`, matching the existing parent layout and design tokens. Use `locals.supabase` with RLS, `requireParent`, parallel queries, and `subscribeToFamily` for `swap_requests` and `messages` with `invalidate('app:today')`. Add `<DashboardSlot>` placeholders for insights, spending and my-time. Only touch files listed in section 4 plus one line in `src/lib/nav.ts`. Plan first and wait for my OK. Finish with `pnpm format && pnpm check && pnpm lint && pnpm build`.

**`feat/messages`**

> Read CLAUDE.md, README.md and docs/MEMBER1_P1.md section 5.2. Implement threads and messages under `src/routes/(parent)/messages` and `src/lib/components/messages/`. Messages are immutable (DB trigger): no edit/delete UI. Implement read receipts (set `first_read_at` only on the other parent's unread messages), realtime updates, and the tone-check flow calling `POST /api/ai/rewrite` with an 8s timeout that never blocks sending. Never store the original draft (`original_body` must be null). Validate with Zod, write `logAudit`. Plan first and wait for my OK. Run all checks at the end.

**`feat/swaps`**

> Read CLAUDE.md, README.md, the existing migrations in `supabase/migrations`, and docs/MEMBER1_P1.md section 5.3. Create a new migration with `supabase migration new swap_respond` containing `respond_to_swap`, adapted to the real column names. Implement create, accept, decline and counter via form actions, using `locals.supabase.rpc` for responses, plus the SwapRequestDialog and SwapRequestCard components and the system message in the Schedule thread. Add a script or test that proves: the requester can't accept their own swap, and accepting flips the custody nights for both dates. Plan first and wait for my OK. Run `pnpm db:reset && pnpm db:types` and all checks at the end.

**`feat/calendar`**

> Read CLAUDE.md, README.md and docs/MEMBER1_P1.md sections 5.4–5.5. Implement `/calendar` with week, month and a mobile agenda view, custody legend (colour plus text), add/edit for non-custody events, and "request a swap" from a custody day. If time allows, implement `src/lib/custody/pattern.ts` with Vitest tests as specified. Plan first and wait for my OK. Run all checks at the end.

**Before each pull request:**

> Fetch origin/main and rebase this branch. Resolve conflicts keeping both sides; never hand-edit `database.ts` (regenerate it). Run all checks and summarise what changed outside my owned folders, if anything.

---

## 9. Testing

**Automated**

- `pattern.test.ts` (generator)
- A swap test (script or Vitest with two signed-in clients): requester can't accept; the other parent can; nights flip; second accept fails
- Existing `pnpm test:rls` still passes after your migration

**Manual (two browsers: Mom in normal, Dad in private window)**

1. Dad sends "You're late AGAIN. This is ridiculous." → tone dialog → send calmer version → Mom sees it live with the "AI-assisted" label.
2. Mom opens the thread → Dad sees "Read …" appear.
3. Dad requests Sat → Sun → Mom's Today shows the card live → Accept → both calendars flip, and the Schedule thread shows the system message.
4. Try to accept your own request (button hidden; direct call refused).
5. Turn off the AI (bad key) → sending still works with the "couldn't check tone" note.
6. Phone width (390 px): Today and Messages are usable.

---

## 10. Definition of done (hour 12)

- [ ] On the **live Vercel URL**, demo steps 2–4 run end to end with the seed family, in two browsers, with live updates.
- [ ] Today shows real data, the week strip, pending swaps, unread messages and Member 2's insight card in its slot.
- [ ] Messages: immutable, read receipts, AI tone check (real or stub), never blocks sending, no draft stored.
- [ ] Swaps: create, accept, decline and counter work; accept is atomic and audited.
- [ ] Calendar: week view with custody labels and events; adding an event works.
- [ ] All checks pass; every branch is merged to `main`; no edits to frozen files without team agreement.
