/**
 * Child profile (parent-edited) helpers. Pure; relative imports only.
 * Parent-noted interests stay separate from the child's own choices.
 */

/** "Horses, drawing,  lego" → ["Horses", "drawing", "lego"] (trimmed, unique, ≤ max items). */
export function parseList(input: string, max = 12, maxLen = 40): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const part of input.split(/[,\n;]/)) {
		const v = part.replace(/\s+/g, ' ').trim().slice(0, maxLen);
		if (!v || seen.has(v.toLowerCase())) continue;
		seen.add(v.toLowerCase());
		out.push(v);
		if (out.length === max) break;
	}
	return out;
}

/** Age in whole years on `today` (YYYY-MM-DD), from a birthday or a birth year. */
export function ageOn(today: string, birthday: string | null, birthYear: number): number {
	const years = Number(today.slice(0, 4)) - (birthday ? Number(birthday.slice(0, 4)) : birthYear);
	return birthday && today.slice(5) < birthday.slice(5) ? years - 1 : years;
}
