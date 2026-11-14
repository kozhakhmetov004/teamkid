-- safety_alerts_realtime (Member 3, P2: crisis demo)
-- Both parents see a child's "I need a grown-up" alert live on Today.
-- Realtime postgres_changes respects RLS (alerts_select_parent: parents of the family).
-- Alerts hold level + category only, never the child's words.

alter publication supabase_realtime add table public.safety_alerts;

-- Parents may only mark an alert resolved; nothing else on the row can change.
revoke update on public.safety_alerts from authenticated;
grant update (resolved_at, resolved_by) on public.safety_alerts to authenticated;
