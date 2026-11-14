/**
 * Turning generated nights into custody night blocks for the events table,
 * plus labels for the "Set up schedule" form. Uses the shared generator in
 * pattern.ts (generateNights / PatternTemplate).
 */
import type { Home } from '#lib/types/domain.js';
import type { Night, PatternTemplate } from './pattern.js';
import { addDays } from './today.js';
import { zonedToUtc } from './time.js';

export const TEMPLATE_LABEL: Record<PatternTemplate, string> = {
	'2-2-3': '2-2-3 (alternating, 14-day cycle)',
	week_on_week_off: 'Week on / week off',
	alternate_weekends: 'Alternate weekends'
};

/**
 * Night blocks for the events table: each night starts at the exchange time
 * on its date and ends at the exchange time the next day (local time in `tz`).
 */
export function nightsToBlocks(
	nights: Night[],
	exchangeTime: string,
	tz: string
): { starts_at: string; ends_at: string; home: Home }[] {
	return nights.map((n) => ({
		starts_at: zonedToUtc(n.date, exchangeTime, tz).toISOString(),
		ends_at: zonedToUtc(addDays(n.date, 1), exchangeTime, tz).toISOString(),
		home: n.home
	}));
}
