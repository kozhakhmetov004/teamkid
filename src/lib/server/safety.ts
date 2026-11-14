/**
 * Safety checks for anything a child says to Pebble (README safety rule 7).
 * Keyword layer only (fast, deterministic, runs before any AI). A crisis
 * result means: calm pre-written reply, trusted adult, 988, and a
 * safety_alerts row for both parents (raiseSafetyAlert). Child words are
 * never stored in the alert, only level + category.
 *
 * Also: raiseSafetyAlert(), used by the kids' "I need a grown-up" page.
 */
import type { HelpCategory, HelpLevel } from '#lib/safety/help.js';
import { logAudit } from './audit.js';
import { supabaseAdmin } from './supabaseAdmin.js';

export interface SafetyCheck {
	level: 'ok' | HelpLevel;
	category: HelpCategory | null;
}

const RULES: { category: HelpCategory; level: HelpLevel; re: RegExp }[] = [
	{
		category: 'self_harm',
		level: 'crisis',
		re: /\b(hurt|cut|kill) (myself|me)\b|\bwant to die\b|\bwish i (was|were) dead\b|\bend (it|my life)\b|\bsuicid/i
	},
	{
		category: 'abuse',
		level: 'crisis',
		re: /\b(hits|hit|hurts|hurt|touches|touched|kicks|slaps|beats) me\b|\bsomeone (is )?(hurting|touching) me\b|\bsecret touch/i
	},
	{
		category: 'danger',
		level: 'crisis',
		re: /\b(not safe|unsafe|scared to go home|afraid to go home|someone has a (gun|knife)|run away)\b/i
	},
	{
		category: 'distress',
		level: 'flag',
		re: /\b(so sad|very sad|really sad|cry(ing)? all the time|nobody loves me|hate myself|all alone)\b/i
	}
];

/** Highest-priority match wins (rules are ordered by severity). */
export function classifySafety(text: string): SafetyCheck {
	const t = text.normalize('NFKC').replace(/\s+/g, ' ');
	for (const r of RULES) if (r.re.test(t)) return { level: r.level, category: r.category };
	return { level: 'ok', category: null };
}

const DEDUPE_MS = 30 * 60_000;

/**
 * Inserts an alert both parents see (service role: kids/parents have no insert
 * policy). Skips a duplicate unresolved alert of the same category within 30 min.
 */
export async function raiseSafetyAlert(opts: {
	childId: string;
	familyId: string;
	childMemberId: string;
	level: HelpLevel;
	category: HelpCategory;
}): Promise<{ id: string | null; duplicate: boolean }> {
	const db = supabaseAdmin();
	const since = new Date(Date.now() - DEDUPE_MS).toISOString();
	const { data: recent } = await db
		.from('safety_alerts')
		.select('id')
		.eq('child_id', opts.childId)
		.eq('category', opts.category)
		.is('resolved_at', null)
		.gte('created_at', since)
		.limit(1)
		.maybeSingle();
	if (recent) return { id: recent.id, duplicate: true };

	const { data, error } = await db
		.from('safety_alerts')
		.insert({
			child_id: opts.childId,
			family_id: opts.familyId,
			level: opts.level,
			category: opts.category
		})
		.select('id')
		.single();
	if (error || !data) throw new Error('Could not save the safety alert');

	await logAudit({
		familyId: opts.familyId,
		actorMemberId: opts.childMemberId,
		action: `safety.${opts.level}`,
		entity: 'safety_alerts',
		entityId: data.id,
		meta: { category: opts.category }
	});
	return { id: data.id, duplicate: false };
}
