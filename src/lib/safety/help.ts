/**
 * "I need a grown-up" (kids' space crisis flow, README safety rule 7).
 * Preset choices only (no free text): each maps to an alert level and
 * category, and Pebble answers with a calm, pre-written reply. Shared by the
 * kid page (labels) and the server (level/category); pure, no I/O.
 *
 * NOTE: copy must be reviewed by child-protection experts before launch.
 */

export type HelpLevel = 'flag' | 'crisis';
export type HelpCategory = 'danger' | 'abuse' | 'self_harm' | 'distress';

export interface HelpOption {
	key: HelpCategory;
	emoji: string;
	label: string;
	level: HelpLevel;
	reply: string;
}

const TRUSTED =
	'Please tell a grown-up you trust right now, like a parent, a teacher or the school nurse.';
const LIFELINE = 'You can also call or text 988 any time. It’s free, and kind people answer.';

export const HELP_OPTIONS: readonly HelpOption[] = [
	{
		key: 'danger',
		emoji: '🚨',
		label: 'I don’t feel safe',
		level: 'crisis',
		reply: `Thank you for telling me. Your safety matters most. If you are in danger right now, call 911. ${TRUSTED}`
	},
	{
		key: 'abuse',
		emoji: '🛑',
		label: 'Someone is hurting me',
		level: 'crisis',
		reply: `Thank you for being so brave. It is never your fault. ${TRUSTED} ${LIFELINE}`
	},
	{
		key: 'self_harm',
		emoji: '💔',
		label: 'I want to hurt myself',
		level: 'crisis',
		reply: `I’m really glad you told me. You deserve help and you are not alone. ${LIFELINE} ${TRUSTED}`
	},
	{
		key: 'distress',
		emoji: '😢',
		label: 'I feel really sad',
		level: 'flag',
		reply:
			'Sad feelings can be really heavy. A hug and a talk with a grown-up you trust can help a lot. Want to tuck in and take three turtle breaths with me?'
	}
];

export function helpOption(key: string): HelpOption | null {
	return HELP_OPTIONS.find((o) => o.key === key) ?? null;
}

/** What parents see (both the same). Never the child's words: only the category. */
export const PARENT_ALERT_TEXT: Record<HelpCategory, string> = {
	danger: 'said they don’t feel safe',
	abuse: 'said someone is hurting them',
	self_harm: 'said they want to hurt themselves',
	distress: 'said they feel really sad'
};

export function parentAlertText(category: string | null): string {
	return category && category in PARENT_ALERT_TEXT
		? PARENT_ALERT_TEXT[category as HelpCategory]
		: 'asked for help from a grown-up';
}
