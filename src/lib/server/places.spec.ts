import { describe, expect, it } from 'vitest';
import {
	demoPlaces,
	MAX_RESULTS,
	overpassQuery,
	parseOverpass,
	roundCenter,
	searchPlaces,
	USER_AGENT
} from './places.js';

const SF = { lat: 37.7599, lon: -122.4148 };

const overpass = {
	elements: [
		{
			type: 'way',
			id: 1,
			center: { lat: 37.733, lon: -122.503 },
			tags: {
				tourism: 'zoo',
				name: 'San Francisco Zoo',
				'addr:housenumber': '1',
				'addr:street': 'Zoo Road',
				'addr:city': 'San Francisco',
				opening_hours: 'Mo-Su 10:00-17:00',
				website: 'https://www.sfzoo.org'
			}
		},
		{ type: 'node', id: 2, lat: 37.76, lon: -122.41, tags: { leisure: 'playground' } }, // no name
		{
			type: 'node',
			id: 3,
			lat: 37.77,
			lon: -122.42,
			tags: { leisure: 'park', name: 'Dolores Park', website: 'javascript:alert(1)' }
		},
		{
			type: 'node',
			id: 4,
			lat: 37.77,
			lon: -122.42,
			tags: { leisure: 'park', name: 'Dolores Park' }
		}, // duplicate
		{
			type: 'node',
			id: 5,
			lat: 37.77,
			lon: -122.42,
			tags: { leisure: 'swimming_pool', name: 'Backyard Pool', access: 'private' }
		},
		{
			type: 'node',
			id: 6,
			lat: 37.78,
			lon: -122.43,
			tags: { amenity: 'cafe', name: 'Not wanted' }
		},
		{ type: 'bogus' }
	]
};

describe('parseOverpass', () => {
	const places = parseOverpass(overpass, ['zoo', 'park', 'swimming'], SF);

	it('keeps named places in the wanted categories, with ids, address and hours', () => {
		expect(places.map((p) => p.name)).toEqual(['San Francisco Zoo', 'Dolores Park']);
		expect(places[0]).toMatchObject({
			id: 'osm:way/1',
			category: 'zoo',
			address: '1 Zoo Road, San Francisco',
			openingHours: 'Mo-Su 10:00-17:00',
			website: 'https://www.sfzoo.org'
		});
		expect(places[0].distanceKm).toBeGreaterThan(5);
	});

	it('drops unnamed, duplicate, private and unsafe-link entries', () => {
		expect(places.find((p) => p.name === 'Backyard Pool')).toBeUndefined();
		expect(places.find((p) => p.name === 'Dolores Park')?.website).toBeNull();
	});

	it('returns [] for anything that is not an Overpass response', () => {
		expect(parseOverpass({ nope: 1 }, ['zoo'], SF)).toEqual([]);
	});

	it('caps results and mixes categories', () => {
		const many = {
			elements: Array.from({ length: 80 }, (_, i) => ({
				type: 'node',
				id: i,
				lat: SF.lat + i / 1000,
				lon: SF.lon,
				tags:
					i % 2
						? { leisure: 'park', name: `Park ${i}` }
						: { amenity: 'library', name: `Library ${i}` }
			}))
		};
		const out = parseOverpass(many, ['park', 'library'], SF);
		expect(out).toHaveLength(MAX_RESULTS);
		expect(out.filter((p) => p.category === 'park')).toHaveLength(15);
	});
});

describe('overpassQuery', () => {
	it('asks for named nodes, ways and relations around the rounded center', () => {
		const q = overpassQuery(['zoo', 'swimming'], roundCenter(SF), 8047);
		expect(q).toContain('[timeout:8]');
		expect(q).toContain('nwr["tourism"="zoo"]["name"](around:8047,37.76,-122.41);');
		expect(q).toContain('["sport"="swimming"]');
		expect(q).toContain('out center tags');
	});
});

describe('searchPlaces', () => {
	it('sends one request with a User-Agent and caches the result', async () => {
		let calls = 0;
		const fetchFn = (async (_url: string, init: RequestInit) => {
			calls++;
			expect((init.headers as Record<string, string>)['user-agent']).toBe(USER_AGENT);
			return new Response(JSON.stringify(overpass), { status: 200 });
		}) as unknown as typeof fetch;
		const a = await searchPlaces(['zoo', 'park'], { lat: 40.71, lon: -74.0 }, 5000, fetchFn);
		const b = await searchPlaces(['park', 'zoo'], { lat: 40.7101, lon: -74.0001 }, 5000, fetchFn);
		expect(a.source).toBe('osm');
		expect(b.places).toEqual(a.places);
		expect(calls).toBe(1);
	});

	it('falls back to labelled demo places on errors', async () => {
		const failing = (async () => new Response('busy', { status: 429 })) as unknown as typeof fetch;
		const r = await searchPlaces(['zoo'], { lat: 1, lon: 2 }, 5000, failing);
		expect(r.source).toBe('demo');
		expect(r.places[0].id).toBe('demo:zoo');
	});

	it('never searches more than 3 categories', () => {
		const q = overpassQuery(['zoo', 'park', 'museum'], SF, 1000);
		expect(q.match(/nwr/g)).toHaveLength(3);
		expect(demoPlaces(['zoo', 'park'], SF)).toHaveLength(2);
	});
});
