/**
 * Domain types shared by server and browser code.
 * Row types come from the generated `database.ts` (`pnpm db:types`).
 */
import type { Database } from './database.js';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type Role = Enums['member_role'];
export type ChildMode = Enums['child_mode'];
export type ChildStatus = Enums['child_status'];
export type Home = 'A' | 'B';

export type Family = Tables['families']['Row'];
export type Member = Tables['members']['Row'];
export type Child = Tables['children']['Row'];
export type Consent = Tables['consents']['Row'];
export type Invite = Tables['invites']['Row'];
export type CalendarEvent = Tables['events']['Row'];
export type SwapRequest = Tables['swap_requests']['Row'];
export type Thread = Tables['threads']['Row'];
export type Message = Tables['messages']['Row'];
export type Expense = Tables['expenses']['Row'];
export type DocumentRow = Tables['documents']['Row'];
export type Outing = Tables['outings']['Row'];
export type PetState = Tables['pet_state']['Row'];
export type MoodCheckin = Tables['mood_checkins']['Row'];
export type WishCard = Tables['wish_cards']['Row'];
export type WeeklyInsightRow = Tables['weekly_insights']['Row'];
export type SafetyAlert = Tables['safety_alerts']['Row'];

/** One row of `my_memberships()`: who the signed-in user is in a family. */
export interface Membership {
	member_id: string;
	family_id: string;
	family_name: string;
	/** Only returned to parents. */
	family_code: string | null;
	role: Role;
	display_name: string;
	home: string | null;
	/** Set when this membership is a child account. */
	child_id: string | null;
	child_status: ChildStatus | null;
}

export const EXPENSE_CATEGORIES = [
	'childcare',
	'education',
	'medical',
	'activities',
	'clothing',
	'food',
	'travel',
	'other'
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const MOODS = [
	'happy',
	'excited',
	'calm',
	'okay',
	'tired',
	'sad',
	'worried',
	'angry'
] as const;
export type Mood = (typeof MOODS)[number];

/** Where each role lands after login. */
export function homePathFor(membership: Pick<Membership, 'role'> | null | undefined): string {
	if (!membership) return '/onboarding';
	return membership.role === 'child' ? '/pebble' : '/dashboard';
}
