/**
 * "What should we carry in our shell?": a base list plus things for the plans
 * at the next home (e.g. "Swim class" → swimsuit and towel). A fixed keyword
 * dictionary, no AI: parents just name events as usual. Unknown event names
 * add nothing; the base list always stays. Pure, no I/O.
 */

export interface PackItem {
	key: string;
	icon: string;
	label: string;
	/** "for Swim class on Thu" (only for extras) */
	reason: string | null;
}

export interface PackPlan {
	title: string;
	kind: string;
	/** "Thu" */
	weekday: string;
}

const BASE: Omit<PackItem, 'reason'>[] = [
	{ key: 'backpack', icon: '🎒', label: 'Backpack' },
	{ key: 'pajamas', icon: '👕', label: 'Pajamas' },
	{ key: 'toothbrush', icon: '🪥', label: 'Toothbrush' },
	{ key: 'toy', icon: '🧸', label: 'Favorite toy' }
];

type Item = Omit<PackItem, 'reason'>;
const swimsuit: Item = { key: 'swimsuit', icon: '🩱', label: 'Swimsuit' };
const towel: Item = { key: 'towel', icon: '🧺', label: 'Towel' };
const sportsClothes: Item = { key: 'sports-clothes', icon: '🎽', label: 'Sports clothes' };
const sneakers: Item = { key: 'sneakers', icon: '👟', label: 'Sneakers' };
const hat: Item = { key: 'hat', icon: '🧢', label: 'Hat' };
const water: Item = { key: 'water', icon: '💧', label: 'Water bottle' };

/** Every matching rule adds its items (deduped, first reason kept). */
const RULES: { test: (title: string, kind: string) => boolean; items: Item[] }[] = [
	{ test: (t) => /swim|pool/.test(t), items: [swimsuit, towel] },
	{ test: (t) => /beach|lake/.test(t), items: [swimsuit, towel, hat] },
	{
		test: (t) => /soccer|football/.test(t),
		items: [sportsClothes, { key: 'cleats', icon: '⚽', label: 'Soccer cleats' }]
	},
	{
		test: (t) => /basketball|tennis|gym|sport|practice|training|run/.test(t),
		items: [sportsClothes, sneakers]
	},
	{
		test: (t) => /dance|ballet/.test(t),
		items: [{ key: 'dance-shoes', icon: '🩰', label: 'Dance shoes' }]
	},
	{
		test: (t) => /karate|judo|taekwondo|martial/.test(t),
		items: [{ key: 'uniform', icon: '🥋', label: 'Karate uniform' }]
	},
	{
		test: (t) => /piano|guitar|violin|music|lesson/.test(t),
		items: [{ key: 'music-book', icon: '🎵', label: 'Music book' }]
	},
	{
		test: (t) => /\bart\b|paint|draw|craft/.test(t),
		items: [{ key: 'art-clothes', icon: '🎨', label: 'Old clothes for art' }]
	},
	{
		test: (t) => /library/.test(t),
		items: [{ key: 'library-books', icon: '📖', label: 'Library books' }]
	},
	{
		test: (t, k) => k === 'school' || /school|class/.test(t),
		items: [
			{ key: 'homework', icon: '📚', label: 'Homework' },
			{ key: 'lunchbox', icon: '🍱', label: 'Lunchbox' }
		]
	},
	{
		test: (t, k) => k === 'medical' || /doctor|dentist|clinic|checkup/.test(t),
		items: [{ key: 'health-card', icon: '🪪', label: 'Health card' }]
	},
	{
		test: (t) => /birthday|party/.test(t),
		items: [{ key: 'present', icon: '🎁', label: 'Present' }]
	},
	{
		test: (t) => /sleepover|camp/.test(t),
		items: [{ key: 'sleeping-bag', icon: '🛏️', label: 'Sleeping bag' }]
	},
	{ test: (t) => /hike|park|zoo|picnic|outdoor/.test(t), items: [hat, water] }
];

export function packingList(plans: readonly PackPlan[]): PackItem[] {
	const out: PackItem[] = BASE.map((b) => ({ ...b, reason: null }));
	for (const p of plans) {
		const title = p.title.toLowerCase();
		for (const rule of RULES) {
			if (!rule.test(title, p.kind)) continue;
			for (const item of rule.items) {
				if (out.some((o) => o.key === item.key)) continue;
				out.push({ ...item, reason: `for ${p.title} on ${p.weekday}` });
			}
		}
	}
	return out;
}
