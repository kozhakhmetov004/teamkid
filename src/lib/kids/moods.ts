/**
 * Check-in choices shown to the child (clicks only). Values map 1:1 onto the
 * DB check constraints of mood_checkins (mood text, energy 1–5).
 */
import type { Mood } from '#lib/types/domain.js';

export const CHECKIN_MOODS = [
	{ value: 'happy', label: 'Happy', icon: '😊' },
	{ value: 'calm', label: 'Calm', icon: '😌' },
	{ value: 'tired', label: 'Tired', icon: '🥱' },
	{ value: 'sad', label: 'Sad', icon: '😢' },
	{ value: 'worried', label: 'Worried', icon: '😟' },
	{ value: 'angry', label: 'Angry', icon: '😠' }
] as const satisfies readonly { value: Mood; label: string; icon: string }[];

export type CheckinMood = (typeof CHECKIN_MOODS)[number]['value'];
export const CHECKIN_MOOD_VALUES = CHECKIN_MOODS.map((m) => m.value) as [
	CheckinMood,
	...CheckinMood[]
];

/** Low = 1, Medium = 3, High = 5 (DB allows 1–5). "Low" in the insight rules means <= 2. */
export const ENERGY_LEVELS = [
	{ value: 1, label: 'Low', icon: '🪫' },
	{ value: 3, label: 'Medium', icon: '🔋' },
	{ value: 5, label: 'High', icon: '⚡' }
] as const;

export type EnergyValue = (typeof ENERGY_LEVELS)[number]['value'];
export const ENERGY_FORM_VALUES = ['1', '3', '5'] as const;
export const LOW_ENERGY_MAX = 2;

/** Big feelings: Pebble validates them and points to a trusted grown-up. */
export const BIG_FEELINGS: readonly CheckinMood[] = ['sad', 'worried', 'angry'];
