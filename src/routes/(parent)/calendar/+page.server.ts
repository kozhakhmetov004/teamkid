/**
 * Calendar: week (default) / month views, custody nights per home, events,
 * add/edit events, and the custody schedule setup (template -> 12 weeks).
 * Custody nights are read-only here; they change through swaps or the
 * schedule setup (security-definer DB functions).
 */
import { z } from 'zod';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { peopleFor } from '#lib/custody/people.js';
import {
	DB_TEMPLATE,
	generateNights,
	nightsToBlocks,
	TEMPLATE_LABEL,
	type Template
} from '#lib/custody/pattern.js';
import {
	addMonths,
	DATE_RE,
	daysBetween,
	isDateString,
	localTime,
	mondayOf,
	monthStart,
	monthTitle,
	TIME_RE,
	weekTitle,
	zonedToUtc
} from '#lib/custody/time.js';
import {
	addDays,
	localDate,
	nightsByDate,
	safeTimeZone,
	shortDate,
	timeLabel,
	weekdayShort,
	type Home
} from '#lib/custody/today.js';
import type { CalDay, SwapView } from '#lib/components/calendar/types.js';
import type { Actions, PageServerLoad } from './$types';

const SWAP_WINDOW_DAYS = 60;
const SCHEDULE_WEEKS = 12;

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	event.depends('app:calendar');
	const tz = safeTimeZone(event.cookies.get('tz'));
	const today = localDate(new Date(), tz);
	const view = event.url.searchParams.get('view') === 'month' ? 'month' : 'week';
	const dateParam = event.url.searchParams.get('date');
	const anchor = isDateString(dateParam) ? dateParam : today;

	const start = view === 'week' ? mondayOf(anchor) : mondayOf(monthStart(anchor));
	const monthEnd = addDays(addMonths(monthStart(anchor), 1), -1);
	const dayCount = view === 'week' ? 7 : Math.ceil((daysBetween(start, monthEnd) + 1) / 7) * 7;
	const from = zonedToUtc(start, '00:00', tz).toISOString();
	const to = zonedToUtc(addDays(start, dayCount), '00:00', tz).toISOString();

	const sb = event.locals.supabase;
	const [events, parents, children, swaps, schedule] = await Promise.all([
		sb
			.from('events')
			.select('id, title, starts_at, ends_at, home, kind, place, notes, child_id')
			.eq('family_id', member.family_id)
			.gte('starts_at', from)
			.lt('starts_at', to)
			.order('starts_at'),
		sb
			.from('members')
			.select('id, display_name, home')
			.eq('family_id', member.family_id)
			.eq('role', 'parent'),
		sb
			.from('children')
			.select('id, first_name')
			.eq('family_id', member.family_id)
			.order('created_at'),
		sb
			.from('swap_requests')
			.select('id, requested_by, original_date, proposed_date, note')
			.eq('family_id', member.family_id)
			.eq('status', 'pending')
			.order('created_at'),
		sb
			.from('custody_schedules')
			.select('template, start_date, exchange_time, rules')
			.eq('family_id', member.family_id)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle()
	]);

	const people = peopleFor(parents.data ?? [], member);
	const rows = events.data ?? [];
	const custody = rows.filter((e) => e.kind === 'custody' && e.home);
	const nights = nightsByDate(
		custody.map((e) => ({ starts_at: e.starts_at, ends_at: e.ends_at, home: e.home as Home })),
		tz
	);
	const swapDates = new Set(
		(swaps.data ?? []).flatMap(
			(s) => [s.original_date, s.proposed_date].filter(Boolean) as string[]
		)
	);
	const others = rows.filter((e) => e.kind !== 'custody');

	const days: CalDay[] = Array.from({ length: dayCount }, (_, i) => {
		const date = addDays(start, i);
		const home = nights.get(date) ?? null;
		return {
			date,
			weekday: weekdayShort(date),
			dayOfMonth: Number(date.slice(8, 10)),
			isToday: date === today,
			isPast: date < today,
			inMonth: view === 'week' || date.slice(0, 7) === anchor.slice(0, 7),
			label: home ? people.nameOfHome(home) : 'Not set',
			mine: home ? home === member.home : null,
			pendingSwap: swapDates.has(date),
			events: others
				.filter((e) => localDate(e.starts_at, tz) === date)
				.map((e) => ({
					id: e.id,
					title: e.title,
					kind: e.kind,
					place: e.place,
					notes: e.notes,
					childId: e.child_id,
					time: timeLabel(e.starts_at, tz),
					date,
					start: localTime(e.starts_at, tz),
					end: localTime(e.ends_at, tz)
				}))
		};
	});

	const swapViews: SwapView[] = (swaps.data ?? []).map((s) => ({
		id: s.id,
		fromMe: s.requested_by === member.member_id,
		requester: people.nameById(s.requested_by),
		original: shortDate(s.original_date),
		proposed: s.proposed_date ? shortDate(s.proposed_date) : null,
		originalDate: s.original_date,
		proposedDate: s.proposed_date,
		note: s.note
	}));

	const step = (delta: number) =>
		view === 'week' ? addDays(anchor, 7 * delta) : addMonths(anchor, delta);
	const firstHome =
		(schedule.data?.rules as { first_home?: string } | null)?.first_home ?? member.home ?? 'A';
	const templateFromDb = (Object.entries(DB_TEMPLATE).find(
		([, v]) => v === schedule.data?.template
	)?.[0] ?? '2-2-3') as Template;

	return {
		view,
		anchor,
		today,
		title: view === 'week' ? weekTitle(start) : monthTitle(anchor),
		prev: step(-1),
		next: step(1),
		days,
		swaps: swapViews,
		otherName: people.otherName,
		canSwap: people.other !== null && !!member.home,
		swapWindow: { min: today, max: addDays(today, SWAP_WINDOW_DAYS) },
		children: children.data ?? [],
		schedule: {
			defaults: {
				template: templateFromDb,
				startDate: mondayOf(today),
				exchangeTime: schedule.data?.exchange_time?.slice(0, 5) ?? '17:00',
				firstHome
			},
			homes: (['A', 'B'] as const).map((h) => ({ home: h, name: people.nameOfHome(h) })),
			templates: (Object.keys(TEMPLATE_LABEL) as Template[]).map((t) => ({
				value: t,
				label: TEMPLATE_LABEL[t]
			}))
		}
	};
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((v) => (v ? v : null));

const EventFields = z
	.object({
		title: z.string().trim().min(1, 'Give the event a title').max(200),
		date: z.string().regex(DATE_RE, 'Pick a date'),
		start: z.string().regex(TIME_RE, 'Pick a start time'),
		end: z.string().regex(TIME_RE, 'Pick an end time'),
		kind: z.enum(['school', 'activity', 'medical', 'handover', 'other']),
		place: optionalText(200),
		notes: optionalText(2000),
		childId: z
			.string()
			.optional()
			.transform((v) => (v ? v : null))
			.pipe(z.uuid().nullable())
	})
	.refine((v) => v.end > v.start, { path: ['end'], message: 'End must be after the start' });

const UpdateEvent = z.intersection(EventFields, z.object({ id: z.uuid() }));

const Schedule = z.object({
	template: z.enum(['2-2-3', 'week-on-week-off', 'alternate-weekends']),
	startDate: z.string().regex(DATE_RE, 'Pick a start date'),
	firstHome: z.enum(['A', 'B']),
	exchangeTime: z.string().regex(TIME_RE, 'Pick the exchange time')
});

/** Validates that the child belongs to this family (RLS returns only own children). */
async function childOk(sb: App.Locals['supabase'], childId: string | null): Promise<boolean> {
	if (!childId) return true;
	const { data } = await sb.from('children').select('id').eq('id', childId).maybeSingle();
	return !!data;
}

export const actions: Actions = {
	createEvent: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, EventFields, 'event');
		if (!parsed.ok) return parsed.failure;
		const v = parsed.data;
		const tz = safeTimeZone(event.cookies.get('tz'));
		const sb = event.locals.supabase;
		if (!(await childOk(sb, v.childId))) return formFailure('event', 'Unknown child', 400);

		const { data, error } = await sb
			.from('events')
			.insert({
				family_id: member.family_id,
				child_id: v.childId,
				title: v.title,
				starts_at: zonedToUtc(v.date, v.start, tz).toISOString(),
				ends_at: zonedToUtc(v.date, v.end, tz).toISOString(),
				kind: v.kind,
				place: v.place,
				notes: v.notes,
				home: null,
				source: 'manual',
				created_by: member.member_id
			})
			.select('id')
			.single();
		if (error || !data)
			return formFailure('event', 'Could not add the event. Please try again.', 500);
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'event.created',
			entity: 'events',
			entityId: data.id
		});
		return { form: 'event', ok: true };
	},

	updateEvent: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, UpdateEvent, 'event');
		if (!parsed.ok) return parsed.failure;
		const v = parsed.data;
		const tz = safeTimeZone(event.cookies.get('tz'));
		const sb = event.locals.supabase;
		if (!(await childOk(sb, v.childId))) return formFailure('event', 'Unknown child', 400);

		// RLS only allows updating non-custody events of this family.
		const { data, error } = await sb
			.from('events')
			.update({
				child_id: v.childId,
				title: v.title,
				starts_at: zonedToUtc(v.date, v.start, tz).toISOString(),
				ends_at: zonedToUtc(v.date, v.end, tz).toISOString(),
				kind: v.kind,
				place: v.place,
				notes: v.notes
			})
			.eq('id', v.id)
			.neq('kind', 'custody')
			.select('id');
		if (error) return formFailure('event', 'Could not save the event. Please try again.', 500);
		if (!data?.length) return formFailure('event', "This event can't be edited here.", 404);
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'event.updated',
			entity: 'events',
			entityId: v.id
		});
		return { form: 'event', ok: true };
	},

	setupSchedule: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, Schedule, 'schedule');
		if (!parsed.ok) return parsed.failure;
		const v = parsed.data;
		const tz = safeTimeZone(event.cookies.get('tz'));
		const today = localDate(new Date(), tz);
		if (v.startDate < addDays(today, -30) || v.startDate > addDays(today, 365)) {
			return formFailure('schedule', 'Pick a start date within the last month or the next year.');
		}

		const nights = generateNights(v.template, v.startDate, v.firstHome, SCHEDULE_WEEKS * 7);
		const blocks = nightsToBlocks(nights, v.exchangeTime, tz);
		const startInstant = zonedToUtc(v.startDate, v.exchangeTime, tz);
		const fromInstant = new Date(Math.max(Date.now(), startInstant.getTime()));

		const { error } = await event.locals.supabase.rpc('replace_custody_schedule', {
			p_family_id: member.family_id,
			p_template: DB_TEMPLATE[v.template],
			p_start_date: v.startDate,
			p_exchange_time: v.exchangeTime,
			p_first_home: v.firstHome,
			p_from: fromInstant.toISOString(),
			p_blocks: blocks,
			p_rules: { tz }
		});
		if (error)
			return formFailure('schedule', 'Could not save the schedule. Please try again.', 500);
		// replace_custody_schedule writes the audit log row itself (same transaction).
		return {
			form: 'schedule',
			ok: true,
			message: `Schedule saved: ${TEMPLATE_LABEL[v.template]} from ${shortDate(v.startDate)}.`
		};
	}
};
