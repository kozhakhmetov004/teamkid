import { describe, expect, it } from 'vitest';
import {
	canClaimPattern,
	checkPetName,
	currentPattern,
	nextLockedPattern,
	parsePatterns,
	PET_NAME_MAX,
	PET_NAMES,
	petLookFrom,
	SHELL_COLORS,
	SHELL_PATTERNS,
	shellColorFrom
} from './pet.js';

describe('presets', () => {
	it('has the 6 approved names, each valid for pet_state.name (1–30 chars)', () => {
		expect(PET_NAMES).toEqual(['Pebble', 'Shelly', 'Sunny', 'Mossy', 'Bubbles', 'Coco']);
		for (const n of PET_NAMES) expect(n.length).toBeGreaterThan(0);
	});

	it('has 4 shell colours and unique keys everywhere', () => {
		expect(SHELL_COLORS).toHaveLength(4);
		expect(new Set(SHELL_COLORS.map((c) => c.key)).size).toBe(4);
		expect(new Set(SHELL_PATTERNS.map((p) => p.key)).size).toBe(SHELL_PATTERNS.length);
	});
});

describe('petLookFrom', () => {
	it('falls back to Pebble + forest green when there is no row', () => {
		const look = petLookFrom(null);
		expect(look.name).toBe('Pebble');
		expect(look.color.key).toBe('forest');
		expect(look.patterns).toEqual([]);
	});

	it('maps the DB default colour (#5BA88F) to forest green', () => {
		expect(petLookFrom({ colors: { shell: '#5BA88F', skin: '#A8D5BA' } }).color.key).toBe('forest');
	});

	it('reads a stored hex case-insensitively', () => {
		expect(shellColorFrom('#3b78a8').key).toBe('ocean');
		expect(shellColorFrom('berry').key).toBe('berry');
	});
});

describe('parsePatterns', () => {
	it('accepts strings and objects, ignores junk and duplicates', () => {
		expect(
			parsePatterns(['stars', { key: 'dots', on: '2026-11-14' }, 'nope', 3, { key: 'stars' }])
		).toEqual([
			{ key: 'stars', on: null },
			{ key: 'dots', on: '2026-11-14' }
		]);
		expect(parsePatterns(null)).toEqual([]);
		expect(parsePatterns({ key: 'stars' })).toEqual([]);
	});
});

describe('shell rewards', () => {
	const today = '2026-11-15';

	it('needs both a check-in and a wish today', () => {
		expect(canClaimPattern({ checkedInToday: true, wishedToday: false, owned: [], today })).toBe(
			false
		);
		expect(canClaimPattern({ checkedInToday: false, wishedToday: true, owned: [], today })).toBe(
			false
		);
		expect(canClaimPattern({ checkedInToday: true, wishedToday: true, owned: [], today })).toBe(
			true
		);
	});

	it('gives at most one present per day', () => {
		const owned = [{ key: 'dots' as const, on: today }];
		expect(canClaimPattern({ checkedInToday: true, wishedToday: true, owned, today })).toBe(false);
		expect(
			canClaimPattern({
				checkedInToday: true,
				wishedToday: true,
				owned: [{ key: 'dots', on: '2026-11-10' }],
				today
			})
		).toBe(true);
	});

	it('stops when every pattern is unlocked, and never takes one away', () => {
		const all = SHELL_PATTERNS.map((p) => ({ key: p.key, on: '2026-11-01' }));
		expect(nextLockedPattern(all)).toBeNull();
		expect(canClaimPattern({ checkedInToday: true, wishedToday: true, owned: all, today })).toBe(
			false
		);
		expect(currentPattern(all)).toBe(SHELL_PATTERNS.at(-1)?.key);
	});

	it('unlocks patterns in deck order', () => {
		expect(nextLockedPattern([])).toBe('dots');
		expect(nextLockedPattern([{ key: 'dots', on: null }])).toBe('stars');
	});
});

describe('checkPetName (a pet name the child types)', () => {
	it('accepts a friendly name and capitalises each word', () => {
		expect(checkPetName('  mister   shell ')).toEqual({ ok: true, name: 'Mister Shell' });
		expect(checkPetName('Zoë')).toEqual({ ok: true, name: 'Zoë' });
		expect(checkPetName("captain o'shell")).toEqual({ ok: true, name: "Captain O'shell" });
		expect(checkPetName('sir-turtle')).toEqual({ ok: true, name: 'Sir-Turtle' });
	});

	it('blocks numbers, links and emails (no phone numbers or addresses)', () => {
		for (const bad of ['Shelly 2', '555 1234', 'me@mail.com', 'www.site', 'Turtle!'])
			expect(checkPetName(bad)).toEqual({ ok: false, reason: 'letters' });
	});

	it('keeps it short', () => {
		expect(checkPetName('a'.repeat(PET_NAME_MAX + 1))).toEqual({ ok: false, reason: 'too_long' });
		expect(checkPetName('Al Bo Cy Di')).toEqual({ ok: false, reason: 'words' });
		expect(checkPetName('   ')).toEqual({ ok: false, reason: 'empty' });
	});

	it('blocks rude or unsafe words', () => {
		expect(checkPetName('Stupid')).toEqual({ ok: false, reason: 'rude' });
		expect(checkPetName('Knife')).toEqual({ ok: false, reason: 'rude' });
	});

	it('fits the database limit (1 to 30 characters)', () => {
		const r = checkPetName('Abcdefghijklmnop');
		expect(r.ok && r.name.length).toBeLessThanOrEqual(30);
	});
});
