import { describe, expect, it } from 'vitest';
import { checkFacts, extractFacts } from './factCheck.js';

const texts = (s: string, names?: string[]) => extractFacts(s, names).map((f) => f.text);

describe('extractFacts', () => {
	it('finds times, weekdays, numbers and keeps ALL CAPS words out of names', () => {
		const draft =
			"You're late AGAIN. Lily waited 40 minutes. Be there at 5pm Friday or I'm calling my lawyer.";
		expect(texts(draft)).toEqual(['5pm', '40', 'Friday']);
		expect(texts(draft, ['Lily', 'Mom'])).toEqual(['5pm', '40', 'Friday', 'Lily']);
	});

	it('finds dates, ordinals, money and mid-sentence names', () => {
		expect(texts('Pick up at Oakwood on 11/19 and bring $45.50 for Sat 19th.')).toEqual([
			'11/19',
			'$45.50',
			'19th',
			'Oakwood',
			'Sat'
		]);
	});

	it('ignores lowercase abbreviations and month words without a number', () => {
		expect(texts('I sat down. You may come in March, or on May 3.')).toEqual(['3', 'March', 'May']);
		expect(texts('May I call you? We march on.')).toEqual([]);
	});

	it('handles Spanish weekdays, months and sentence starts', () => {
		expect(texts('¿Podemos cambiar el sábado 19 de noviembre? Llego a las 17:00.')).toEqual([
			'17:00',
			'19',
			'sábado',
			'noviembre'
		]);
	});
});

describe('checkFacts', () => {
	it('accepts a calm rewrite that keeps every fact', () => {
		const result = checkFacts(
			"You're late AGAIN. Lily waited 40 minutes. Be there at 5pm Friday or I'm calling my lawyer.",
			'Lily waited 40 minutes today. Please be there at 5:00 pm on Friday.',
			['Lily']
		);
		expect(result).toEqual({ ok: true, missing: [], added: [] });
	});

	it('treats equivalent spellings as the same fact', () => {
		expect(
			checkFacts('See you Fri at 17:00, $45 owed.', 'See you Friday at 5pm; 45 owed.').ok
		).toBe(true);
		expect(checkFacts('Pickup at 5:00.', 'Pickup at 5:00 pm.').ok).toBe(true);
		expect(checkFacts('Lunch at noon', 'Lunch at 12pm').ok).toBe(true);
	});

	it('reports dropped facts as written in the draft', () => {
		const result = checkFacts('Be there at 5pm Friday with Lily.', 'Please be on time.', ['Lily']);
		expect(result.ok).toBe(false);
		expect(result.missing).toEqual(['5pm', 'Friday', 'Lily']);
	});

	it('reports invented times, numbers and days', () => {
		const result = checkFacts(
			'Please stick to the pickup time.',
			'Please stick to 5:00 pm, or tell me by 3:00 pm on Friday.'
		);
		expect(result.ok).toBe(false);
		expect(result.added).toEqual(['5:00 pm', '3:00 pm', 'Friday']);
	});

	it('allows added greetings and names-free wording changes', () => {
		expect(checkFacts('can we swap weekends', 'Hi, could we swap weekends? Thanks.').ok).toBe(true);
	});

	it('matches names case-insensitively and with possessives', () => {
		expect(checkFacts("LILY's bag", "Lily's bag", ['Lily']).ok).toBe(true);
	});

	it('splits multi-word known names', () => {
		expect(checkFacts('Dana said hi', 'She said hi', ['Dana Carter']).missing).toEqual(['Dana']);
	});
});
