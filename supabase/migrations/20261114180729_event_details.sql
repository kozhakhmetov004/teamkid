-- event_details (Member 1, feat/today)
-- Adds what the Today page and calendar need on events:
--   kind  : what the event is. 'custody' rows are the nightly custody blocks
--           (which home the child sleeps in); they change only through swaps.
--   place : where (e.g. "Oakwood Elementary")
--   notes : free text
-- Every insert into events should set `kind` (default 'activity').

alter table public.events
	add column kind text not null default 'activity',
	add column place text,
	add column notes text;

alter table public.events
	add constraint events_kind_check
		check (kind in ('custody', 'school', 'activity', 'medical', 'handover', 'other')),
	add constraint events_place_length check (place is null or char_length(place) <= 200),
	add constraint events_notes_length check (notes is null or char_length(notes) <= 2000),
	-- a custody block always says which home
	add constraint events_custody_has_home check (kind <> 'custody' or home is not null);

-- Existing nightly blocks created before this migration (local data only).
update public.events
set kind = 'custody'
where home is not null and title ilike 'Night at %';

create index events_family_kind_starts_idx on public.events (family_id, kind, starts_at);
