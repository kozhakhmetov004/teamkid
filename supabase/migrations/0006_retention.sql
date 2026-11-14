-- 0006_retention.sql
-- Data minimisation: raw kid chat is deleted after 30 days.
-- The function always exists; the daily schedule needs pg_cron (available on
-- Supabase cloud and in the local Supabase image). If pg_cron is missing, the
-- schedule is skipped with a notice. See docs/MANUAL_STEPS.md.

create or replace function public.purge_old_kid_chat()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	v_count integer;
begin
	delete from public.kid_chat_raw where created_at < now() - interval '30 days';
	get diagnostics v_count = row_count;
	return v_count;
end;
$$;

revoke execute on function public.purge_old_kid_chat() from public, anon, authenticated;
grant execute on function public.purge_old_kid_chat() to service_role;

do $$
begin
	if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
		create extension if not exists pg_cron;
		-- cron.schedule upserts by job name, so this is safe to re-run.
		perform cron.schedule(
			'purge-kid-chat-raw',
			'15 3 * * *', -- every day at 03:15 UTC
			'select public.purge_old_kid_chat()'
		);
	else
		raise notice 'pg_cron not available: schedule purge_old_kid_chat() manually (see docs/MANUAL_STEPS.md)';
	end if;
end;
$$;
