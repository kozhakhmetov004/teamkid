import type { PatternTemplate } from '#lib/custody/pattern.js';
import type { Home } from '#lib/types/domain.js';

/** What the review form sends to POST /api/documents/apply-plan (with the documentId). */
export interface ApplyValues {
	template: PatternTemplate;
	startDate: string;
	firstHome: Home;
	exchangeTime: string;
	exchangePlace: string | null;
	holidays: { name: string; rule: string }[];
}
