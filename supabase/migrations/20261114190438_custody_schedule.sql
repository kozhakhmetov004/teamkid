-- custody_schedule (Member 1, feat/calendar-template)
-- replace_custody_schedule(): saves a custody template and replaces FUTURE
-- custody nights with the given blocks, atomically. Past nights are kept.
-- The blocks are computed in TypeScript (src/lib/custody/pattern.ts:
-- generateNights + nightsToBlocks) so the same code serves the "Set up
-- schedule" form and, later, the parenting-plan PDF import (p_source 'plan_pdf').

create or replace function public.replace_custody_schedule(
	p_family_id uuid,
	p_template text,
	p_start_date date,
	p_exchange_time time,
	p_first_home text,
	p_from timestamptz,
	p_blocks jsonb,
	p_rules jsonb default '{}'::jsonb,
	p_source text default 'manual'
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
	v_me uuid;
	v_child uuid;
	v_schedule uuid;
	v_count int;
begin
	if auth.uid() is null then
		raise exception 'Not signed in' using errcode = '28000';
	end if;
	v_me := public.parent_member_in_family(p_family_id);
	if v_me is null then
		raise exception 'Not allowed' using errcode = '42501';
	end if;
	if p_template not in ('2-2-3', 'week_on_week_off', 'alternate_weekends', 'custom') then
		raise exception 'Unknown template %', p_template using errcode = '22023';
	end if;
	if p_first_home not in ('A', 'B') then
		raise exception 'First home must be A or B' using errcode = '22023';
	end if;
	if p_source not in ('manual', 'plan_pdf', 'planner') then
		raise exception 'Unknown source %', p_source using errcode = '22023';
	end if;
	if jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) > 400 then
		raise exception 'Blocks must be an array of at most 400 nights' using errcode = '22023';
	end if;

	select c.id into v_child from public.children c
	where c.family_id = p_family_id order by c.created_at limit 1;

	delete from public.events
	where family_id = p_family_id and kind = 'custody' and starts_at >= p_from;

	insert into public.events (family_id, child_id, title, starts_at, ends_at, home, kind, source, created_by)
	select
		p_family_id,
		v_child,
		'Night at ' || coalesce((
			select m.display_name || '''s' from public.members m
			where m.family_id = p_family_id and m.role = 'parent' and m.home = b.home
			limit 1
		), 'home ' || b.home),
		b.starts_at,
		b.ends_at,
		b.home,
		'custody',
		p_source,
		v_me
	from jsonb_to_recordset(p_blocks) as b(starts_at timestamptz, ends_at timestamptz, home text)
	where b.starts_at >= p_from;
	get diagnostics v_count = row_count;

	insert into public.custody_schedules (family_id, child_id, template, start_date, exchange_time, rules, created_by)
	values (
		p_family_id, v_child, p_template, p_start_date, p_exchange_time,
		coalesce(p_rules, '{}'::jsonb) || jsonb_build_object('first_home', p_first_home),
		v_me
	)
	returning id into v_schedule;

	insert into public.audit_log (family_id, actor_member_id, action, entity, entity_id, meta)
	values (p_family_id, v_me, 'custody.schedule_set', 'custody_schedules', v_schedule,
		jsonb_build_object('nights', v_count, 'template', p_template));
	return v_schedule;
end;
$$;

revoke execute on function public.replace_custody_schedule(uuid, text, date, time, text, timestamptz, jsonb, jsonb, text) from public, anon;
grant execute on function public.replace_custody_schedule(uuid, text, date, time, text, timestamptz, jsonb, jsonb, text) to authenticated, service_role;
