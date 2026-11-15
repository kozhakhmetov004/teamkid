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
import { generateNights, PATTERN_TEMPLATES, type PatternTemplate } from '#lib/custody/pattern.js';
import { nightsToBlocks, TEMPLATE_LABEL } from '#lib/custody/schedule.js';
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
	weekdayLong,
	weekdayShort,
	type Home
} from '#lib/custody/today.js';
import type { CalDay, SwapView } from '#lib/components/calendar/types.js';
import { birthdayOn } from '#lib/kids/profile.js';
import { loadPlanPanel } from '#lib/server/planPanel.js';
import { SlotFields, slotProblem } from '#lib/server/plannerSlot.js';
import { decideAdd, pickGiveBack, swapNote } from '#lib/server/planSwap.js';
import { checkNightOwnership, checkSwapDates, postScheduleNote } from './swap/swaps.server.js';
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
	const planPromise = loadPlanPanel(event, member, tz);
	const [events, parents, children, swaps, schedule, profiles] = await Promise.all([
		sb
			.from('events')
			.select('id, title, starts_at, ends_at, home, kind, place, notes, child_id, pending_swap_id')
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
			.maybeSingle(),
		sb.from('child_profiles').select('child_id, birthday').eq('family_id', member.family_id)
	]);

	// 🎂 Birthdays from the child profile (shown highlighted on that day).
	const birthdays = (profiles.data ?? []).flatMap((p) => {
		const name = (children.data ?? []).find((c) => c.id === p.child_id)?.first_name;
		return name && p.birthday ? [{ name, birthday: p.birthday }] : [];
	});

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
			birthday: birthdays.map((b) => birthdayOn(date, b.birthday, b.name)).find(Boolean) ?? null,
			events: others
				.filter((e) => localDate(e.starts_at, tz) === date)
				.map((e) => ({
					id: e.id,
					title: e.title,
					kind: e.kind,
					place: e.place,
					notes: e.notes,
					childId: e.child_id,
					pendingSwap: !!e.pending_swap_id,
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
	const savedTemplate = schedule.data?.template as PatternTemplate | undefined;
	const templateFromDb: PatternTemplate =
		savedTemplate && PATTERN_TEMPLATES.includes(savedTemplate) ? savedTemplate : '2-2-3';

	const plan = await planPromise;
	return {
		plan: plan.panel,
		planNudge: plan.nudge,
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
			templates: PATTERN_TEMPLATES.map((t) => ({ value: t, label: TEMPLATE_LABEL[t] }))
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
	template: z.enum(['2-2-3', 'week_on_week_off', 'alternate_weekends']),
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

const AddPlanned = z.object({
	title: z.string().trim().min(1).max(200),
	place: z.string().trim().max(200).optional(),
	/** "1" after the parent chose "Ask … to swap" on the other parent's day. */
	swap: z.literal('1').optional(),
	/** Re-adding an idea that came back from a declined swap. */
	ideaId: z.uuid().optional(),
	...SlotFields
});

export const actions: Actions = {
	/**
	 * "Plan this weekend" → Add to calendar.
	 * - On my day: a normal event + a note for the co-parent ("Schedule" thread).
	 * - On the other parent's day: first ask ("This is Dad's day. Ask to swap?");
	 *   with swap=1 create a swap request (my nearest night offered back) and the
	 *   event as "Pending swap" (DB trigger: accepted → normal event; declined →
	 *   back to the planner as an idea; countered → follows the counter).
	 */
	add: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, AddPlanned, 'add');
		if (!parsed.ok) return parsed.failure;
		const v = parsed.data;
		const tz = safeTimeZone(event.cookies.get('tz'));
		const today = localDate(new Date(), tz);
		const problem = slotProblem(v, today);
		if (problem) return formFailure('add', problem, 400, { to: problem });

		const sb = event.locals.supabase;
		const startsAt = zonedToUtc(v.date, v.from, tz);
		const [child, slotBlock, upcoming, parents] = await Promise.all([
			sb
				.from('children')
				.select('id, first_name')
				.eq('family_id', member.family_id)
				.order('created_at')
				.limit(1)
				.maybeSingle(),
			sb
				.from('events')
				.select('home, starts_at')
				.eq('family_id', member.family_id)
				.eq('kind', 'custody')
				.lte('starts_at', startsAt.toISOString())
				.order('starts_at', { ascending: false })
				.limit(1)
				.maybeSingle(),
			sb
				.from('events')
				.select('home, starts_at, ends_at')
				.eq('family_id', member.family_id)
				.eq('kind', 'custody')
				.gte('starts_at', zonedToUtc(today, '00:00', tz).toISOString())
				.lt('starts_at', zonedToUtc(addDays(v.date, 15), '00:00', tz).toISOString()),
			sb
				.from('members')
				.select('id, display_name, home')
				.eq('family_id', member.family_id)
				.eq('role', 'parent')
		]);
		const myHome = member.home === 'A' || member.home === 'B' ? member.home : null;
		const blockHome = slotBlock.data?.home ?? null;
		const nights = nightsByDate(
			(upcoming.data ?? [])
				.filter((e) => e.home === 'A' || e.home === 'B')
				.map((e) => ({ ...e, home: e.home as Home })),
			tz
		);
		const decision = decideAdd({
			myHome,
			slotNight:
				slotBlock.data && blockHome
					? { date: localDate(slotBlock.data.starts_at, tz), home: blockHome }
					: null,
			nights,
			today,
			wantsSwap: v.swap === '1'
		});
		const other = (parents.data ?? []).find((p) => p.id !== member.member_id);
		const otherName = other?.display_name ?? 'your co-parent';
		const childName = child.data?.first_name ?? 'our child';

		if (decision.kind === 'ask') {
			const give = pickGiveBack(nights, myHome ?? '', decision.nightDate, today);
			return {
				form: 'add',
				ok: false,
				needsSwap: true,
				otherName,
				message: `This is ${otherName}'s day. Ask to swap?`,
				giveBack: give ? shortDate(give) : null
			};
		}
		if (decision.kind === 'no_night_to_give') {
			return formFailure(
				'add',
				`This is ${otherName}'s day, and you have no night to offer back in the next two weeks. Pick another day.`,
				400
			);
		}

		let pendingSwapId: string | null = null;
		if (decision.kind === 'swap') {
			const dateError = checkSwapDates(decision.giveBack, decision.nightDate, today);
			if (dateError) return formFailure('add', dateError, 400);
			const ownership = await checkNightOwnership(
				sb,
				member.family_id,
				tz,
				member.home,
				decision.giveBack,
				decision.nightDate
			);
			if (ownership) return formFailure('add', ownership, 400);
			const note = swapNote(childName, v.title, weekdayLong(v.date));
			const { data: swap, error: swapError } = await sb
				.from('swap_requests')
				.insert({
					family_id: member.family_id,
					child_id: child.data?.id ?? null,
					requested_by: member.member_id,
					original_date: decision.giveBack,
					proposed_date: decision.nightDate,
					note,
					status: 'pending'
				})
				.select('id')
				.single();
			if (swapError || !swap) return formFailure('add', 'Could not send the swap request.', 500);
			pendingSwapId = swap.id;
			await logAudit({
				familyId: member.family_id,
				actorMemberId: member.member_id,
				action: 'swap.requested',
				entity: 'swap_requests',
				entityId: swap.id,
				meta: { source: 'planner' }
			});
		}

		const { data: created, error } = await sb
			.from('events')
			.insert({
				family_id: member.family_id,
				child_id: child.data?.id ?? null,
				title: v.title,
				starts_at: startsAt.toISOString(),
				ends_at: zonedToUtc(v.date, v.to, tz).toISOString(),
				// On my day: my home. Pending swap: it becomes my day once accepted.
				home: myHome ?? (blockHome === 'A' || blockHome === 'B' ? blockHome : null),
				kind: 'activity',
				source: 'planner',
				place: v.place || null,
				created_by: member.member_id,
				pending_swap_id: pendingSwapId
			})
			.select('id')
			.single();
		if (error || !created) return formFailure('add', 'Could not add it to the calendar.', 500);

		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'event.created',
			entity: 'events',
			entityId: created.id,
			meta: { source: 'planner', pending_swap: !!pendingSwapId }
		});
		if (v.ideaId) await sb.from('planner_ideas').delete().eq('id', v.ideaId);

		// Let the co-parent know (immutable "Schedule" thread; best effort).
		if (other) {
			const at = `${weekdayLong(v.date)} ${timeLabel(startsAt.toISOString(), tz)}`;
			const body =
				decision.kind === 'swap'
					? `📅 ${swapNote(childName, v.title, at)} Swap request: I'd take the night of ${shortDate(decision.nightDate)} and give you ${shortDate(decision.giveBack)}. You can accept, decline or counter on the Calendar.`
					: `Added “${v.title}” to the calendar for ${at}.`;
			await postScheduleNote(sb, member.family_id, member.member_id, body);
		}
		return {
			form: 'add',
			ok: true,
			message:
				decision.kind === 'swap'
					? `Swap request sent to ${otherName}. It shows as "Pending swap" until they answer.`
					: `Added to ${weekdayLong(v.date)}`
		};
	},

	/** Dismiss an idea that came back from a declined swap. */
	dismissIdea: async (event) => {
		await requireParent(event);
		const parsed = await parseForm(event.request, z.object({ ideaId: z.uuid() }), 'idea');
		if (!parsed.ok) return parsed.failure;
		await event.locals.supabase.from('planner_ideas').delete().eq('id', parsed.data.ideaId);
		return { form: 'idea', ok: true };
	},

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

		// generateNights throws RangeError on impossible dates or more than MAX_NIGHTS (400);
		// 12 weeks = 84 nights, well inside the limit.
		let nights: ReturnType<typeof generateNights>;
		try {
			nights = generateNights(v.template, v.startDate, v.firstHome, SCHEDULE_WEEKS * 7);
		} catch {
			return formFailure('schedule', 'That start date is not a valid date.');
		}
		const blocks = nightsToBlocks(nights, v.exchangeTime, tz);
		const startInstant = zonedToUtc(v.startDate, v.exchangeTime, tz);
		const fromInstant = new Date(Math.max(Date.now(), startInstant.getTime()));

		const { error } = await event.locals.supabase.rpc('replace_custody_schedule', {
			p_family_id: member.family_id,
			p_template: v.template,
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
