/**
 * "Tuck in" with Pebble: the Turtle Technique (README Kids' space).
 *   notice the feeling → stop → tuck into your shell and take 3 slow breaths → come out.
 * Nothing here is saved or sent anywhere: it's a calming exercise, not a tracker.
 */

export type TuckStepKey = 'notice' | 'stop' | 'tuck' | 'out';

export interface TuckStep {
	key: TuckStepKey;
	title: string;
	line: string;
	button: string;
}

export const TUCK_STEPS: readonly TuckStep[] = [
	{
		key: 'notice',
		title: 'How does your body feel?',
		line: 'Big feelings are okay. Let’s notice them together.',
		button: 'I noticed'
	},
	{
		key: 'stop',
		title: 'Stop, like a turtle',
		line: 'Turtles stop and stay still. Put your hands on your tummy.',
		button: 'I stopped'
	},
	{
		key: 'tuck',
		title: 'Tuck in and breathe',
		line: 'Into our shells! Breathe in slowly… and out slowly.',
		button: 'Come out'
	},
	{
		key: 'out',
		title: 'Come out and try again',
		line: 'You did it! Now we can think about what to do next.',
		button: 'Back to Pebble'
	}
];

/** The feelings a child can tap on the first step (only used for Pebble's reply). */
export const TUCK_FEELINGS = [
	{ key: 'angry', emoji: '😠', label: 'Angry' },
	{ key: 'worried', emoji: '😟', label: 'Worried' },
	{ key: 'sad', emoji: '😢', label: 'Sad' },
	{ key: 'wiggly', emoji: '🌀', label: 'Wiggly' }
] as const;

export type TuckFeeling = (typeof TUCK_FEELINGS)[number]['key'];

export function feelingLine(feeling: TuckFeeling | null): string {
	switch (feeling) {
		case 'angry':
			return 'Angry is a big feeling. Turtles feel it too.';
		case 'worried':
			return 'Worried feelings can feel heavy. Let’s make them lighter.';
		case 'sad':
			return 'It’s okay to feel sad. I’m right here with you.';
		case 'wiggly':
			return 'Wiggly bodies like slow breaths. Let’s try!';
		default:
			return TUCK_STEPS[0].line;
	}
}

export const BREATHS = 3;
export const IN_MS = 4000;
export const OUT_MS = 5000;
export const BREATH_MS = IN_MS + OUT_MS;
export const TUCK_TOTAL_MS = BREATHS * BREATH_MS;

export interface BreathState {
	/** 1..BREATHS */
	breath: number;
	phase: 'in' | 'out';
	/** 0..1 through the current phase */
	progress: number;
	/** 0..1 size of the breathing bubble (grows on in, shrinks on out) */
	size: number;
	done: boolean;
}

/** Where the breathing guide is after `elapsedMs` (pure, so it's easy to test). */
export function breathAt(elapsedMs: number): BreathState {
	const t = Math.max(0, elapsedMs);
	if (t >= TUCK_TOTAL_MS) {
		return { breath: BREATHS, phase: 'out', progress: 1, size: 0, done: true };
	}
	const breath = Math.floor(t / BREATH_MS) + 1;
	const inBreath = t % BREATH_MS;
	if (inBreath < IN_MS) {
		const progress = inBreath / IN_MS;
		return { breath, phase: 'in', progress, size: progress, done: false };
	}
	const progress = (inBreath - IN_MS) / OUT_MS;
	return { breath, phase: 'out', progress, size: 1 - progress, done: false };
}
