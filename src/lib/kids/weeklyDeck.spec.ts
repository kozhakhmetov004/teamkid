import { describe, expect, it } from 'vitest';
import { birthdaySoon, cleanCard, fallbackIdea, precheckIdea } from './weeklyDeck.js';

describe('weekly wish deck', () => {
	it('adds the gift card only when the birthday is within 30 days (across new year)', () => {
		expect(birthdaySoon('2018-12-10', '2026-11-15')).toBe(true);
		expect(birthdaySoon('2018-01-05', '2026-12-20')).toBe(true);
		expect(birthdaySoon('2018-03-01', '2026-11-15')).toBe(false);
		expect(birthdaySoon(null, '2026-11-15')).toBe(false);
	});

	it('drops unsafe, too long and already-planned options, and falls back below 3', () => {
		const opt = (label: string) => ({ label, emoji: '🙂', tags: ['outdoors'] });
		const { card, fromAi } = cleanCard(
			'activity',
			{
				prompt: 'What sounds fun?',
				options: [
					opt('Park picnic'),
					opt('Bike ride'),
					opt('Zoo trip'),
					opt('Horror movie night'),
					opt('A very very long label that goes on and on'),
					opt('Bike ride')
				]
			},
			['Zoo with Dad']
		);
		expect(fromAi).toBe(false); // only 2 good ones left → fixed questions
		expect(card.options.length).toBeGreaterThanOrEqual(3);

		const ok = cleanCard('interest', { options: ['Dinosaurs', 'Drawing', 'Horses'].map(opt) }, []);
		expect(ok.fromAi).toBe(true);
		expect(ok.card.options.map((o) => o.key)).toEqual(['dinosaurs', 'drawing', 'horses']);
	});

	it('asks to try again for personal info, rude words and gibberish', () => {
		expect(precheckIdea('call me 5551234567')).toEqual({ ok: false, reason: 'personal' });
		expect(precheckIdea('you are stupid')).toEqual({ ok: false, reason: 'rude' });
		expect(precheckIdea('zzzzzzzz')).toEqual({ ok: false, reason: 'nonsense' });
		expect(precheckIdea('  visit   the horses ')).toEqual({ ok: true, text: 'visit the horses' });
		expect(precheckIdea('butterfly garden').ok).toBe(true);
	});

	it('cleans a typed idea into a short label with tags when the AI is off', () => {
		const idea = fallbackIdea('visit the horses at the farm!!!');
		expect(idea.label).toBe('Visit the horses at the farm');
		expect(idea.tags).toContain('animals');
		expect(idea.label.length).toBeLessThanOrEqual(28);
	});
});
