/**
 * Today (parent home). One load, parallel RLS-protected queries as the
 * signed-in parent. Everything is formatted here in the parent's time zone
 * (cookie `tz`, set by the page; UTC until then), so the components only
 * render strings and SSR/hydration always match.
 *
 * Re-runs on `invalidate('app:today')` (live updates from the page).
 */
import { suggestForParent } from '#lib/server/ai/parentSuggestion.js';
import { requireParent } from '#lib/server/guards.js';
import { balanceText, computeBalance } from '#lib/expenses/balance.js';
import { buildChartMonths } from '#lib/expenses/chart.js';
import { loadBalanceRows, loadSpendingRows, shiftMonth } from '../expenses/expenses.server.js';
import {
	addDays,
	buildBriefing,
	custodyLine as buildCustodyLine,
	custodyNow,
	greetingFor,
	localDate,
	localHour,
	longDate,
	relativeDay,
	safeTimeZone,
	shortDate,
	timeLabel,
	weekStrip,
	type CustodyBlock,
	type Home
} from '#lib/custody/today.js';
import type { PageServerLoad } from './$types';

const DAY_MS = 86_400_000;

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	event.depends('app:today');

	const tz = safeTimeZone(event.cookies.get('tz'));
	const now = new Date();
	const today = localDate(now, tz);
	const sb = event.locals.supabase;
	const familyId = member.family_id;

	// Wide enough window for any time zone: yesterday .. +15 days.
	const from = new Date(now.getTime() - 2 * DAY_MS).toISOString();
	const to = new Date(now.getTime() + 16 * DAY_MS).toISOString();
	const currentMonth = today.slice(0, 7);

	const [
		parents,
		children,
		events,
		lastCustody,
		schedule,
		swaps,
		unread,
		recent,
		spending,
		balanceRows,
		myTime
	] = await Promise.all([
		sb
			.from('members')
			.select('id, display_name, home')
			.eq('family_id', familyId)
			.eq('role', 'parent'),
		sb
			.from('children')
			.select('id, first_name, status')
			.eq('family_id', familyId)
			.order('created_at'),
		sb
			.from('events')
			.select('id, title, starts_at, ends_at, home, kind, place, child_id')
			.eq('family_id', familyId)
			.gte('starts_at', from)
			.lt('starts_at', to)
			.order('starts_at'),
		// The custody block in force before the window (e.g. a long stretch).
		sb
			.from('events')
			.select('starts_at, ends_at, home')
			.eq('family_id', familyId)
			.eq('kind', 'custody')
			.lt('starts_at', from)
			.order('starts_at', { ascending: false })
			.limit(1),
		sb
			.from('custody_schedules')
			.select('template, exchange_time, rules')
			.eq('family_id', familyId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle(),
		sb
			.from('swap_requests')
			.select('id, requested_by, original_date, proposed_date, note, created_at')
			.eq('family_id', familyId)
			.eq('status', 'pending')
			.order('created_at'),
		sb
			.from('messages')
			.select('id', { count: 'exact', head: true })
			.eq('family_id', familyId)
			.is('first_read_at', null)
			.neq('sender_id', member.member_id),
		sb
			.from('messages')
			.select('id, thread_id, sender_id, body, created_at, first_read_at, threads(topic)')
			.eq('family_id', familyId)
			.order('created_at', { ascending: false })
			.limit(20),
		// Shared spending (last 3 months) + balance input; identical for both parents.
		loadSpendingRows(sb, familyId, shiftMonth(currentMonth, -2)),
		loadBalanceRows(sb, familyId),
		sb.from('v_parent_time').select('child_id, month, outings_count, avg_rating, top_activities')
	]);

	// ---- people -------------------------------------------------------------
	const parentRows = parents.data ?? [];
	const other = parentRows.find((p) => p.id !== member.member_id) ?? null;
	const myHome = member.home;
	const nameOf = (home: Home) =>
		home === myHome
			? 'You'
			: (parentRows.find((p) => p.home === home)?.display_name ?? `Home ${home}`);
	const nameById = (id: string) =>
		id === member.member_id
			? 'You'
			: (parentRows.find((p) => p.id === id)?.display_name ?? 'Your co-parent');
	const child = children.data?.[0] ?? null;
	const childName = child?.first_name ?? 'Your child';

	// ---- custody --------------------------------------------------------------
	const eventRows = events.data ?? [];
	const isCustody = (e: { kind: string; home: string | null }) => e.kind === 'custody' && !!e.home;
	const blocks: CustodyBlock[] = [...(lastCustody.data ?? []), ...eventRows.filter(isCustody)].map(
		(e) => ({ starts_at: e.starts_at, ends_at: e.ends_at, home: e.home as Home })
	);
	const { home: homeNow, handover } = custodyNow(blocks, now);
	const lineText = buildCustodyLine({
		childName,
		home: homeNow,
		handover,
		myHome,
		nameOf: (h) => (h === myHome ? 'you' : nameOf(h)),
		today,
		tz
	});

	// ---- events ---------------------------------------------------------------
	const others = eventRows.filter((e) => !isCustody(e));
	const todayEvents = others
		.filter((e) => localDate(e.starts_at, tz) === today)
		.map((e) => ({
			id: e.id,
			time: timeLabel(e.starts_at, tz),
			title: e.title,
			place: e.place,
			kind: e.kind
		}));
	const strip = weekStrip(blocks, others, today, tz).map((d) => ({
		...d,
		label: d.home ? nameOf(d.home) : 'Not set',
		mine: d.home ? d.home === myHome : null
	}));

	const rules = (schedule.data?.rules ?? {}) as { exchange_place?: unknown };
	const nextHandover = handover
		? {
				day: relativeDay(localDate(handover.at, tz), today),
				date: shortDate(localDate(handover.at, tz)),
				time: timeLabel(handover.at, tz),
				place: typeof rules.exchange_place === 'string' ? rules.exchange_place : null,
				from: nameOf(handover.from),
				to: nameOf(handover.to),
				youDropOff: handover.from === myHome
			}
		: null;

	// ---- swaps ----------------------------------------------------------------
	const swapRows = (swaps.data ?? []).map((s) => ({
		id: s.id,
		fromMe: s.requested_by === member.member_id,
		requester: nameById(s.requested_by),
		original: shortDate(s.original_date),
		proposed: s.proposed_date ? shortDate(s.proposed_date) : null,
		originalDate: s.original_date,
		proposedDate: s.proposed_date,
		note: s.note
	}));
	const swapsFromOther = swapRows.filter((s) => !s.fromMe).length;
	// "Request a swap" pre-fill: my next night to give, their next night to take.
	const upcoming = weekStrip(blocks, [], today, tz, 14);
	const swapPrefill = {
		original: upcoming.find((d) => d.home && d.home === myHome)?.date ?? '',
		proposed: upcoming.find((d) => d.home && d.home !== myHome)?.date ?? ''
	};

	// ---- messages -------------------------------------------------------------
	const unreadCount = unread.count ?? 0;
	const seenThreads = new Set<string>();
	const latestPerThread = [];
	for (const m of recent.data ?? []) {
		if (seenThreads.has(m.thread_id)) continue;
		seenThreads.add(m.thread_id);
		latestPerThread.push({
			threadId: m.thread_id,
			topic: m.threads?.topic ?? 'Messages',
			from: nameById(m.sender_id),
			snippet: m.body.length > 90 ? `${m.body.slice(0, 87)}…` : m.body,
			when: `${relativeDay(localDate(m.created_at, tz), today)} ${timeLabel(m.created_at, tz)}`,
			unread: m.sender_id !== member.member_id && !m.first_read_at
		});
		if (latestPerThread.length === 3) break;
	}

	// ---- slots: spending chart + balance (shared) / my time ----------------------
	const balance = computeBalance(balanceRows, member.member_id);
	const timeRows = (myTime.data ?? []).filter((r) => !child || r.child_id === child.id);
	const outings = timeRows.reduce((n, r) => n + (r.outings_count ?? 0), 0);
	const rated = timeRows.filter((r) => r.avg_rating !== null);
	const ratedCount = rated.reduce((n, r) => n + (r.outings_count ?? 0), 0);
	const avgRating = ratedCount
		? Math.round(
				(rated.reduce((s, r) => s + Number(r.avg_rating) * (r.outings_count ?? 0), 0) /
					ratedCount) *
					10
			) / 10
		: null;

	return {
		tz,
		header: {
			greeting: greetingFor(localHour(now, tz)),
			name: member.display_name,
			date: longDate(today),
			custodyLine: lineText
		},
		briefing: buildBriefing({
			custodyLine: lineText,
			otherName: other?.display_name ?? null,
			swapsFromOther,
			swapsWaiting: swapRows.length - swapsFromOther,
			unread: unreadCount,
			firstEvent: todayEvents[0] ? { title: todayEvents[0].title, time: todayEvents[0].time } : null
		}),
		child,
		hasCoParent: other !== null,
		otherName: other?.display_name ?? null,
		strip,
		todayEvents,
		nextHandover,
		swaps: swapRows,
		swapPrefill,
		canSwap: other !== null && !!myHome,
		swapWindow: { min: today, max: addDays(today, 60) },
		unread: { count: unreadCount, threads: latestPerThread },
		slots: {
			chart: buildChartMonths(spending, currentMonth),
			balance: {
				text: balanceText(balance, other?.display_name ?? 'your co-parent'),
				items: balance.items
			},
			myTime: {
				outings,
				avgRating,
				topActivities: [...new Set(timeRows.flatMap((r) => r.top_activities ?? []))].slice(0, 3),
				suggestion: child ? (await suggestForParent(member.member_id, child.id)).suggestion : null
			}
		}
	};
};
