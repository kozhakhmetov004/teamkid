/**
 * Pebble's scripted lines. Short words a 6-year-old can read.
 *
 * Rules (README child-safety): Pebble is a turtle friend, never claims to be
 * human, never asks for personal info, keeps no secrets, and never uses guilt
 * (no streaks, no "I missed you", no sad or sick Pebble). If the child was away,
 * Pebble was just napping.
 */
import type { CheckinMood } from './moods.js';
import type { PartOfDay } from './time.js';

export type DayProgress = 'none' | 'checkin' | 'wishes' | 'both';

export function progressOf(checkedInToday: boolean, wishedToday: boolean): DayProgress {
	if (checkedInToday && wishedToday) return 'both';
	if (checkedInToday) return 'checkin';
	if (wishedToday) return 'wishes';
	return 'none';
}

const HELLO: Record<PartOfDay, string> = {
	morning: 'Good morning',
	afternoon: 'Good afternoon',
	evening: 'Good evening',
	night: 'Hi there, night owl'
};

const NEXT: Record<DayProgress, string> = {
	none: 'How are you today? Tap a big button to start!',
	checkin: 'Thanks for telling me how you feel. Want to try some wish cards?',
	wishes: 'I love your wishes! Want to tell me how you feel today?',
	both: 'You did it all today! I am a very proud turtle.'
};

/**
 * The greeting in Pebble's speech bubble.
 * @param awayDays whole days since the child last did anything (null = first time).
 */
export function greeting(input: {
	firstName: string;
	part: PartOfDay;
	progress: DayProgress;
	awayDays: number | null;
}): string {
	const hello = `${HELLO[input.part]}, ${input.firstName}!`;
	if (input.progress === 'none' && input.awayDays !== null && input.awayDays >= 2) {
		return `${hello} I just had a long, cozy nap in my shell. ${NEXT.none}`;
	}
	if (input.progress === 'none' && input.awayDays === null) {
		return `${hello} I'm a turtle, and I'm so glad you're here. ${NEXT.none}`;
	}
	return `${hello} ${NEXT[input.progress]}`;
}

/** What Pebble says after the child changes its name or colour. */
export function customizeThanks(name: string): string {
	return `I love it! You can call me ${name}.`;
}

/** What Pebble says when a new shell pattern is unlocked. */
export function rewardLine(patternLabel: string): string {
	return `Wow, a new shell pattern: ${patternLabel}! Thank you!`;
}

/**
 * Pebble's reply after a check-in. Kind, scripted, never a diagnosis or advice
 * beyond suggesting a trusted grown-up for big feelings.
 */
export const MOOD_REPLIES: Record<CheckinMood, string> = {
	happy: 'Yay! Your happy feeling makes my shell feel warm and sunny.',
	calm: 'Calm like a slow turtle in the sun. That sounds nice.',
	tired: 'Thanks for telling me. Want to rest your shell for a minute?',
	sad: 'Thanks for telling me. Feelings come and go. It can help to tell a grown-up you trust.',
	worried: 'Thanks for telling me. Worries can feel big. It can help to tell a grown-up you trust.',
	angry:
		'Thanks for telling me. Angry feelings are okay. Let’s take three slow turtle breaths. A grown-up you trust can help too.'
};

export function moodReply(mood: CheckinMood): string {
	return MOOD_REPLIES[mood];
}

/** Pebble's prompts during the check-in. */
export const CHECKIN_PROMPTS = {
	mood: 'How do you feel today? Tap a face.',
	energy: 'Thanks! How much energy do you have?'
} as const;

/** Pebble during the wish cards (fixed deck text only, never typed words). */
export const WISH_LINES = {
	start: 'Let’s play wish cards! Pick the one you like best.',
	skip: 'Something else? No problem! Here’s another card.',
	sharedYes: 'Okay! I’ll tell Mom and Dad. You can change your mind any time.',
	sharedNo: 'Okay, that one is just for us. That’s totally fine!',
	done: 'Thanks for playing! Those were great wishes.',
	end: 'You saw all my cards! Great wishes today.'
} as const;

export function wishAsk(ask: string): string {
	return `Want me to tell Mom and Dad you’d love to ${ask}?`;
}

/** Words Pebble must never use with a child (checked by tests). */
export const BANNED_WORDS = [
	'streak',
	'missed',
	'miss you',
	'sad without',
	'sick',
	'lonely',
	'disappointed',
	'secret',
	'address',
	'phone',
	'school name',
	'photo',
	"i'm human",
	'i am human'
] as const;
