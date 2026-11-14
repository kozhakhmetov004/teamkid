/**
 * STUB (owner: Kids' space; safety review: AI + integrations).
 *
 * Future behaviour: Pebble the turtle's reply to the child.
 *   1. Safety first: crisis keywords + classifier (src/lib/server/safety.ts).
 *      'crisis' => calm pre-written reply, trusted-adult prompt, 988 Lifeline,
 *      and a safety_alerts row for both parents (no child words stored there).
 *   2. Mostly scripted replies (greetings, check-in, tuck-in, wish cards).
 *   3. LLM only fills small gaps, behind the safety filter. Pebble never claims
 *      to be human, keeps no secrets, no romance, and nudges toward real people.
 * Raw messages may be stored in kid_chat_raw (child-only, deleted after 30 days).
 *
 * Used by: POST /api/pebble/reply (child only).
 */
import { classifySafety } from '../safety.js';

export type PebbleSafety = 'ok' | 'flag' | 'crisis';

export async function pebbleReply(
	childId: string,
	message: string
): Promise<{ reply: string; safety: PebbleSafety }> {
	void childId;
	if (classifySafety(message).level === 'crisis') {
		return {
			reply:
				'Thank you for telling me. That sounds really big, and you deserve help from a grown-up you trust right now. ' +
				'You can also call or text 988 any time. Want to take three slow turtle breaths with me while you find them?',
			safety: 'crisis'
		};
	}
	if (/tired|sleepy/i.test(message)) {
		return {
			reply: 'Turtles get sleepy too! Want to tuck into our shells and take 3 slow breaths?',
			safety: 'ok'
		};
	}
	return {
		reply: "I'm so happy you came to see me! What would you like to do today?",
		safety: 'ok'
	};
}
