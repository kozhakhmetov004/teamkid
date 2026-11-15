import { describe, expect, it } from 'vitest';
import { decideAdd } from '../server/planSwap.js';
import { fallbackQuestion, isRepeat, replaceableIds } from './dailyCards.js';

describe('daily wish cards + planner swaps', () => {
	it('never repeats a question from the last 14 days', () => {
		expect(isRepeat('What made you laugh today?', ['What made you laugh today?'])).toBe(true);
		expect(isRepeat('What made you laugh so much today?', ['What made you laugh today?'])).toBe(
			true
		);
		expect(isRepeat('What is your favorite snack?', ['What made you laugh today?'])).toBe(false);

		// The bank skips everything she saw recently, whatever day it rotates to.
		const recent: string[] = [];
		for (let i = 0; i < 6; i++) {
			const q = fallbackQuestion('everyday', recent, '2026-11-16');
			expect(isRepeat(q.prompt, recent)).toBe(false);
			recent.push(q.prompt);
		}
	});

	it('only replaces cards she has not answered on a refresh', () => {
		const questions = [{ id: 'q1' }, { id: 'q2' }];
		expect(replaceableIds(questions, ['q1', null])).toEqual(['q2']);
		expect(replaceableIds(questions, ['q1', 'q2'])).toEqual([]);
	});

	it("asks to swap (never adds a plain event) on the other parent's day", () => {
		const nights = new Map([
			['2026-11-20', 'B'],
			['2026-11-21', 'B'],
			['2026-11-24', 'A']
		]);
		const base = {
			myHome: 'A',
			slotNight: { date: '2026-11-21', home: 'B' },
			nights,
			today: '2026-11-15'
		};
		expect(decideAdd({ ...base, wantsSwap: false })).toEqual({
			kind: 'ask',
			nightDate: '2026-11-21'
		});
		expect(decideAdd({ ...base, wantsSwap: true })).toEqual({
			kind: 'swap',
			nightDate: '2026-11-21',
			giveBack: '2026-11-24'
		});
		expect(
			decideAdd({ ...base, slotNight: { date: '2026-11-24', home: 'A' }, wantsSwap: false })
		).toEqual({ kind: 'event' });
	});
});
