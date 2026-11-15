/**
 * "Lily feels calm today" for the parents' Today page. Built only from
 * shared_moods (what the child chose to tell them), never from mood_checkins.
 * Shown only on the day it was shared (parent's time zone) and only while the
 * child still shares it.
 */
import { localDate, timeLabel } from '#lib/custody/today.js';
import type { Mood } from '#lib/types/domain.js';
import { BIG_FEELINGS, CHECKIN_MOODS, ENERGY_LEVELS, LOW_ENERGY_MAX } from './moods.js';

export type MoodTone = 'sunny' | 'calm' | 'sleepy' | 'heavy' | 'stormy';

export type MoodToday = {
	icon: string;
	/** Lower case, reads in a sentence: "feels calm". */
	feeling: string;
	energy: { icon: string; label: string } | null;
	tone: MoodTone;
	/** A gentle idea for big feelings and low energy; never an alarm. */
	hint: string | null;
	sharedAt: string;
};

// The check-in offers 6 moods; the DB also allows 'excited' and 'okay'.
const EXTRA_MOODS = [
	{ value: 'excited', label: 'Excited', icon: '🤩' },
	{ value: 'okay', label: 'Okay', icon: '🙂' }
] as const;

const TONES: Record<Mood, MoodTone> = {
	happy: 'sunny',
	excited: 'sunny',
	calm: 'calm',
	okay: 'calm',
	tired: 'sleepy',
	sad: 'heavy',
	worried: 'heavy',
	angry: 'stormy'
};

export function moodToday(
	row: { mood: string | null; energy: number | null; shared_at: string } | null,
	today: string,
	tz: string
): MoodToday | null {
	if (!row?.mood || localDate(row.shared_at, tz) !== today) return null;
	const mood = [...CHECKIN_MOODS, ...EXTRA_MOODS].find((m) => m.value === row.mood);
	if (!mood) return null;

	const level =
		row.energy === null
			? undefined
			: [...ENERGY_LEVELS].reverse().find((l) => (row.energy ?? 0) >= l.value);
	const big = (BIG_FEELINGS as readonly string[]).includes(mood.value);
	const low = row.energy !== null && row.energy <= LOW_ENERGY_MAX;

	return {
		icon: mood.icon,
		feeling: mood.label.toLowerCase(),
		energy: level ? { icon: level.icon, label: level.label } : null,
		tone: TONES[mood.value],
		hint: big
			? 'A quiet, cozy moment together might help today.'
			: low
				? 'An easy evening might feel good today.'
				: null,
		sharedAt: timeLabel(row.shared_at, tz)
	};
}
