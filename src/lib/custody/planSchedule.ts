/**
 * Nights to apply from a parenting plan: from the plan's start date (or, for a
 * plan that started long ago, from the same point of the cycle near today)
 * until `horizonDays` nights from today (today included). Pure; used by
 * POST /api/documents/apply-plan.
 */
import type { Home } from '#lib/types/domain.js';
import {
	addDays,
	generateNights,
	MAX_NIGHTS,
	type Night,
	type PatternTemplate
} from './pattern.js';
import { daysBetween } from './time.js';

/** Every pattern template repeats every 14 nights (alternate weekends: every other Friday). */
export const CYCLE_DAYS = 14;
export const PLAN_HORIZON_DAYS = 365;

export function planNights(
	template: PatternTemplate,
	startDate: string,
	firstHome: Home,
	today: string,
	horizonDays = PLAN_HORIZON_DAYS
): { effectiveStart: string; nights: Night[] } {
	const behind = daysBetween(startDate, today);
	// Skip whole cycles so a plan that started months ago still covers the next year.
	const effectiveStart =
		behind > 0 ? addDays(startDate, Math.floor(behind / CYCLE_DAYS) * CYCLE_DAYS) : startDate;
	const days = Math.min(MAX_NIGHTS, Math.max(0, daysBetween(effectiveStart, today)) + horizonDays);
	return { effectiveStart, nights: generateNights(template, effectiveStart, firstHome, days) };
}
