-- "Lily's week": a one-line AI summary for parents (owner: Member 2).
-- Built by the server from SHARED labels/themes + the mood trend only
-- (never raw clicks or typed words). ai_line_key = hash of those inputs, so
-- the AI runs again only when what is shared actually changes.
alter table public.weekly_insights
	add column ai_line text check (char_length(ai_line) <= 160),
	add column ai_line_key text check (char_length(ai_line_key) <= 64);
