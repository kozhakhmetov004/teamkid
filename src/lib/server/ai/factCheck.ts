/**
 * Facts-preserved check for the message rewrite. A rewrite may change tone,
 * never facts: every time, date, weekday, month, number, amount and name in
 * the draft must still be in the rewrite, and the rewrite must not add new
 * times, dates, weekdays or numbers.
 *
 * Facts are compared by meaning, not spelling: "5pm" = "5:00 pm" = "17:00",
 * "Fri" = "Friday" = "viernes", "$45" = "45". Names are matched case-insensitively.
 * Pure functions, no I/O.
 */

/** A fact found in a text. `keys` are its normalised forms; any one match counts. */
export interface Fact {
	text: string;
	keys: string[];
}

export interface FactCheckResult {
	ok: boolean;
	/** Draft facts missing from the rewrite, as written in the draft. */
	missing: string[];
	/** Rewrite facts (times, dates, weekdays, numbers) that the draft doesn't have. */
	added: string[];
}

const WEEKDAYS: Record<string, number> = {
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
	sunday: 7,
	lunes: 1,
	martes: 2,
	miércoles: 3,
	miercoles: 3,
	jueves: 4,
	viernes: 5,
	sábado: 6,
	sabado: 6,
	domingo: 7
};
/** Abbreviations only count when capitalised ("Sat", not "I sat"). */
const WEEKDAY_ABBR: Record<string, number> = {
	mon: 1,
	tue: 2,
	tues: 2,
	wed: 3,
	thu: 4,
	thur: 4,
	thurs: 4,
	fri: 5,
	sat: 6,
	sun: 7
};
const MONTHS: Record<string, number> = {
	january: 1,
	february: 2,
	march: 3,
	april: 4,
	may: 5,
	june: 6,
	july: 7,
	august: 8,
	september: 9,
	october: 10,
	november: 11,
	december: 12,
	enero: 1,
	febrero: 2,
	marzo: 3,
	abril: 4,
	mayo: 5,
	junio: 6,
	julio: 7,
	agosto: 8,
	septiembre: 9,
	setiembre: 9,
	octubre: 10,
	noviembre: 11,
	diciembre: 12
};
const MONTH_ABBR: Record<string, number> = {
	jan: 1,
	feb: 2,
	mar: 3,
	apr: 4,
	jun: 6,
	jul: 7,
	aug: 8,
	sep: 9,
	sept: 9,
	oct: 10,
	nov: 11,
	dec: 12
};
/**
 * English words that are also month names; they count next to a number ("May 3")
 * or capitalised mid-sentence ("in March"), not as "you may" or "May I".
 */
const AMBIGUOUS_MONTHS = new Set(['may', 'march']);

/** Capitalised words that are not names even mid-sentence. */
const NOT_NAMES = new Set(['i', 'ok', 'okay', 'pm', 'am', 'mr', 'mrs', 'ms', 'dr']);

const isUpper = (s: string) => s === s.toUpperCase() && s !== s.toLowerCase();
const isCapitalised = (s: string) => isUpper(s[0]) && s.slice(1) !== s.slice(1).toUpperCase();

function normNumber(raw: string): string {
	// "1,200" => 1200 (thousands); "45,50" => 45.5 (decimal comma)
	const s = /^\d{1,3}(,\d{3})+$/.test(raw) ? raw.replace(/,/g, '') : raw.replace(',', '.');
	return String(Number(s));
}

/** Pull facts out of a text. `names` are extra names to look for anywhere (e.g. family members). */
export function extractFacts(text: string, names: string[] = []): Fact[] {
	const facts: Fact[] = [];
	// Matched spans are blanked out so a time isn't counted again as numbers.
	let rest = text;
	const take = (re: RegExp, toFact: (m: RegExpExecArray) => Fact | null) => {
		rest = rest.replace(re, (...args) => {
			const m = args.slice(0, -2) as unknown as RegExpExecArray;
			const fact = toFact(m);
			if (!fact) return m[0];
			facts.push(fact);
			return ' '.repeat(m[0].length);
		});
	};

	// Times with am/pm: 5pm, 5 pm, 5:30 p.m.
	take(/\b(\d{1,2})(?::([0-5]\d))?\s*([ap])\.?\s?m\b\.?/gi, (m) => {
		const h = Number(m[1]);
		if (h < 1 || h > 12) return null;
		const minutes = ((h % 12) + (m[3].toLowerCase() === 'p' ? 12 : 0)) * 60 + Number(m[2] ?? 0);
		return { text: m[0].trim(), keys: [`time:${minutes}`] };
	});
	// 24h or bare clock times: 17:00, 5:00 (5:00 could be am or pm).
	take(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (m) => {
		const h = Number(m[1]);
		const minutes = h * 60 + Number(m[2]);
		const keys = [`time:${minutes}`];
		if (h >= 1 && h < 12) keys.push(`time:${minutes + 12 * 60}`);
		if (h === 12) keys.push(`time:${Number(m[2])}`);
		return { text: m[0], keys };
	});
	take(/\b(noon|midday|mediod[ií]a)\b/gi, (m) => ({ text: m[0], keys: ['time:720'] }));
	take(/\b(midnight|medianoche)\b/gi, (m) => ({ text: m[0], keys: ['time:0'] }));

	// ISO dates 2026-11-19 and numeric dates 11/19, 11/19/2026.
	take(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m) => ({
		text: m[0],
		keys: [`date:${Number(m[2])}/${Number(m[3])}`]
	}));
	take(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g, (m) => ({
		text: m[0],
		keys: [`date:${Number(m[1])}/${Number(m[2])}`, `date:${Number(m[2])}/${Number(m[1])}`]
	}));

	// Money and other numbers (ordinals like 19th count as the number 19).
	take(/\$\s?(\d[\d,]*(?:\.\d+)?)/g, (m) => ({ text: m[0], keys: [`num:${normNumber(m[1])}`] }));
	take(/\b(\d[\d,]*(?:\.\d+)?)(?:st|nd|rd|th|º|°)?\b/gi, (m) => ({
		text: m[0],
		keys: [`num:${normNumber(m[1])}`]
	}));

	// Words: weekdays, months, names.
	const words = [...rest.matchAll(/[\p{L}][\p{L}'’]*/gu)];
	const hasNumberNear = (index: number, length: number) =>
		/\d/.test(text.slice(Math.max(0, index - 4), index + length + 4));
	for (const w of words) {
		const raw = w[0].replace(/['’]s$/i, '');
		const lower = raw.toLowerCase();
		const index = w.index ?? 0;
		const before = text.slice(0, index).trimEnd();
		const sentenceStart = before === '' || /[.!?¡¿:\n"“]$/.test(before);
		if (lower in WEEKDAYS) {
			facts.push({ text: raw, keys: [`wd:${WEEKDAYS[lower]}`] });
		} else if (lower in WEEKDAY_ABBR && isUpper(raw[0])) {
			facts.push({ text: raw, keys: [`wd:${WEEKDAY_ABBR[lower]}`] });
		} else if (lower in MONTHS) {
			if (
				!AMBIGUOUS_MONTHS.has(lower) ||
				hasNumberNear(index, raw.length) ||
				(isUpper(raw[0]) && !sentenceStart)
			) {
				facts.push({ text: raw, keys: [`mo:${MONTHS[lower]}`] });
			}
		} else if (lower in MONTH_ABBR && isUpper(raw[0])) {
			facts.push({ text: raw, keys: [`mo:${MONTH_ABBR[lower]}`] });
		} else if (
			isCapitalised(raw) &&
			raw.length > 1 &&
			!NOT_NAMES.has(lower) &&
			!/^i['’]/.test(lower) // I'm, I'll, I've
		) {
			// Mid-sentence capitalised word => probably a name or place.
			if (!sentenceStart) facts.push({ text: raw, keys: [`name:${lower}`] });
		}
	}

	// Known names anywhere, including at the start of a sentence.
	for (const part of names.flatMap((name) => name.split(/\s+/))) {
		const n = part.toLowerCase();
		if (n.length < 2) continue;
		const has = words.some((w) => w[0].replace(/['’]s$/i, '').toLowerCase() === n);
		if (has && !facts.some((f) => f.keys.includes(`name:${n}`))) {
			facts.push({ text: part, keys: [`name:${n}`] });
		}
	}
	return facts;
}

/** Facts that may never be invented by a rewrite (names may be, e.g. a greeting). */
const NO_ADDING = /^(time|date|wd|mo|num):/;

export function checkFacts(
	draft: string,
	rewritten: string,
	names: string[] = []
): FactCheckResult {
	const before = extractFacts(draft, names);
	const after = extractFacts(rewritten, names);
	const afterKeys = new Set(after.flatMap((f) => f.keys));
	const beforeKeys = new Set(before.flatMap((f) => f.keys));

	const unique = (list: string[]) => [...new Set(list)];
	const missing = unique(
		before.filter((f) => !f.keys.some((k) => afterKeys.has(k))).map((f) => f.text)
	);
	const added = unique(
		after
			.filter((f) => f.keys.some((k) => NO_ADDING.test(k)))
			.filter((f) => !f.keys.some((k) => beforeKeys.has(k)))
			.map((f) => f.text)
	);
	return { ok: missing.length === 0 && added.length === 0, missing, added };
}
