/**
 * Display names for the parent pages (pure). "You" for the viewer, the other
 * parent's real display_name otherwise; never a hard-coded "Dad"/"Mom".
 */
export interface ParentRow {
	id: string;
	display_name: string;
	home: string | null;
}

export function peopleFor(parents: ParentRow[], me: { member_id: string; home: string | null }) {
	const byId = (id: string) => parents.find((p) => p.id === id);
	const other = parents.find((p) => p.id !== me.member_id) ?? null;
	return {
		other,
		otherName: other?.display_name ?? null,
		/** "You" or the other parent's name, for a home 'A' | 'B'. */
		nameOfHome: (home: string): string =>
			home === me.home
				? 'You'
				: (parents.find((p) => p.home === home)?.display_name ?? `Home ${home}`),
		/** "You" or the parent's name, for a member id. */
		nameById: (id: string): string =>
			id === me.member_id ? 'You' : (byId(id)?.display_name ?? 'Your co-parent'),
		/** Third-person name (for records like system messages). */
		displayName: (id: string): string => byId(id)?.display_name ?? 'A parent'
	};
}
