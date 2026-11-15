-- pond_game (kids' space gamification: "Pond Pairs" + pond friends collection)
-- Progress lives on the child's own pet_state row, so the existing RLS applies:
-- ONLY the child reads/writes it, parents never see it (no parent analytics on play).
-- Shape (validated in src/lib/kids/pond.ts):
--   { "friends": [{"key": "frog", "on": "2026-11-15"}],
--     "day": "2026-11-15", "played": 2, "best": {"1": 3, "2": 2} }

alter table public.pet_state
	add column pond jsonb not null default '{}'::jsonb
	check (jsonb_typeof(pond) = 'object');
