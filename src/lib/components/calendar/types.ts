/** View models for calendar and swap components (built on the server, already formatted). */
export interface CalEvent {
	id: string;
	title: string;
	kind: string;
	place: string | null;
	notes: string | null;
	childId: string | null;
	/** "4:00 PM" */
	time: string;
	/** local 'YYYY-MM-DD' / 'HH:MM' for the edit form */
	date: string;
	start: string;
	end: string;
}

export interface CalDay {
	date: string;
	weekday: string;
	dayOfMonth: number;
	isToday: boolean;
	isPast: boolean;
	inMonth: boolean;
	/** "You", the other parent's name, or "Not set" */
	label: string;
	/** true = with you, false = with the other parent, null = no custody night */
	mine: boolean | null;
	pendingSwap: boolean;
	events: CalEvent[];
}

export interface SwapView {
	id: string;
	fromMe: boolean;
	/** "You" or the requester's name */
	requester: string;
	/** "Sat 21 Nov" */
	original: string;
	proposed: string | null;
	originalDate: string;
	proposedDate: string | null;
	note: string | null;
}

export interface SwapWindow {
	min: string;
	max: string;
}

export const EVENT_KINDS = [
	{ value: 'school', label: 'School' },
	{ value: 'activity', label: 'Activity' },
	{ value: 'medical', label: 'Medical' },
	{ value: 'handover', label: 'Handover' },
	{ value: 'other', label: 'Other' }
] as const;

export const kindLabel = (kind: string) =>
	EVENT_KINDS.find((k) => k.value === kind)?.label ?? (kind === 'custody' ? 'Custody' : kind);
