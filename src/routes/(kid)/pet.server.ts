/**
 * Shared server helper for kid pages: Pebble's look for the signed-in child.
 * Reads with the child's own session (RLS = own row only).
 */
import { currentPattern, petLookFrom } from '#lib/kids/pet.js';

export async function loadPet(sb: App.Locals['supabase'], childId: string) {
	const { data } = await sb
		.from('pet_state')
		.select('name, colors, shell_patterns')
		.eq('child_id', childId)
		.maybeSingle();
	const look = petLookFrom(data);
	return {
		name: look.name,
		colorKey: look.color.key,
		pattern: currentPattern(look.patterns),
		patterns: look.patterns
	};
}
