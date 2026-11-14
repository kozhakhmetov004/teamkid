/** What the form sends to POST /api/planner/weekend. */
export interface PlanParams {
	saturday: string;
	center: { lat: number; lon: number };
	radiusMiles: 5 | 10 | 25;
	budget: 'free' | 'under_25' | 'under_60' | 'any';
	/** Local time range 'HH:MM' (07:00-21:00). */
	from: string;
	to: string;
}

/** Shapes the planner page receives from POST /api/planner/weekend. */
export interface PlannedPlace {
	id: string;
	name: string;
	category: string;
	address: string | null;
	lat: number;
	lon: number;
	openingHours: string | null;
	website: string | null;
	distanceKm: number;
}

export interface PlannedSuggestion {
	place: PlannedPlace;
	title: string;
	why: string;
	date: string;
	from: string;
	to: string;
}

export type PlanResponse =
	| {
			status: 'ok';
			suggestions: PlannedSuggestion[];
			atHome: { title: string; why: string };
			usedWishes: string[];
			source: 'osm' | 'demo';
			aiUsed: boolean;
	  }
	| { status: 'not_with_you'; saturday: string; nextSaturday: string | null }
	| { status: 'no_time'; saturday: string; from: string; to: string };

export const CATEGORY_LABEL: Record<string, string> = {
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

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(
		new Date(`${date}T12:00:00Z`)
	);
const time12 = (hhmm: string) =>
	new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(
		new Date(`2000-01-01T${hhmm}:00Z`)
	);

/** "Sat, Nov 21 · 10:00 AM – 12:00 PM" */
export const slotLabel = (date: string, from: string, to: string) =>
	`${fmt(date, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time12(from)} – ${time12(to)}`;

/** "Nov 21–22" */
export function weekendLabel(saturday: string): string {
	const sun = new Date(`${saturday}T12:00:00Z`);
	sun.setUTCDate(sun.getUTCDate() + 1);
	const sunday = sun.toISOString().slice(0, 10);
	const left = fmt(saturday, { month: 'short', day: 'numeric' });
	const sameMonth = saturday.slice(0, 7) === sunday.slice(0, 7);
	return `${left}–${sameMonth ? fmt(sunday, { day: 'numeric' }) : fmt(sunday, { month: 'short', day: 'numeric' })}`;
}

export const miles = (km: number) => `${Math.round(km * 0.621371 * 10) / 10} mi`;

/** "2:30 PM" */
export const timeLabel = (hhmm: string) =>
	new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(
		new Date(`2000-01-01T${hhmm}:00Z`)
	);
