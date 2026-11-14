/** View models for the messages components (built on the server, already formatted). */
export interface BubbleMessage {
	id: string;
	mine: boolean;
	from: string;
	body: string;
	sentLabel: string;
	readLabel: string | null;
	aiRewritten: boolean;
}

export interface ThreadRow {
	id: string;
	topic: string;
	snippet: string | null;
	from: string | null;
	when: string | null;
	unread: number;
}
