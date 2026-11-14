import { describe, expect, it } from 'vitest';
import { cleanItems, neutralize, ruleShield, toneOf } from './shieldRules';

const hostile =
	"You ALWAYS do this, you are so irresponsible!! Lily's dentist is Thursday at 4pm. " +
	'Can you pick her up from school on Friday? Typical.';

describe('toneOf', () => {
	it('labels calm, tense and hostile messages', () => {
		expect(toneOf('Pickup is at 5pm on Friday. Thanks!')).toBe('calm');
		expect(toneOf('You never reply on time.')).toBe('tense');
		expect(toneOf(hostile)).toBe('hostile');
		expect(toneOf('WHERE ARE HER SHOES I NEED THEM NOW')).toBe('hostile');
	});
});

describe('ruleShield', () => {
	it('keeps the facts and the request, drops the insults', () => {
		const r = ruleShield(hostile);
		expect(r.facts).toEqual(["Lily's dentist is Thursday at 4pm."]);
		expect(r.requests).toEqual(['Can you pick her up from school on Friday?']);
		expect(r.ai).toBe(false);
		const all = [...r.facts, ...r.requests].join(' ');
		expect(all).not.toMatch(/irresponsible|typical|always/i);
	});

	it('returns nothing to act on for pure venting', () => {
		const r = ruleShield('You are pathetic. Typical!!');
		expect(r.facts).toEqual([]);
		expect(r.requests).toEqual([]);
	});

	it('limits the number of items', () => {
		const many = Array.from({ length: 9 }, (_, i) => `Can you bring item ${i}?`).join(' ');
		expect(ruleShield(many).requests).toHaveLength(5);
	});
});

describe('neutralize', () => {
	it('removes blame words but keeps the meaning', () => {
		expect(neutralize('As usual, you never sent the form by Monday.')).toBe(
			'You never sent the form by Monday.'
		);
	});
});

describe('cleanItems', () => {
	it('drops invented numbers and hostile items', () => {
		const original = 'Dentist Thursday at 4pm.';
		expect(
			cleanItems(['Dentist is Thursday at 4pm', 'Dentist is at 5pm', 'You are useless'], original)
		).toEqual(['Dentist is Thursday at 4pm']);
	});
});
