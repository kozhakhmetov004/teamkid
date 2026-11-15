import { describe, expect, it } from 'vitest';
import { moodToday } from './moodToday.js';

const TZ = 'America/Los_Angeles';
const TODAY = '2026-11-15';
// 4:12 pm on Nov 15 in Los Angeles.
const AT = '2026-11-16T00:12:00Z';

describe('moodToday', () => {
	it('shows a shared feeling with energy on the day it was shared', () => {
		expect(moodToday({ mood: 'calm', energy: 5, shared_at: AT }, TODAY, TZ)).toEqual({
			icon: '😌',
			feeling: 'calm',
			energy: { icon: '⚡', label: 'High' },
			tone: 'calm',
			hint: null,
			sharedAt: '4:12 PM'
		});
	});

	it('shows nothing when the child keeps it private, or when it was shared another day', () => {
		expect(moodToday(null, TODAY, TZ)).toBeNull();
		expect(moodToday({ mood: null, energy: null, shared_at: AT }, TODAY, TZ)).toBeNull();
		expect(moodToday({ mood: 'happy', energy: 3, shared_at: AT }, '2026-11-16', TZ)).toBeNull();
	});

	it('uses the parent time zone for "today"', () => {
		expect(moodToday({ mood: 'happy', energy: 3, shared_at: AT }, '2026-11-16', 'UTC')).not.toBe(
			null
		);
	});

	it('adds a gentle idea for big feelings and low energy, never an alarm', () => {
		const sad = moodToday({ mood: 'sad', energy: 3, shared_at: AT }, TODAY, TZ);
		expect(sad?.tone).toBe('heavy');
		expect(sad?.hint).toMatch(/cozy moment/);
		const tired = moodToday({ mood: 'tired', energy: 1, shared_at: AT }, TODAY, TZ);
		expect(tired?.energy?.label).toBe('Low');
		expect(tired?.hint).toMatch(/easy evening/);
	});

	it('works without energy and for moods outside the check-in list', () => {
		const r = moodToday({ mood: 'excited', energy: null, shared_at: AT }, TODAY, TZ);
		expect(r?.feeling).toBe('excited');
		expect(r?.energy).toBeNull();
		expect(moodToday({ mood: 'grumpy', energy: 3, shared_at: AT }, TODAY, TZ)).toBeNull();
	});
});
