/**
 * Client-side view of "who am I" (Svelte 5 runes). The source of truth is the
 * server (root +layout.server.ts); this mirrors it for components that need it
 * without prop drilling. Never put tokens here.
 *
 *   import { session } from '#lib/stores/session.svelte.js';
 *   session.member?.display_name
 */
import { page } from '$app/state';
import type { Membership } from '#lib/types/domain.js';

class SessionState {
	/** Signed in (parent or child). */
	readonly signedIn = $derived(Boolean(page.data.signedIn));
	/** Primary membership of the signed-in user, or null. */
	readonly member = $derived((page.data.member as Membership | null | undefined) ?? null);
	readonly isParent = $derived(this.member?.role === 'parent');
	readonly isChild = $derived(this.member?.role === 'child');
	readonly familyId = $derived(this.member?.family_id ?? null);
}

export const session = new SessionState();
