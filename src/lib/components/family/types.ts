/** Union of what the family form actions return (success or `FormFailure`). */
export interface FamilyFormResult {
	form?: string;
	message?: string;
	errors?: Record<string, string>;
	values?: Record<string, string>;
	inviteUrl?: string;
	added?: string;
	activated?: boolean;
	childName?: string;
}
