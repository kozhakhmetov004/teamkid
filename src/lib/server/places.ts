/**
 * Places for "Plan my weekend". Provider: OpenStreetMap through the Overpass
 * API (no key, no billing). The interface is provider-neutral
 * (`searchPlaces(categories, center, radiusMeters) -> Place[]`) so another
 * provider can be added later.
 *
 * - Only fixed categories with known OSM tags (no free-text queries).
 * - One Overpass request for all categories, 8 s timeout, named places only,
 *   max 30 results, cached in memory for 10 minutes per (categories, rounded center, radius).
 * - Any error or timeout -> clearly labelled demo places, never a blank page.
 * - The center is rounded to ~1 km before it leaves the server.
 *
 * Data © OpenStreetMap contributors (ODbL); the UI shows the attribution.
 */
import { z } from 'zod';

export const PLACE_CATEGORIES = [
	'zoo',
	'aquarium',
	'museum',
	'park',
	'playground',
	'swimming',
	'climbing',
	'sports',
	'library',
	'ice_cream',
	'cinema'
] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
export const PlaceCategorySchema = z.enum(PLACE_CATEGORIES);

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
	zoo: 'Zoo',
	aquarium: 'Aquarium',
	museum: 'Museum',
	park: 'Park',
	playground: 'Playground',
	swimming: 'Swimming',
	climbing: 'Climbing',
	sports: 'Sports centre',
	library: 'Library',
	ice_cream: 'Ice cream',
	cinema: 'Cinema'
};

/** Overpass tag filters per category (all also require a name). */
const OSM_FILTERS: Record<PlaceCategory, string[]> = {
	zoo: ['["tourism"="zoo"]'],
	aquarium: ['["tourism"="aquarium"]'],
	museum: ['["tourism"="museum"]'],
	park: ['["leisure"="park"]'],
	playground: ['["leisure"="playground"]'],
	swimming: [
		'["leisure"="swimming_pool"]["access"!~"private|no|customers"]',
		'["leisure"="sports_centre"]["sport"="swimming"]'
	],
	climbing: ['["sport"="climbing"]'],
	sports: ['["leisure"="sports_centre"]'],
	library: ['["amenity"="library"]'],
	ice_cream: ['["amenity"="ice_cream"]'],
	cinema: ['["amenity"="cinema"]']
};

export interface LatLon {
	lat: number;
	lon: number;
}

export interface Place {
	/** "osm:<node|way|relation>/<id>" (or "demo:<n>" for demo places). */
	id: string;
	name: string;
	category: PlaceCategory;
	address: string | null;
	lat: number;
	lon: number;
	openingHours: string | null;
	website: string | null;
	distanceKm: number;
}

export interface PlaceSearch {
	places: Place[];
	source: 'osm' | 'demo';
}

export const MAX_CATEGORIES = 3;
export const MAX_RESULTS = 30;
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TIMEOUT_MS = 8000;
const CACHE_MS = 10 * 60_000;
export const USER_AGENT = 'TeamKid-demo/0.1 (hackathon demo; contact: demo@teamkid.example)';

/** ~1.1 km precision: the exact location never leaves the server. */
export const roundCenter = (c: LatLon): LatLon => ({
	lat: Math.round(c.lat * 100) / 100,
	lon: Math.round(c.lon * 100) / 100
});

export function distanceKm(a: LatLon, b: LatLon): number {
	const rad = (d: number) => (d * Math.PI) / 180;
	const dLat = rad(b.lat - a.lat);
	const dLon = rad(b.lon - a.lon);
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
	return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function overpassQuery(
	categories: PlaceCategory[],
	c: LatLon,
	radiusMeters: number
): string {
	const around = `(around:${Math.round(radiusMeters)},${c.lat},${c.lon})`;
	const parts = categories.flatMap((cat) =>
		OSM_FILTERS[cat].map((f) => `nwr${f}["name"]${around};`)
	);
	return `[out:json][timeout:${TIMEOUT_MS / 1000}];(${parts.join('')});out center tags 200;`;
}

const OverpassElement = z.object({
	type: z.enum(['node', 'way', 'relation']),
	id: z.number(),
	lat: z.number().optional(),
	lon: z.number().optional(),
	center: z.object({ lat: z.number(), lon: z.number() }).optional(),
	tags: z.record(z.string(), z.string()).optional()
});
const OverpassResponse = z.object({ elements: z.array(z.unknown()) });

function categoryOf(tags: Record<string, string>, wanted: PlaceCategory[]): PlaceCategory | null {
	const has = (k: string, v: string) => tags[k] === v;
	const match: Record<PlaceCategory, boolean> = {
		zoo: has('tourism', 'zoo'),
		aquarium: has('tourism', 'aquarium'),
		museum: has('tourism', 'museum'),
		park: has('leisure', 'park'),
		playground: has('leisure', 'playground'),
		swimming:
			(has('leisure', 'swimming_pool') && !/private|no|customers/.test(tags.access ?? '')) ||
			(has('leisure', 'sports_centre') && has('sport', 'swimming')),
		climbing: has('sport', 'climbing'),
		sports: has('leisure', 'sports_centre'),
		library: has('amenity', 'library'),
		ice_cream: has('amenity', 'ice_cream'),
		cinema: has('amenity', 'cinema')
	};
	return wanted.find((c) => match[c]) ?? null;
}

function addressOf(tags: Record<string, string>): string | null {
	const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
	const parts = [street, tags['addr:city']].filter(Boolean);
	return parts.length ? parts.join(', ').slice(0, 160) : null;
}

/** Overpass JSON -> named places in the wanted categories, nearest first, balanced across categories. */
export function parseOverpass(json: unknown, categories: PlaceCategory[], center: LatLon): Place[] {
	const parsed = OverpassResponse.safeParse(json);
	if (!parsed.success) return [];
	const seen = new Set<string>();
	const places: Place[] = [];
	for (const raw of parsed.data.elements) {
		const el = OverpassElement.safeParse(raw);
		if (!el.success) continue;
		const { type, id, tags = {} } = el.data;
		const lat = el.data.lat ?? el.data.center?.lat;
		const lon = el.data.lon ?? el.data.center?.lon;
		const name = tags.name?.trim();
		const category = categoryOf(tags, categories);
		if (!name || lat === undefined || lon === undefined || !category) continue;
		// The same place is often mapped twice (e.g. a node and its building).
		const key = `${category}|${name.toLowerCase()}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const website = tags.website ?? '';
		places.push({
			id: `osm:${type}/${id}`,
			name: name.slice(0, 120),
			category,
			address: addressOf(tags),
			lat,
			lon,
			openingHours: tags.opening_hours?.slice(0, 200) ?? null,
			website: /^https?:\/\//.test(website) ? website.slice(0, 300) : null,
			distanceKm: Math.round(distanceKm(center, { lat, lon }) * 10) / 10
		});
	}
	// Nearest first, but round-robin across categories so one category can't take all 30.
	const byCat = categories.map((c) =>
		places.filter((p) => p.category === c).sort((a, b) => a.distanceKm - b.distanceKm)
	);
	const out: Place[] = [];
	for (let i = 0; out.length < MAX_RESULTS && byCat.some((l) => i < l.length); i++) {
		for (const list of byCat) if (i < list.length && out.length < MAX_RESULTS) out.push(list[i]);
	}
	return out;
}

/** Fictional places around the center, used when OSM can't be reached. Clearly labelled in the UI. */
export function demoPlaces(categories: PlaceCategory[], center: LatLon): Place[] {
	const NAMES: Record<PlaceCategory, string> = {
		zoo: 'Riverside Zoo',
		aquarium: 'Bayview Aquarium',
		museum: 'Discovery Science Museum',
		park: 'Willow Creek Park',
		playground: 'Sunny Hill Playground',
		swimming: 'Maple Family Pool',
		climbing: 'Boulder Kids Climbing Gym',
		sports: 'Lakeside Sports Center',
		library: 'Oak Street Library',
		ice_cream: 'Scoops Ice Cream',
		cinema: 'Starlight Family Cinema'
	};
	return categories.map((category, i) => {
		const lat = center.lat + 0.01 * (i + 1);
		const lon = center.lon - 0.012 * (i + 1);
		return {
			id: `demo:${category}`,
			name: NAMES[category],
			category,
			address: null,
			lat,
			lon,
			openingHours: 'Mo-Su 09:00-18:00',
			website: null,
			distanceKm: Math.round(distanceKm(center, { lat, lon }) * 10) / 10
		};
	});
}

const cache = new Map<string, { at: number; places: Place[] }>();

export async function searchPlaces(
	categories: PlaceCategory[],
	center: LatLon,
	radiusMeters: number,
	fetchFn: typeof fetch = fetch
): Promise<PlaceSearch> {
	const cats = [...new Set(categories)].slice(0, MAX_CATEGORIES);
	const c = roundCenter(center);
	if (cats.length === 0) return { places: [], source: 'osm' };
	const key = `${[...cats].sort().join(',')}|${c.lat},${c.lon}|${Math.round(radiusMeters)}`;
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < CACHE_MS) return { places: hit.places, source: 'osm' };

	try {
		const res = await fetchFn(OVERPASS_URL, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				'user-agent': USER_AGENT,
				accept: 'application/json'
			},
			body: new URLSearchParams({ data: overpassQuery(cats, c, radiusMeters) }),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (!res.ok) throw new Error(`overpass ${res.status}`);
		const places = parseOverpass(await res.json(), cats, c);
		cache.set(key, { at: Date.now(), places });
		if (cache.size > 200) cache.delete(cache.keys().next().value as string);
		return { places, source: 'osm' };
	} catch (err) {
		console.warn(
			'[places] OSM unavailable, using demo places:',
			err instanceof Error ? err.name : 'error'
		);
		return { places: demoPlaces(cats, c), source: 'demo' };
	}
}
