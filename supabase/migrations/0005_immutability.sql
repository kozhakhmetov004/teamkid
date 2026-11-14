-- 0005_immutability.sql
-- Messages and the audit log are court-grade records:
--   * messages can never be deleted; the only allowed update is setting
--     first_read_at once (null -> timestamp)
--   * every message is hash-chained to the previous one in its thread
--   * audit_log rows can never be updated or deleted
-- Triggers apply to EVERY role, including the service role.

-- ---------------------------------------------------------------------------
-- messages: family_id comes from the thread (can't be spoofed)
-- ---------------------------------------------------------------------------
create or replace function public.messages_set_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	select t.family_id into new.family_id from public.threads t where t.id = new.thread_id;
	if new.family_id is null then
		raise exception 'unknown thread %', new.thread_id using errcode = '23503';
	end if;
	return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- messages: hash chain
--   hash = sha256( coalesce(prev_hash,'') || sender_id || body || created_at_utc )
--   created_at_utc = to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
-- A per-thread advisory lock serialises inserts so the chain can't fork, and
-- created_at is set server-side (clock_timestamp) so it can't be back-dated.
-- ---------------------------------------------------------------------------
create or replace function public.messages_hash_chain()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
	v_prev text;
begin
	perform pg_advisory_xact_lock(hashtextextended('messages:' || new.thread_id::text, 0));
	new.created_at := clock_timestamp();
	new.first_read_at := null;
	select m.hash into v_prev
		from public.messages m
		where m.thread_id = new.thread_id
		order by m.created_at desc, m.id desc
		limit 1;
	new.prev_hash := v_prev;
	new.hash := encode(
		extensions.digest(
			coalesce(v_prev, '')
				|| new.sender_id::text
				|| new.body
				|| to_char(new.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
			'sha256'
		),
		'hex'
	);
	return new;
end;
$$;

-- Triggers fire in name order: family first, then hash.
create trigger messages_10_set_family before insert on public.messages
	for each row execute function public.messages_set_family();
create trigger messages_20_hash_chain before insert on public.messages
	for each row execute function public.messages_hash_chain();

-- ---------------------------------------------------------------------------
-- messages: block delete; allow only first_read_at null -> value
-- ---------------------------------------------------------------------------
create or replace function public.messages_guard()
returns trigger
language plpgsql
as $$
begin
	if tg_op = 'DELETE' then
		raise exception 'messages are immutable and cannot be deleted' using errcode = '42501';
	end if;
	if (to_jsonb(new) - 'first_read_at') is distinct from (to_jsonb(old) - 'first_read_at') then
		raise exception 'messages are immutable; only first_read_at can be set' using errcode = '42501';
	end if;
	if old.first_read_at is not null then
		raise exception 'first_read_at is already set' using errcode = '42501';
	end if;
	if new.first_read_at is null then
		raise exception 'first_read_at can only be set to a timestamp' using errcode = '42501';
	end if;
	return new;
end;
$$;

create trigger messages_immutable before update or delete on public.messages
	for each row execute function public.messages_guard();

-- Truncate would bypass row triggers.
create or replace function public.raise_immutable_table()
returns trigger
language plpgsql
as $$
begin
	raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;

create trigger messages_no_truncate before truncate on public.messages
	for each statement execute function public.raise_immutable_table();

-- ---------------------------------------------------------------------------
-- audit_log: append-only
-- ---------------------------------------------------------------------------
create trigger audit_log_no_update_delete before update or delete on public.audit_log
	for each row execute function public.raise_immutable_table();
create trigger audit_log_no_truncate before truncate on public.audit_log
	for each statement execute function public.raise_immutable_table();

revoke execute on function public.messages_set_family() from public, anon, authenticated;
revoke execute on function public.messages_hash_chain() from public, anon, authenticated;
revoke execute on function public.messages_guard() from public, anon, authenticated;
revoke execute on function public.raise_immutable_table() from public, anon, authenticated;
