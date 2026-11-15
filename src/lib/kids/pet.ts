/**
 * Pebble's look: names (a preset, or the child's own), shell colours and patterns.
 *
 * Storage (pet_state, child-only by RLS; parents never see it):
 *   name            a preset from PET_NAMES, or the child's own name that passed
 *                   checkPetName() + the server's safety check (DB allows 1–30 chars)
 *   colors.shell    hex of one of SHELL_COLORS (colors.skin is left as is)
 *   shell_patterns  [{ "key": "stars", "on": "2026-11-15" }, …]  (on = UTC day it was unlocked)
 */
import type { Json } from '#lib/types/database.js';
import { isKidSafe } from './weeklyDeck.js';

export const PET_NAMES = ['Pebble', 'Shelly', 'Sunny', 'Mossy', 'Bubbles', 'Coco'] as const;
export type PetName = (typeof PET_NAMES)[number];
export const DEFAULT_PET_NAME: PetName = 'Pebble';

// ---------------------------------------------------------------------------
// The child's own pet name
// ---------------------------------------------------------------------------
export const PET_NAME_MAX = 16;

export type PetNameCheck =
	| { ok: true; name: string }
	| { ok: false; reason: 'empty' | 'too_long' | 'letters' | 'words' | 'rude' };

/**
 * Local rules for a typed pet name (the server also runs the safety check first).
 * Letters only, plus spaces, ' and -: no numbers, links or emails, so it can't
 * carry a phone number or address. Up to 3 words and 16 characters. Each word is
 * capitalised ("mister shell" → "Mister Shell").
 */
export function checkPetName(input: string): PetNameCheck {
	const text = input.normalize('NFKC').replace(/\s+/g, ' ').trim();
	if (!text) return { ok: false, reason: 'empty' };
	if ([...text].length > PET_NAME_MAX) return { ok: false, reason: 'too_long' };
	if (!/^\p{L}[\p{L}\p{M}' -]*$/u.test(text)) return { ok: false, reason: 'letters' };
	if (text.split(' ').length > 3) return { ok: false, reason: 'words' };
	if (!isKidSafe(text)) return { ok: false, reason: 'rude' };
	const name = text.replace(
		/(^|[\s-])(\p{Ll})/gu,
		(_, sep: string, ch: string) => sep + ch.toUpperCase()
	);
	return { ok: true, name };
}

/** Pebble's gentle "try again" line for each reason. */
export const PET_NAME_RETRY: Record<Exclude<PetNameCheck, { ok: true }>['reason'], string> = {
	empty: 'Type a name in the box, or pick one of mine!',
	too_long: `That’s a long name! Can you make it ${PET_NAME_MAX} letters or less?`,
	letters: 'Use letters only, please. No numbers or symbols.',
	words: 'Three words at most, please!',
	rude: 'Hmm, let’s pick a kinder name for me.'
};

export const SHELL_COLORS = [
	{ key: 'forest', label: 'Forest green', hex: '#3E7F5E', dark: '#2A5A42' },
	{ key: 'ocean', label: 'Ocean blue', hex: '#3B78A8', dark: '#28557A' },
	{ key: 'sunset', label: 'Sunset orange', hex: '#D9823B', dark: '#A65E22' },
	{ key: 'berry', label: 'Berry purple', hex: '#8A5BA8', dark: '#623F7A' }
] as const;
export type ShellColor = (typeof SHELL_COLORS)[number];
export type ShellColorKey = ShellColor['key'];
export const SHELL_COLOR_KEYS = SHELL_COLORS.map((c) => c.key) as [
	ShellColorKey,
	...ShellColorKey[]
];

export const SHELL_PATTERNS = [
	{ key: 'dots', label: 'Sunny dots', icon: '🟡' },
	{ key: 'stars', label: 'Stars', icon: '⭐' },
	{ key: 'hearts', label: 'Hearts', icon: '💗' },
	{ key: 'stripes', label: 'Stripes', icon: '〰️' },
	{ key: 'flowers', label: 'Flowers', icon: '🌼' }
] as const;
export type ShellPatternKey = (typeof SHELL_PATTERNS)[number]['key'];

export interface OwnedPattern {
	key: ShellPatternKey;
	/** UTC day (YYYY-MM-DD) it was unlocked. */
	on: string | null;
}

export interface PetLook {
	name: string;
	color: ShellColor;
	patterns: OwnedPattern[];
}

const isPatternKey = (v: unknown): v is ShellPatternKey =>
	typeof v === 'string' && SHELL_PATTERNS.some((p) => p.key === v);

/** Shell colour for a stored hex (or key). Unknown values (e.g. the DB default) → forest green. */
export function shellColorFrom(value: unknown): ShellColor {
	if (typeof value === 'string') {
		const v = value.toLowerCase();
		const found = SHELL_COLORS.find((c) => c.key === v || c.hex.toLowerCase() === v);
		if (found) return found;
	}
	return SHELL_COLORS[0];
}

export function shellColorByKey(key: ShellColorKey): ShellColor {
	return SHELL_COLORS.find((c) => c.key === key) ?? SHELL_COLORS[0];
}

/** Tolerant parse of pet_state.shell_patterns (strings or {key,on} objects; junk ignored). */
export function parsePatterns(raw: Json | null | undefined): OwnedPattern[] {
	if (!Array.isArray(raw)) return [];
	const out: OwnedPattern[] = [];
	for (const item of raw) {
		if (isPatternKey(item)) {
			out.push({ key: item, on: null });
		} else if (item && typeof item === 'object' && !Array.isArray(item)) {
			const key = (item as Record<string, Json>).key;
			const on = (item as Record<string, Json>).on;
			if (isPatternKey(key)) out.push({ key, on: typeof on === 'string' ? on : null });
		}
	}
	// One entry per key.
	return out.filter((p, i) => out.findIndex((q) => q.key === p.key) === i);
}

/** Read the stored pet row (or nothing) into a safe look with defaults. */
export function petLookFrom(
	row: { name?: string | null; colors?: Json | null; shell_patterns?: Json | null } | null
): PetLook {
	const colors =
		row?.colors && typeof row.colors === 'object' && !Array.isArray(row.colors)
			? (row.colors as Record<string, Json>)
			: {};
	return {
		name: row?.name?.trim() || DEFAULT_PET_NAME,
		color: shellColorFrom(colors.shell),
		patterns: parsePatterns(row?.shell_patterns)
	};
}

/** The next pattern the child doesn't have yet, or null when all are unlocked. */
export function nextLockedPattern(owned: OwnedPattern[]): ShellPatternKey | null {
	return SHELL_PATTERNS.find((p) => !owned.some((o) => o.key === p.key))?.key ?? null;
}

/**
 * A present is ready when today's check-in AND at least one wish card are done,
 * nothing was unlocked yet today, and a pattern is still locked.
 * No streaks: skipping days never takes anything away.
 */
export function canClaimPattern(input: {
	checkedInToday: boolean;
	wishedToday: boolean;
	owned: OwnedPattern[];
	today: string;
}): boolean {
	if (!input.checkedInToday || !input.wishedToday) return false;
	if (input.owned.some((p) => p.on === input.today)) return false;
	return nextLockedPattern(input.owned) !== null;
}

/** The pattern shown on Pebble: the newest one unlocked. */
export function currentPattern(owned: OwnedPattern[]): ShellPatternKey | null {
	return owned.at(-1)?.key ?? null;
}
