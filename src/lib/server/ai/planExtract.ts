/**
 * STUB (owner: AI + integrations).
 *
 * Future behaviour: read a parenting-plan PDF (the model reads the PDF
 * directly as a `document` block) and return the custody template, start
 * date, exchange time and holiday rules as `PlanExtraction`. The caller then
 * writes `custody_schedules` + generated `events` (source = 'plan_pdf') and
 * stores the result in `documents.extracted`.
 *
 * Used by: POST /api/documents/parse-plan (parent only).
 */
import { z } from 'zod';

export const HolidayRule = z.object({
	name: z.string().describe('e.g. "Thanksgiving", "Winter break (first half)"'),
	rule: z.string().describe('Plain-language rule, e.g. "Odd years with Parent A"'),
	home: z.enum(['A', 'B', 'alternate']),
	start: z.string().date().optional(),
	end: z.string().date().optional()
});

export const PlanExtraction = z.object({
	template: z.enum(['2-2-3', 'week_on_week_off', 'alternate_weekends', 'custom']),
	startDate: z.string().date(),
	/** 24h local time "HH:MM". */
	exchangeTime: z.string().regex(/^\d{2}:\d{2}$/),
	startingHome: z.enum(['A', 'B']),
	holidayRules: z.array(HolidayRule),
	notes: z.string().optional(),
	/** 0..1, how sure the model is. Below 0.7 => ask the parent to confirm. */
	confidence: z.number().min(0).max(1)
});
export type PlanExtraction = z.infer<typeof PlanExtraction>;

export async function extractPlan(file: {
	bytes: Uint8Array;
	mime: string;
}): Promise<PlanExtraction> {
	if (file.mime !== 'application/pdf') {
		throw new Error('Only PDF parenting plans are supported');
	}
	return {
		template: '2-2-3',
		startDate: '2026-01-05',
		exchangeTime: '17:00',
		startingHome: 'A',
		holidayRules: [
			{
				name: 'Thanksgiving',
				rule: 'Odd years with Parent A, even years with Parent B',
				home: 'alternate'
			},
			{ name: 'Winter break (first half)', rule: 'Parent A every year', home: 'A' },
			{ name: 'Winter break (second half)', rule: 'Parent B every year', home: 'B' },
			{ name: "Child's birthday", rule: 'Split the day; exchange at 2 pm', home: 'alternate' }
		],
		notes: 'Exchanges happen at school when school is in session.',
		confidence: 0.82
	};
}
