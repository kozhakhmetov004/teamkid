/** Expense categories (match the DB check constraint). Icon + label: never colour alone. */
export const CATEGORIES = [
	{ value: 'school', label: 'School', icon: '🏫' },
	{ value: 'medical', label: 'Medical', icon: '🩺' },
	{ value: 'activities', label: 'Activities', icon: '⚽' },
	{ value: 'entertainment', label: 'Entertainment', icon: '🎟️' },
	{ value: 'clothing', label: 'Clothing', icon: '👟' },
	{ value: 'childcare', label: 'Childcare', icon: '🧸' },
	{ value: 'food', label: 'Food', icon: '🥪' },
	{ value: 'travel', label: 'Travel', icon: '🚗' },
	{ value: 'other', label: 'Other', icon: '📎' }
] as const;

export type Category = (typeof CATEGORIES)[number]['value'];
export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];

export function categoryInfo(value: string) {
	return CATEGORIES.find((c) => c.value === value) ?? { value, label: value, icon: '📎' };
}

export const STATUSES = {
	pending: { label: 'Pending', icon: '⏳' },
	approved: { label: 'Approved', icon: '✅' },
	disputed: { label: 'Disputed', icon: '❗' },
	reimbursed: { label: 'Reimbursed', icon: '💸' },
	cancelled: { label: 'Cancelled', icon: '🚫' }
} as const;
export type ExpenseStatus = keyof typeof STATUSES;
