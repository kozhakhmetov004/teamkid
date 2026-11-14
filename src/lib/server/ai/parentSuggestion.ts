/**
 * STUB (owner: Kids' space + insights / AI review).
 *
 * Future behaviour: the private "My time with <child>" suggestion for ONE
 * parent. Inputs (only): that parent's own outings + calendar, and the
 * child's SHARED wish cards. Rules (README "AI suggestion rules"):
 *   - never mention the other parent
 *   - never judge or compare how much time someone spends
 *   - one short, concrete, positive idea
 *
 * Used by: GET /api/analytics/my-time (parent only, own data only).
 */
export async function suggestForParent(
	parentMemberId: string,
	childId: string
): Promise<{ suggestion: string }> {
	void parentMemberId;
	void childId;
	return {
		suggestion:
			"She's into animals lately. The zoo is open Saturday morning, and the reptile house is a quiet place to start."
	};
}
