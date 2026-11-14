# CLAUDE.md – TeamKid

Read README.md for product, architecture, data model and safety rules.

## Ownership (do not edit other areas without asking the user)

- Member 1: src/routes/(parent)/{calendar,messages,expenses,documents}, src/lib/components/{calendar,messages,expenses}
- Member 1 (landing): src/routes/(marketing)/** (public /, /privacy, /terms), src/lib/components/landing/**, static/landing/**
- Member 1 (P2): src/lib/expenses/**, src/lib/storage/upload.ts, src/lib/server/storageVerify.ts (shared helper), src/lib/components/{documents,analytics/SpendingChart.svelte}, src/lib/components/pebble/**
- Member 2: src/routes/(kid)/**, src/lib/components/{kids,insights}, src/lib/components/analytics/MyTimeCard.svelte,
  src/lib/kids/**, src/lib/server/insights/**
- Member 3: src/lib/server/ai/**, src/routes/api/**, src/routes/(parent)/{plan,billing}
- Shared/frozen: hooks.server.ts, src/lib/server/guards.ts, src/lib/server/ai/llm.ts,
  src/lib/realtime.ts, layouts, app.css. Do NOT change these; if a change is needed,
  stop and tell the user to coordinate with the team.

## Rules

- Work only on the current feature branch. Never push to main.
- New DB changes: `supabase migration new <name>`; never edit existing migrations.
- Never hand-edit src/lib/types/database.ts; run `pnpm db:types`.
- Don't add packages without asking the user first.
- Don't reformat or refactor files you weren't asked to touch.
- Keep stub function signatures in src/lib/server/ai/* unchanged unless told.
- Never run commands against the cloud Supabase project (no db push, no reset).
- Before finishing: `pnpm format && pnpm check && pnpm lint && pnpm build`.
- Child-safety rules in README are mandatory.
