export const DOCUMENT_KINDS = [
	{ value: 'parenting_plan', label: 'Parenting plan', icon: '📘' },
	{ value: 'court_order', label: 'Court order', icon: '⚖️' },
	{ value: 'school', label: 'School', icon: '🏫' },
	{ value: 'medical', label: 'Medical', icon: '🩺' },
	{ value: 'insurance', label: 'Insurance', icon: '🛡️' },
	{ value: 'id_travel', label: 'ID & travel', icon: '🛂' },
	{ value: 'receipt', label: 'Receipt', icon: '🧾' },
	{ value: 'other', label: 'Other', icon: '📎' }
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]['value'];
export const DOCUMENT_KIND_VALUES = DOCUMENT_KINDS.map((k) => k.value) as [
	DocumentKind,
	...DocumentKind[]
];
export const kindInfo = (kind: string) =>
	DOCUMENT_KINDS.find((k) => k.value === kind) ?? { value: kind, label: kind, icon: '📎' };

export interface DocumentView {
	id: string;
	title: string;
	kind: string;
	kindLabel: string;
	kindIcon: string;
	storagePath: string;
	fileType: 'pdf' | 'image';
	uploadedBy: string;
	uploadedOn: string;
	readByAi: boolean;
}
