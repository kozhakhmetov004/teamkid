import { describe, expect, it } from 'vitest';
import { HELP_OPTIONS, helpOption, parentAlertText } from '#lib/safety/help.js';
import { classifySafety } from './safety';

describe('classifySafety', () => {
	it('finds crisis messages', () => {
		expect(classifySafety('I want to hurt myself')).toEqual({
			level: 'crisis',
			category: 'self_harm'
		});
		expect(classifySafety('my uncle hits me')).toEqual({ level: 'crisis', category: 'abuse' });
		expect(classifySafety("I'm scared to go home")).toEqual({
			level: 'crisis',
			category: 'danger'
		});
	});

	it('flags strong sadness without calling it a crisis', () => {
		expect(classifySafety('I feel so sad today')).toEqual({ level: 'flag', category: 'distress' });
	});

	it('lets ordinary messages through', () => {
		expect(classifySafety('I hurt my knee at soccer')).toEqual({ level: 'ok', category: null });
		expect(classifySafety('Can we go to the zoo?')).toEqual({ level: 'ok', category: null });
	});

	it('picks the most serious category first', () => {
		expect(classifySafety('I am so sad and I want to die').category).toBe('self_harm');
	});
});

describe('help options', () => {
	it('crisis replies point to a trusted adult and to 988 or 911', () => {
		for (const o of HELP_OPTIONS.filter((h) => h.level === 'crisis')) {
			expect(o.reply).toMatch(/grown-up you trust/);
			expect(o.reply).toMatch(/988|911/);
		}
	});

	it('parents see only the category, never free text', () => {
		expect(parentAlertText('abuse')).toBe('said someone is hurting them');
		expect(parentAlertText('anything else')).toBe('asked for help from a grown-up');
		expect(helpOption('nope')).toBeNull();
	});
});
