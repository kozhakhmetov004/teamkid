import { describe, expect, it } from 'vitest';
import { BREATHS, breathAt, feelingLine, IN_MS, OUT_MS, TUCK_STEPS, TUCK_TOTAL_MS } from './tuckIn';

describe('breathAt', () => {
	it('starts the first breath in', () => {
		expect(breathAt(0)).toMatchObject({ breath: 1, phase: 'in', size: 0, done: false });
	});

	it('is full at the top of the in-breath, then shrinks', () => {
		const top = breathAt(IN_MS);
		expect(top.phase).toBe('out');
		expect(top.size).toBeCloseTo(1);
		expect(breathAt(IN_MS + OUT_MS / 2).size).toBeCloseTo(0.5);
	});

	it('counts breaths and finishes after three', () => {
		expect(breathAt(IN_MS + OUT_MS + 1).breath).toBe(2);
		expect(breathAt(TUCK_TOTAL_MS - 1)).toMatchObject({ breath: BREATHS, done: false });
		expect(breathAt(TUCK_TOTAL_MS).done).toBe(true);
		expect(breathAt(TUCK_TOTAL_MS * 5).done).toBe(true);
	});

	it('clamps negative time', () => {
		expect(breathAt(-500)).toMatchObject({ breath: 1, phase: 'in', size: 0 });
	});
});

describe('tuck-in copy', () => {
	it('follows the Turtle Technique order', () => {
		expect(TUCK_STEPS.map((s) => s.key)).toEqual(['notice', 'stop', 'tuck', 'out']);
	});

	it('has a gentle line for every feeling and a default', () => {
		for (const f of ['angry', 'worried', 'sad', 'wiggly'] as const) {
			expect(feelingLine(f).length).toBeGreaterThan(10);
		}
		expect(feelingLine(null)).toBe(TUCK_STEPS[0].line);
	});
});
