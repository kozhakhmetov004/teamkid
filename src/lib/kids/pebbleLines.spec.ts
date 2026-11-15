import { describe, expect, it } from 'vitest';
import {
	BANNED_WORDS,
	CHECKIN_PROMPTS,
	HARD_DAYS_LINES,
	customizeThanks,
	MOOD_REPLIES,
	moodReply,
	greeting,
	progressOf,
	rewardLine,
	type DayProgress,
	WISH_LINES,
	wishAsk
} from './pebbleLines.js';
import { WISH_DECK } from './wishDeck.js';
import { BIG_FEELINGS, CHECKIN_MOODS } from './moods.js';
import type { PartOfDay } from './time.js';

const parts: PartOfDay[] = ['morning', 'afternoon', 'evening', 'night'];
const progresses: DayProgress[] = ['none', 'checkin', 'wishes', 'both'];
const away = [null, 0, 1, 2, 30];

function allLines(): string[] {
	const lines: string[] = [
		customizeThanks('Shelly'),
		rewardLine('Stars'),
		...Object.values(MOOD_REPLIES),
		...Object.values(CHECKIN_PROMPTS),
		...Object.values(HARD_DAYS_LINES),
		...Object.values(WISH_LINES),
		...WISH_DECK.flatMap((card) => card.options.map((o) => wishAsk(o.ask)))
	];
	for (const part of parts)
		for (const progress of progresses)
			for (const awayDays of away)
				lines.push(greeting({ firstName: 'Lily', part, progress, awayDays }));
	return lines;
}

describe('progressOf', () => {
	it('maps the two daily activities', () => {
		expect(progressOf(false, false)).toBe('none');
		expect(progressOf(true, false)).toBe('checkin');
		expect(progressOf(false, true)).toBe('wishes');
		expect(progressOf(true, true)).toBe('both');
	});
});

describe('greeting', () => {
	it('greets by name and time of day', () => {
		expect(greeting({ firstName: 'Lily', part: 'morning', progress: 'none', awayDays: 0 })).toMatch(
			/^Good morning, Lily!/
		);
	});

	it('says Pebble was napping after days away, never that it missed the child', () => {
		const line = greeting({ firstName: 'Lily', part: 'evening', progress: 'none', awayDays: 5 });
		expect(line).toContain('nap');
	});

	it('changes once things are done today', () => {
		expect(
			greeting({ firstName: 'Lily', part: 'afternoon', progress: 'both', awayDays: 0 })
		).toContain('proud');
	});

	it('never uses guilt, secrets or personal-info words', () => {
		for (const line of allLines()) {
			const lower = line.toLowerCase();
			for (const word of BANNED_WORDS) expect(lower, line).not.toContain(word);
		}
	});

	it('keeps lines short enough for a young reader', () => {
		for (const line of allLines()) expect(line.length, line).toBeLessThanOrEqual(140);
	});
});

describe('mood replies', () => {
	it('has a line for every check-in mood', () => {
		for (const m of CHECKIN_MOODS) expect(moodReply(m.value).length).toBeGreaterThan(10);
	});

	it('points to a trusted grown-up for big feelings', () => {
		for (const mood of BIG_FEELINGS) expect(moodReply(mood)).toMatch(/grown-up you trust/);
	});

	it('never diagnoses or gives advice beyond a grown-up', () => {
		for (const line of Object.values(MOOD_REPLIES)) {
			expect(line).not.toMatch(
				/depress|anxiety|disorder|therap|medic|doctor|you should|you must|don't tell/i
			);
		}
	});
});
