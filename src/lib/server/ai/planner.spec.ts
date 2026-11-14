import { describe, expect, it } from 'vitest';
import type { FreeWindow } from '#lib/custody/freeWindows.js';
import type { Place } from '../places.js';
import { AiUnavailableError, createAsk, type CompletionRequest } from './llmCore.js';
import {
	heuristicCategories,
	heuristicPicks,
	planWeekend,
	validatePicks,
	type PlannerChild
} from './planner.js';

const child: PlannerChild = {
	ageYears: 8,
	wishes: ['Go to the zoo', 'Build a blanket fort'],
	moodTrend: 'a_bit_tired'
};
const windows: FreeWindow[] = [
	{ date: '2026-11-21', from: '09:00', to: '19:00' },
	{ date: '2026-11-22', from: '09:00', to: '19:00' }
];
const place = (
	id: string,
	category: Place['category'],
	km: number,
	hours: string | null = null
): Place => ({
	id,
	name: `Place ${id}`,
	category,
	address: null,
	lat: 37.7,
	lon: -122.4,
	openingHours: hours,
	website: null,
	distanceKm: km
});
const places = [
	place('osm:way/1', 'zoo', 9.1, 'Mo-Su 10:00-17:00'),
	place('osm:node/2', 'library', 1.2, 'Mo-Fr 09:00-18:00'), // closed at weekends
	place('osm:node/3', 'park', 0.8),
	place('osm:node/4', 'park', 2.5)
];

describe('heuristics', () => {
	it('maps shared wishes to categories and fills calm ones for a tired week', () => {
		const h = heuristicCategories(child, 'any');
		expect(h.categories).toEqual(['zoo', 'library', 'park']);
		expect(h.usedWishes).toEqual(['Go to the zoo']);
		expect(h.atHome.title).toBe('Blanket fort movie night');
	});

	it('picks open places of different categories in free slots', () => {
		const picks = heuristicPicks(places, windows, child.wishes);
		expect(picks.map((p) => p.place.id)).toEqual(['osm:way/1', 'osm:node/3', 'osm:node/4']);
		expect(picks[0]).toMatchObject({ date: '2026-11-21', from: '10:00', to: '12:00' });
		expect(picks[0].why).toBe('Matches the wish “Go to the zoo”.');
		expect(picks.find((p) => p.place.id === 'osm:node/2')).toBeUndefined();
	});
});

describe('validatePicks', () => {
	const pick = (over: Partial<Record<string, string>>) => ({
		placeId: 'osm:way/1',
		title: 'Morning at the zoo',
		why: 'Lily loves animals.',
		date: '2026-11-21',
		start: '10:00',
		end: '12:00',
		...over
	});

	it('keeps a valid pick', () => {
		expect(validatePicks([pick({})], places, windows, child.wishes)).toHaveLength(1);
	});

	it('drops invented places, duplicates, slots outside windows or opening hours', () => {
		const out = validatePicks(
			[
				pick({ placeId: 'osm:node/999' }), // not returned by OSM
				pick({ placeId: 'gmaps:abc' }),
				pick({ date: '2026-11-23' }), // not a free day
				pick({ start: '18:00', end: '20:00' }), // past the window
				pick({ start: '16:00', end: '18:00' }), // zoo closes at 17:00
				pick({ start: '10:00', end: '10:30' }), // too short
				pick({ placeId: 'osm:node/2' }), // library closed on Saturday
				pick({}),
				pick({}) // duplicate
			],
			places,
			windows,
			child.wishes
		);
		expect(out.map((s) => s.place.id)).toEqual(['osm:way/1']);
	});
});

describe('planWeekend', () => {
	function scripted(replies: unknown[]) {
		const calls: CompletionRequest[] = [];
		const ask = createAsk(async (req) => {
			calls.push(req);
			const r = replies[calls.length - 1];
			if (r instanceof Error) throw r;
			return JSON.stringify(r);
		});
		return { ask, calls };
	}
	const search = async () => ({ places, source: 'osm' as const });
	const req = {
		child,
		budget: 'any' as const,
		windows,
		center: { lat: 37.76, lon: -122.41 },
		radiusMeters: 8000
	};

	it('uses the model, drops invented ids and fills up to 3 suggestions', async () => {
		const { ask, calls } = scripted([
			{
				categories: ['zoo', 'park'],
				usedWishes: ['Go to the zoo', 'invented wish'],
				atHome: { title: 'Fort night', why: 'Fort wish.' }
			},
			{
				suggestions: [
					{
						placeId: 'osm:way/1',
						title: 'Zoo morning',
						why: 'Animals!',
						date: '2026-11-21',
						start: '10:00',
						end: '12:00'
					},
					{
						placeId: 'osm:way/777',
						title: 'Made up',
						why: 'x',
						date: '2026-11-21',
						start: '13:00',
						end: '15:00'
					}
				]
			}
		]);
		const r = await planWeekend(req, { ask, search });
		expect(r.aiUsed).toBe(true);
		expect(r.suggestions).toHaveLength(3);
		expect(r.suggestions[0].title).toBe('Zoo morning');
		expect(r.suggestions.some((s) => s.place.id === 'osm:way/777')).toBe(false);
		expect(r.usedWishes).toEqual(['Go to the zoo']);
		expect(calls).toHaveLength(2);
		expect(calls[0].tier).toBe('fast');
		expect(calls[1].tier).toBe('smart');
		// Neither prompt carries the family's location.
		for (const c of calls) {
			expect(c.prompt).not.toContain('37.76');
			expect(c.prompt).not.toContain('-122.41');
			expect(c.prompt).toMatch(/<input-[0-9a-f]{8}>/);
		}
	});

	it('falls back to the deterministic picker when the AI is down', async () => {
		const { ask } = scripted([new AiUnavailableError(), new AiUnavailableError()]);
		const r = await planWeekend(req, { ask, search });
		expect(r.aiUsed).toBe(false);
		expect(r.categories).toEqual(['zoo', 'library', 'park']);
		expect(r.suggestions.length).toBeGreaterThan(0);
		expect(r.atHome.title).toBe('Blanket fort movie night');
	});

	it('returns no outings (but an at-home idea) without free windows', async () => {
		const { ask, calls } = scripted([
			{ categories: ['zoo'], usedWishes: [], atHome: { title: 'Fort night', why: 'Fort.' } }
		]);
		const r = await planWeekend({ ...req, windows: [] }, { ask, search });
		expect(r.suggestions).toEqual([]);
		expect(r.atHome.title).toBe('Fort night');
		expect(calls).toHaveLength(1);
	});
});

describe('heuristicPicks in a short range', () => {
	it('fits a slot into a one-hour window', () => {
		const picks = heuristicPicks(
			[place('osm:node/3', 'park', 0.8)],
			[{ date: '2026-11-21', from: '07:30', to: '08:30' }],
			[]
		);
		expect(picks[0]).toMatchObject({ date: '2026-11-21', from: '07:30', to: '08:30' });
	});
});
