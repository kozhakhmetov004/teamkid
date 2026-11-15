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

export const MIN_AGE = 3;
export const MAX_AGE = 18;

/** Allowed birthday range for the date picker (so it doesn't open on this year). */
export function birthdayRange(today: string): { min: string; max: string } {
	const y = Number(today.slice(0, 4));
	return { min: `${y - MAX_AGE}-01-01`, max: `${y - MIN_AGE}${today.slice(4)}` };
}

/**
 * Why a birthday can't be right, or null. Catches the common slip of picking
 * this year in the date picker (age 0), which would also overwrite birth_year.
 */
export function birthdayProblem(birthday: string, today: string): string | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || Number.isNaN(Date.parse(birthday))) {
		return 'Enter a date';
	}
	if (birthday > today) return 'The birthday can’t be in the future';
	const age = ageOn(today, birthday, 0);
	if (age < MIN_AGE || age > MAX_AGE) {
		return `That makes them ${age} years old. Check the year (TeamKid is for ages ${MIN_AGE}–${MAX_AGE}).`;
	}
	return null;
}

/** "Lily turns 9" when `date` is the birthday (Feb 29 → Feb 28 in other years), else null. */
export function birthdayOn(date: string, birthday: string | null, name: string): string | null {
	if (!birthday) return null;
	let md = birthday.slice(5);
	const leap = new Date(Date.UTC(Number(date.slice(0, 4)), 1, 29)).getUTCMonth() === 1;
	if (md === '02-29' && !leap) md = '02-28';
	if (date.slice(5) !== md) return null;
	const age = Number(date.slice(0, 4)) - Number(birthday.slice(0, 4));
	return age > 0 ? `${name} turns ${age}` : null;
}

/** Age in whole years on `today` (YYYY-MM-DD), from a birthday or a birth year. */
export function ageOn(today: string, birthday: string | null, birthYear: number): number {
	const years = Number(today.slice(0, 4)) - (birthday ? Number(birthday.slice(0, 4)) : birthYear);
	return birthday && today.slice(5) < birthday.slice(5) ? years - 1 : years;
}
