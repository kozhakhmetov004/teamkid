/**
 * Which family home a parent named in the plan ("Mother", "Alex Carter") is.
 * Only a pre-fill for the review form: returns null unless the match is clear,
 * and the parent always confirms it. Pure; unit-tested.
 */
import type { Home } from '#lib/types/domain.js';

export interface FamilyParent {
	home: string | null;
	display_name: string;
}

const MOTHER = /\b(mother|mom|mum|mommy|mama|madre|mamá|mami)\b/i;
const FATHER = /\b(father|dad|daddy|papa|padre|papá|papi)\b/i;

const words = (s: string) =>
	s
		.toLowerCase()
		.split(/[^\p{L}]+/u)
		.filter((w) => w.length > 1);

const isHome = (h: string | null): h is Home => h === 'A' || h === 'B';

export function guessHome(label: string | null, parents: FamilyParent[]): Home | null {
	if (!label) return null;
	const withHome = parents.filter((p) => isHome(p.home));

	// 1. A name in the plan that matches a parent's display name ("Megan Carter" ~ "Megan").
	const labelWords = new Set(words(label));
	const byName = withHome.filter((p) => words(p.display_name).some((w) => labelWords.has(w)));
	if (byName.length === 1) return byName[0].home as Home;

	// 2. A role word ("Mother") that matches exactly one parent's display name ("Mom").
	for (const [role, opposite] of [
		[MOTHER, FATHER],
		[FATHER, MOTHER]
	] as const) {
		if (!role.test(label)) continue;
		const same = withHome.filter((p) => role.test(p.display_name));
		if (same.length === 1) return same[0].home as Home;
		// Only the other role is named ("Dad"): the plan's parent is the other home.
		const other = withHome.filter((p) => opposite.test(p.display_name));
		if (same.length === 0 && other.length === 1) return other[0].home === 'A' ? 'B' : 'A';
	}
	return null;
}
