/**
 * Incoming-message shield, rule-based part (pure, no AI).
 * Turns a co-parent's message into neutral facts and requests and a tone
 * label, so a parent can read what matters without the hostile wording.
 * Used as the fallback when the AI is off or fails, and to validate AI output.
 */

export type ShieldTone = 'calm' | 'tense' | 'hostile';

export interface ShieldResult {
	tone: ShieldTone;
	/** neutral statements of fact (dates, times, places, what happened) */
	facts: string[];
	/** things the sender asks you to do or answer */
	requests: string[];
	/** true when the AI produced it (false = rule-based) */
	ai: boolean;
}

export const MAX_ITEMS = 5;
export const MAX_ITEM_LEN = 200;

/** Insults, blame and sarcasm markers (word-boundary, case-insensitive). */
const HOSTILE = [
	/\b(idiot|stupid|pathetic|useless|lazy|selfish|liar|lying|crazy|psycho|joke|ridiculous|disgusting|incompetent|irresponsible|worst)\b/i,
	/\byou (always|never)\b/i,
	/\bas usual\b/i,
	/\btypical\b/i,
	/\b(shut up|screw you|grow up|get a life|how dare you|what is wrong with you)\b/i,
	/\b(wtf|damn|hell|crap)\b/i,
	/!{2,}/,
	/\?{2,}/
];

const REQUEST = [
	/\?\s*$/,
	/\b(can|could|would|will) you\b/i,
	/\bplease\b/i,
	/\b(i need|we need) you to\b/i,
	/\b(let me know|tell me|confirm|send me|make sure|don'?t forget|remember to)\b/i
];

const FACT = [
	/\b(mon|tue|wed|thu|fri|sat|sun)(day|s|\.)?\b/i,
	/\b(today|tonight|tomorrow|yesterday|weekend|next week|this week)\b/i,
	/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i,
	/\b\d{1,2}[/.-]\d{1,2}\b/,
	/\$\s?\d/,
	/\b(school|doctor|dentist|practice|class|game|pickup|pick up|drop ?off|appointment|bill|fee|flight|birthday)\b/i
];

export function hostileScore(text: string): number {
	let score = HOSTILE.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
	const letters = text.replace(/[^a-z]/gi, '');
	if (letters.length >= 12 && letters === letters.toUpperCase()) score += 2; // SHOUTING
	return score;
}

export function toneOf(text: string): ShieldTone {
	const s = hostileScore(text);
	return s === 0 ? 'calm' : s === 1 ? 'tense' : 'hostile';
}

export function splitSentences(text: string): string[] {
	return text
		.replace(/\r/g, '')
		.split(/(?<=[.!?])\s+|\n+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 1);
}

/** Remove blame/insult fragments and tidy up; '' when nothing neutral is left. */
export function neutralize(sentence: string): string {
	let s = sentence
		.replace(/\b(as usual|typical|for once|for a change|obviously|of course)\b,?/gi, '')
		.replace(
			/\b(you|you're|you are) (such an? |so )?(idiot|stupid|pathetic|useless|lazy|selfish|liar|crazy|psycho|joke|ridiculous|irresponsible|incompetent)\b/gi,
			''
		)
		.replace(/[!?]{2,}/g, (m) => m[0])
		.replace(/\s{2,}/g, ' ')
		.replace(/^[\s,;:-]+/, '')
		.trim();
	if (hostileScore(s) > 0 && !FACT.some((re) => re.test(s)) && !REQUEST.some((re) => re.test(s))) {
		return ''; // pure venting, nothing to act on
	}
	const letters = s.replace(/[^a-z]/gi, '');
	if (letters.length >= 12 && letters === letters.toUpperCase()) {
		s = s.toLowerCase();
	}
	if (!s) return '';
	return (s[0].toUpperCase() + s.slice(1)).slice(0, MAX_ITEM_LEN);
}

export function ruleShield(text: string): ShieldResult {
	const facts: string[] = [];
	const requests: string[] = [];
	for (const raw of splitSentences(text)) {
		const s = neutralize(raw);
		if (!s) continue;
		if (REQUEST.some((re) => re.test(s))) requests.push(s);
		else if (FACT.some((re) => re.test(s))) facts.push(s);
	}
	return {
		tone: toneOf(text),
		facts: [...new Set(facts)].slice(0, MAX_ITEMS),
		requests: [...new Set(requests)].slice(0, MAX_ITEMS),
		ai: false
	};
}

/**
 * Keep only clean AI items: trimmed, short, not hostile themselves, and every
 * number/time in them must appear in the original (no invented details).
 */
export function cleanItems(items: string[], original: string): string[] {
	const nums = (s: string) => s.match(/\d+(?::\d{2})?/g) ?? [];
	const known = new Set(nums(original));
	return [
		...new Set(
			items
				.map((i) => i.trim().replace(/\s+/g, ' '))
				.filter((i) => i.length > 1 && i.length <= MAX_ITEM_LEN)
				.filter((i) => hostileScore(i) === 0)
				.filter((i) => nums(i).every((n) => known.has(n)))
		)
	].slice(0, MAX_ITEMS);
}
