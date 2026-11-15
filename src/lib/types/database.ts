export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			audit_log: {
				Row: {
					action: string;
					actor_member_id: string | null;
					at: string;
					created_at: string;
					entity: string;
					entity_id: string | null;
					family_id: string;
					id: string;
					meta: NonNullable<Json>;
				};
				ComputedFields: never;
				Insert: {
					action: string;
					actor_member_id?: string | null;
					at?: string;
					created_at?: string;
					entity: string;
					entity_id?: string | null;
					family_id: string;
					id?: string;
					meta?: NonNullable<Json>;
				};
				Update: {
					action?: string;
					actor_member_id?: string | null;
					at?: string;
					created_at?: string;
					entity?: string;
					entity_id?: string | null;
					family_id?: string;
					id?: string;
					meta?: NonNullable<Json>;
				};
				Relationships: [
					{
						foreignKeyName: 'audit_log_actor_member_id_fkey';
						columns: ['actor_member_id'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'audit_log_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
			child_profiles: {
				Row: {
					birthday: string | null;
					child_id: string;
					dislikes: string[];
					family_id: string;
					grade: string | null;
					interests: string[];
					notes: string | null;
					updated_at: string;
					updated_by: string | null;
				};
				ComputedFields: never;
				Insert: {
					birthday?: string | null;
					child_id: string;
					dislikes?: string[];
					family_id: string;
					grade?: string | null;
					interests?: string[];
					notes?: string | null;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					birthday?: string | null;
					child_id?: string;
					dislikes?: string[];
					family_id?: string;
					grade?: string | null;
					interests?: string[];
					notes?: string | null;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'child_profiles_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: true;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'child_profiles_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'child_profiles_updated_by_fkey';
						columns: ['updated_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			children: {
				Row: {
					birth_year: number;
					created_at: string;
					family_id: string;
					first_name: string;
					id: string;
					member_id: string;
					mode: Database['public']['Enums']['child_mode'];
					pin_hash: string | null;
					status: Database['public']['Enums']['child_status'];
				};
				ComputedFields: never;
				Insert: {
					birth_year: number;
					created_at?: string;
					family_id: string;
					first_name: string;
					id?: string;
					member_id: string;
					mode?: Database['public']['Enums']['child_mode'];
					pin_hash?: string | null;
					status?: Database['public']['Enums']['child_status'];
				};
				Update: {
					birth_year?: number;
					created_at?: string;
					family_id?: string;
					first_name?: string;
					id?: string;
					member_id?: string;
					mode?: Database['public']['Enums']['child_mode'];
					pin_hash?: string | null;
					status?: Database['public']['Enums']['child_status'];
				};
				Relationships: [
					{
						foreignKeyName: 'children_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'children_member_id_fkey';
						columns: ['member_id'];
						isOneToOne: true;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			consents: {
				Row: {
					child_id: string;
					consented_at: string;
					created_at: string;
					id: string;
					parent_member_id: string;
				};
				ComputedFields: never;
				Insert: {
					child_id: string;
					consented_at?: string;
					created_at?: string;
					id?: string;
					parent_member_id: string;
				};
				Update: {
					child_id?: string;
					consented_at?: string;
					created_at?: string;
					id?: string;
					parent_member_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'consents_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'consents_parent_member_id_fkey';
						columns: ['parent_member_id'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			custody_schedules: {
				Row: {
					child_id: string | null;
					created_at: string;
					created_by: string | null;
					exchange_time: string | null;
					family_id: string;
					id: string;
					rules: NonNullable<Json>;
					start_date: string;
					template: string;
				};
				ComputedFields: never;
				Insert: {
					child_id?: string | null;
					created_at?: string;
					created_by?: string | null;
					exchange_time?: string | null;
					family_id: string;
					id?: string;
					rules?: NonNullable<Json>;
					start_date: string;
					template: string;
				};
				Update: {
					child_id?: string | null;
					created_at?: string;
					created_by?: string | null;
					exchange_time?: string | null;
					family_id?: string;
					id?: string;
					rules?: NonNullable<Json>;
					start_date?: string;
					template?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'custody_schedules_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'custody_schedules_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'custody_schedules_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
			documents: {
				Row: {
					created_at: string;
					extracted: Json | null;
					family_id: string;
					id: string;
					kind: string;
					mime: string | null;
					storage_path: string;
					title: string;
					uploaded_by: string | null;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					extracted?: Json | null;
					family_id: string;
					id?: string;
					kind: string;
					mime?: string | null;
					storage_path: string;
					title: string;
					uploaded_by?: string | null;
				};
				Update: {
					created_at?: string;
					extracted?: Json | null;
					family_id?: string;
					id?: string;
					kind?: string;
					mime?: string | null;
					storage_path?: string;
					title?: string;
					uploaded_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'documents_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'documents_uploaded_by_fkey';
						columns: ['uploaded_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			events: {
				Row: {
					child_id: string | null;
					created_at: string;
					created_by: string | null;
					ends_at: string;
					family_id: string;
					home: string | null;
					id: string;
					kid_visible: boolean;
					kind: string;
					notes: string | null;
					pending_swap_id: string | null;
					place: string | null;
					source: string;
					starts_at: string;
					title: string;
				};
				ComputedFields: never;
				Insert: {
					child_id?: string | null;
					created_at?: string;
					created_by?: string | null;
					ends_at: string;
					family_id: string;
					home?: string | null;
					id?: string;
					kid_visible?: boolean;
					kind?: string;
					notes?: string | null;
					pending_swap_id?: string | null;
					place?: string | null;
					source?: string;
					starts_at: string;
					title: string;
				};
				Update: {
					child_id?: string | null;
					created_at?: string;
					created_by?: string | null;
					ends_at?: string;
					family_id?: string;
					home?: string | null;
					id?: string;
					kid_visible?: boolean;
					kind?: string;
					notes?: string | null;
					pending_swap_id?: string | null;
					place?: string | null;
					source?: string;
					starts_at?: string;
					title?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'events_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'events_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'events_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'events_pending_swap_id_fkey';
						columns: ['pending_swap_id'];
						isOneToOne: false;
						referencedRelation: 'swap_requests';
						referencedColumns: ['id'];
					}
				];
			};
			expense_requests: {
				Row: {
					category: string;
					child_id: string | null;
					created_at: string;
					estimate_cents: number;
					expense_id: string | null;
					family_id: string;
					id: string;
					note: string | null;
					requested_by: string;
					responded_at: string | null;
					responded_by: string | null;
					response_note: string | null;
					split: NonNullable<Json>;
					status: string;
					title: string;
				};
				ComputedFields: never;
				Insert: {
					category: string;
					child_id?: string | null;
					created_at?: string;
					estimate_cents: number;
					expense_id?: string | null;
					family_id: string;
					id?: string;
					note?: string | null;
					requested_by: string;
					responded_at?: string | null;
					responded_by?: string | null;
					response_note?: string | null;
					split?: NonNullable<Json>;
					status?: string;
					title: string;
				};
				Update: {
					category?: string;
					child_id?: string | null;
					created_at?: string;
					estimate_cents?: number;
					expense_id?: string | null;
					family_id?: string;
					id?: string;
					note?: string | null;
					requested_by?: string;
					responded_at?: string | null;
					responded_by?: string | null;
					response_note?: string | null;
					split?: NonNullable<Json>;
					status?: string;
					title?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'expense_requests_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expense_requests_expense_id_fkey';
						columns: ['expense_id'];
						isOneToOne: false;
						referencedRelation: 'expenses';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expense_requests_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expense_requests_requested_by_fkey';
						columns: ['requested_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expense_requests_responded_by_fkey';
						columns: ['responded_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			expenses: {
				Row: {
					amount_cents: number;
					category: string;
					child_id: string | null;
					created_at: string;
					currency: string;
					family_id: string;
					id: string;
					note: string | null;
					paid_by: string;
					receipt_path: string | null;
					recurring_id: string | null;
					recurring_month: string | null;
					reimbursed_at: string | null;
					request_id: string | null;
					responded_at: string | null;
					responded_by: string | null;
					resubmit_of: string | null;
					settlement_id: string | null;
					spent_on: string;
					split: NonNullable<Json>;
					status: string;
					status_note: string | null;
					title: string;
				};
				ComputedFields: never;
				Insert: {
					amount_cents: number;
					category: string;
					child_id?: string | null;
					created_at?: string;
					currency?: string;
					family_id: string;
					id?: string;
					note?: string | null;
					paid_by: string;
					receipt_path?: string | null;
					recurring_id?: string | null;
					recurring_month?: string | null;
					reimbursed_at?: string | null;
					request_id?: string | null;
					responded_at?: string | null;
					responded_by?: string | null;
					resubmit_of?: string | null;
					settlement_id?: string | null;
					spent_on?: string;
					split?: NonNullable<Json>;
					status?: string;
					status_note?: string | null;
					title: string;
				};
				Update: {
					amount_cents?: number;
					category?: string;
					child_id?: string | null;
					created_at?: string;
					currency?: string;
					family_id?: string;
					id?: string;
					note?: string | null;
					paid_by?: string;
					receipt_path?: string | null;
					recurring_id?: string | null;
					recurring_month?: string | null;
					reimbursed_at?: string | null;
					request_id?: string | null;
					responded_at?: string | null;
					responded_by?: string | null;
					resubmit_of?: string | null;
					settlement_id?: string | null;
					spent_on?: string;
					split?: NonNullable<Json>;
					status?: string;
					status_note?: string | null;
					title?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'expenses_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expenses_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expenses_paid_by_fkey';
						columns: ['paid_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expenses_recurring_id_fkey';
						columns: ['recurring_id'];
						isOneToOne: false;
						referencedRelation: 'recurring_expenses';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expenses_request_id_fkey';
						columns: ['request_id'];
						isOneToOne: false;
						referencedRelation: 'expense_requests';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expenses_responded_by_fkey';
						columns: ['responded_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expenses_resubmit_of_fkey';
						columns: ['resubmit_of'];
						isOneToOne: false;
						referencedRelation: 'expenses';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'expenses_settlement_id_fkey';
						columns: ['settlement_id'];
						isOneToOne: false;
						referencedRelation: 'settlements';
						referencedColumns: ['id'];
					}
				];
			};
			families: {
				Row: {
					created_at: string;
					family_code: string;
					id: string;
					name: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					family_code: string;
					id?: string;
					name: string;
				};
				Update: {
					created_at?: string;
					family_code?: string;
					id?: string;
					name?: string;
				};
				Relationships: [];
			};
			family_finance: {
				Row: {
					agreed_at: string;
					basis: string;
					default_shares: NonNullable<Json>;
					family_id: string;
				};
				ComputedFields: never;
				Insert: {
					agreed_at?: string;
					basis: string;
					default_shares: NonNullable<Json>;
					family_id: string;
				};
				Update: {
					agreed_at?: string;
					basis?: string;
					default_shares?: NonNullable<Json>;
					family_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'family_finance_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: true;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
			invites: {
				Row: {
					accepted_at: string | null;
					accepted_by: string | null;
					created_at: string;
					email: string;
					expires_at: string;
					family_id: string;
					id: string;
					invited_by: string | null;
					role: Database['public']['Enums']['member_role'];
					token: string;
				};
				ComputedFields: never;
				Insert: {
					accepted_at?: string | null;
					accepted_by?: string | null;
					created_at?: string;
					email: string;
					expires_at?: string;
					family_id: string;
					id?: string;
					invited_by?: string | null;
					role?: Database['public']['Enums']['member_role'];
					token: string;
				};
				Update: {
					accepted_at?: string | null;
					accepted_by?: string | null;
					created_at?: string;
					email?: string;
					expires_at?: string;
					family_id?: string;
					id?: string;
					invited_by?: string | null;
					role?: Database['public']['Enums']['member_role'];
					token?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'invites_accepted_by_fkey';
						columns: ['accepted_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'invites_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'invites_invited_by_fkey';
						columns: ['invited_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			kid_chat_raw: {
				Row: {
					child_id: string;
					created_at: string;
					id: string;
					role: string;
					text: string;
				};
				ComputedFields: never;
				Insert: {
					child_id: string;
					created_at?: string;
					id?: string;
					role?: string;
					text: string;
				};
				Update: {
					child_id?: string;
					created_at?: string;
					id?: string;
					role?: string;
					text?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'kid_chat_raw_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					}
				];
			};
			kid_login_attempts: {
				Row: {
					created_at: string;
					family_code: string;
					id: string;
					success: boolean;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					family_code: string;
					id?: string;
					success?: boolean;
				};
				Update: {
					created_at?: string;
					family_code?: string;
					id?: string;
					success?: boolean;
				};
				Relationships: [];
			};
			members: {
				Row: {
					created_at: string;
					display_name: string;
					family_id: string;
					home: string | null;
					id: string;
					role: Database['public']['Enums']['member_role'];
					user_id: string | null;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					display_name: string;
					family_id: string;
					home?: string | null;
					id?: string;
					role: Database['public']['Enums']['member_role'];
					user_id?: string | null;
				};
				Update: {
					created_at?: string;
					display_name?: string;
					family_id?: string;
					home?: string | null;
					id?: string;
					role?: Database['public']['Enums']['member_role'];
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'members_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
			messages: {
				Row: {
					ai_rewritten: boolean;
					body: string;
					created_at: string;
					family_id: string;
					first_read_at: string | null;
					hash: string;
					id: string;
					original_body: string | null;
					prev_hash: string | null;
					sender_id: string;
					thread_id: string;
				};
				ComputedFields: never;
				Insert: {
					ai_rewritten?: boolean;
					body: string;
					created_at?: string;
					family_id: string;
					first_read_at?: string | null;
					hash?: string;
					id?: string;
					original_body?: string | null;
					prev_hash?: string | null;
					sender_id: string;
					thread_id: string;
				};
				Update: {
					ai_rewritten?: boolean;
					body?: string;
					created_at?: string;
					family_id?: string;
					first_read_at?: string | null;
					hash?: string;
					id?: string;
					original_body?: string | null;
					prev_hash?: string | null;
					sender_id?: string;
					thread_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'messages_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'messages_sender_id_fkey';
						columns: ['sender_id'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'messages_thread_id_fkey';
						columns: ['thread_id'];
						isOneToOne: false;
						referencedRelation: 'threads';
						referencedColumns: ['id'];
					}
				];
			};
			mood_checkins: {
				Row: {
					child_id: string;
					created_at: string;
					energy: number | null;
					id: string;
					mood: string;
					shared: boolean;
				};
				ComputedFields: never;
				Insert: {
					child_id: string;
					created_at?: string;
					energy?: number | null;
					id?: string;
					mood: string;
					shared?: boolean;
				};
				Update: {
					child_id?: string;
					created_at?: string;
					energy?: number | null;
					id?: string;
					mood?: string;
					shared?: boolean;
				};
				Relationships: [
					{
						foreignKeyName: 'mood_checkins_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					}
				];
			};
			outings: {
				Row: {
					child_id: string;
					child_rating: number | null;
					created_at: string;
					event_id: string | null;
					family_id: string;
					happened_on: string;
					id: string;
					parent_member_id: string;
					title: string;
				};
				ComputedFields: never;
				Insert: {
					child_id: string;
					child_rating?: number | null;
					created_at?: string;
					event_id?: string | null;
					family_id: string;
					happened_on: string;
					id?: string;
					parent_member_id: string;
					title: string;
				};
				Update: {
					child_id?: string;
					child_rating?: number | null;
					created_at?: string;
					event_id?: string | null;
					family_id?: string;
					happened_on?: string;
					id?: string;
					parent_member_id?: string;
					title?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'outings_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'outings_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'events';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'outings_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'outings_parent_member_id_fkey';
						columns: ['parent_member_id'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			parent_income: {
				Row: {
					band: string;
					family_id: string;
					member_id: string;
					share_for_split: boolean;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					band: string;
					family_id: string;
					member_id: string;
					share_for_split?: boolean;
					updated_at?: string;
				};
				Update: {
					band?: string;
					family_id?: string;
					member_id?: string;
					share_for_split?: boolean;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'parent_income_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'parent_income_member_id_fkey';
						columns: ['member_id'];
						isOneToOne: true;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			pet_state: {
				Row: {
					child_id: string;
					colors: NonNullable<Json>;
					created_at: string;
					mood_shown: string;
					name: string;
					pond: NonNullable<Json>;
					shell_patterns: NonNullable<Json>;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					child_id: string;
					colors?: NonNullable<Json>;
					created_at?: string;
					mood_shown?: string;
					name?: string;
					pond?: NonNullable<Json>;
					shell_patterns?: NonNullable<Json>;
					updated_at?: string;
				};
				Update: {
					child_id?: string;
					colors?: NonNullable<Json>;
					created_at?: string;
					mood_shown?: string;
					name?: string;
					pond?: NonNullable<Json>;
					shell_patterns?: NonNullable<Json>;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'pet_state_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: true;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					}
				];
			};
			planner_ideas: {
				Row: {
					created_at: string;
					ends_at: string;
					family_id: string;
					id: string;
					member_id: string;
					place: string | null;
					starts_at: string;
					title: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					ends_at: string;
					family_id: string;
					id?: string;
					member_id: string;
					place?: string | null;
					starts_at: string;
					title: string;
				};
				Update: {
					created_at?: string;
					ends_at?: string;
					family_id?: string;
					id?: string;
					member_id?: string;
					place?: string | null;
					starts_at?: string;
					title?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'planner_ideas_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'planner_ideas_member_id_fkey';
						columns: ['member_id'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			recurring_expenses: {
				Row: {
					amount_cents: number;
					category: string;
					child_id: string | null;
					created_at: string;
					created_by: string;
					day_of_month: number;
					family_id: string;
					id: string;
					last_month: string | null;
					responded_at: string | null;
					responded_by: string | null;
					split: NonNullable<Json>;
					start_month: string;
					status: string;
					title: string;
				};
				ComputedFields: never;
				Insert: {
					amount_cents: number;
					category: string;
					child_id?: string | null;
					created_at?: string;
					created_by: string;
					day_of_month: number;
					family_id: string;
					id?: string;
					last_month?: string | null;
					responded_at?: string | null;
					responded_by?: string | null;
					split?: NonNullable<Json>;
					start_month: string;
					status?: string;
					title: string;
				};
				Update: {
					amount_cents?: number;
					category?: string;
					child_id?: string | null;
					created_at?: string;
					created_by?: string;
					day_of_month?: number;
					family_id?: string;
					id?: string;
					last_month?: string | null;
					responded_at?: string | null;
					responded_by?: string | null;
					split?: NonNullable<Json>;
					start_month?: string;
					status?: string;
					title?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'recurring_expenses_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'recurring_expenses_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'recurring_expenses_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'recurring_expenses_responded_by_fkey';
						columns: ['responded_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			safety_alerts: {
				Row: {
					category: string | null;
					child_id: string;
					created_at: string;
					family_id: string;
					id: string;
					level: string;
					resolved_at: string | null;
					resolved_by: string | null;
				};
				ComputedFields: never;
				Insert: {
					category?: string | null;
					child_id: string;
					created_at?: string;
					family_id: string;
					id?: string;
					level: string;
					resolved_at?: string | null;
					resolved_by?: string | null;
				};
				Update: {
					category?: string | null;
					child_id?: string;
					created_at?: string;
					family_id?: string;
					id?: string;
					level?: string;
					resolved_at?: string | null;
					resolved_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'safety_alerts_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'safety_alerts_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'safety_alerts_resolved_by_fkey';
						columns: ['resolved_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			settlements: {
				Row: {
					amount_cents: number;
					confirmed_at: string | null;
					created_at: string;
					credit_cents: number;
					family_id: string;
					id: string;
					kind: string;
					method: string;
					note: string | null;
					paid_by: string;
					paid_to: string;
				};
				ComputedFields: never;
				Insert: {
					amount_cents: number;
					confirmed_at?: string | null;
					created_at?: string;
					credit_cents?: number;
					family_id: string;
					id?: string;
					kind: string;
					method: string;
					note?: string | null;
					paid_by: string;
					paid_to: string;
				};
				Update: {
					amount_cents?: number;
					confirmed_at?: string | null;
					created_at?: string;
					credit_cents?: number;
					family_id?: string;
					id?: string;
					kind?: string;
					method?: string;
					note?: string | null;
					paid_by?: string;
					paid_to?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'settlements_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'settlements_paid_by_fkey';
						columns: ['paid_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'settlements_paid_to_fkey';
						columns: ['paid_to'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			shared_moods: {
				Row: {
					child_id: string;
					energy: number | null;
					family_id: string;
					mood: string | null;
					shared_at: string;
				};
				ComputedFields: never;
				Insert: {
					child_id: string;
					energy?: number | null;
					family_id: string;
					mood?: string | null;
					shared_at?: string;
				};
				Update: {
					child_id?: string;
					energy?: number | null;
					family_id?: string;
					mood?: string | null;
					shared_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'shared_moods_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: true;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'shared_moods_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
			split_proposals: {
				Row: {
					basis: string;
					created_at: string;
					family_id: string;
					id: string;
					proposed_by: string;
					responded_at: string | null;
					responded_by: string | null;
					shares: NonNullable<Json>;
					status: string;
				};
				ComputedFields: never;
				Insert: {
					basis: string;
					created_at?: string;
					family_id: string;
					id?: string;
					proposed_by: string;
					responded_at?: string | null;
					responded_by?: string | null;
					shares: NonNullable<Json>;
					status?: string;
				};
				Update: {
					basis?: string;
					created_at?: string;
					family_id?: string;
					id?: string;
					proposed_by?: string;
					responded_at?: string | null;
					responded_by?: string | null;
					shares?: NonNullable<Json>;
					status?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'split_proposals_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'split_proposals_proposed_by_fkey';
						columns: ['proposed_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'split_proposals_responded_by_fkey';
						columns: ['responded_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			subscriptions: {
				Row: {
					created_at: string;
					current_period_end: string | null;
					family_id: string | null;
					id: string;
					plan: string | null;
					status: string;
					stripe_customer_id: string | null;
					stripe_subscription_id: string | null;
					updated_at: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					current_period_end?: string | null;
					family_id?: string | null;
					id?: string;
					plan?: string | null;
					status?: string;
					stripe_customer_id?: string | null;
					stripe_subscription_id?: string | null;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					current_period_end?: string | null;
					family_id?: string | null;
					id?: string;
					plan?: string | null;
					status?: string;
					stripe_customer_id?: string | null;
					stripe_subscription_id?: string | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'subscriptions_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
			swap_requests: {
				Row: {
					child_id: string | null;
					counter_of: string | null;
					created_at: string;
					family_id: string;
					id: string;
					note: string | null;
					original_date: string;
					proposed_date: string | null;
					requested_by: string;
					responded_at: string | null;
					responded_by: string | null;
					status: string;
				};
				ComputedFields: never;
				Insert: {
					child_id?: string | null;
					counter_of?: string | null;
					created_at?: string;
					family_id: string;
					id?: string;
					note?: string | null;
					original_date: string;
					proposed_date?: string | null;
					requested_by: string;
					responded_at?: string | null;
					responded_by?: string | null;
					status?: string;
				};
				Update: {
					child_id?: string | null;
					counter_of?: string | null;
					created_at?: string;
					family_id?: string;
					id?: string;
					note?: string | null;
					original_date?: string;
					proposed_date?: string | null;
					requested_by?: string;
					responded_at?: string | null;
					responded_by?: string | null;
					status?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'swap_requests_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'swap_requests_counter_of_fkey';
						columns: ['counter_of'];
						isOneToOne: false;
						referencedRelation: 'swap_requests';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'swap_requests_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'swap_requests_requested_by_fkey';
						columns: ['requested_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'swap_requests_responded_by_fkey';
						columns: ['responded_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			threads: {
				Row: {
					created_at: string;
					created_by: string | null;
					family_id: string;
					id: string;
					topic: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					created_by?: string | null;
					family_id: string;
					id?: string;
					topic: string;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					family_id?: string;
					id?: string;
					topic?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'threads_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'threads_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
			weekly_insights: {
				Row: {
					ai_line: string | null;
					ai_line_key: string | null;
					child_id: string;
					created_at: string;
					family_id: string;
					gentle_flag: boolean;
					id: string;
					interests: string[];
					mood_trend: string;
					summary: string | null;
					week_start: string;
				};
				ComputedFields: never;
				Insert: {
					ai_line?: string | null;
					ai_line_key?: string | null;
					child_id: string;
					created_at?: string;
					family_id: string;
					gentle_flag?: boolean;
					id?: string;
					interests?: string[];
					mood_trend: string;
					summary?: string | null;
					week_start: string;
				};
				Update: {
					ai_line?: string | null;
					ai_line_key?: string | null;
					child_id?: string;
					created_at?: string;
					family_id?: string;
					gentle_flag?: boolean;
					id?: string;
					interests?: string[];
					mood_trend?: string;
					summary?: string | null;
					week_start?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'weekly_insights_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'weekly_insights_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
			wish_cards: {
				Row: {
					card_kind: string | null;
					child_id: string;
					created_at: string;
					day: string | null;
					emoji: string | null;
					family_id: string;
					id: string;
					interest: string;
					is_custom: boolean;
					option_key: string | null;
					prompt: string | null;
					question_id: string | null;
					shared_at: string | null;
					shared_with_parents: boolean;
					tags: string[];
					week_start: string | null;
				};
				ComputedFields: never;
				Insert: {
					card_kind?: string | null;
					child_id: string;
					created_at?: string;
					day?: string | null;
					emoji?: string | null;
					family_id: string;
					id?: string;
					interest: string;
					is_custom?: boolean;
					option_key?: string | null;
					prompt?: string | null;
					question_id?: string | null;
					shared_at?: string | null;
					shared_with_parents?: boolean;
					tags?: string[];
					week_start?: string | null;
				};
				Update: {
					card_kind?: string | null;
					child_id?: string;
					created_at?: string;
					day?: string | null;
					emoji?: string | null;
					family_id?: string;
					id?: string;
					interest?: string;
					is_custom?: boolean;
					option_key?: string | null;
					prompt?: string | null;
					question_id?: string | null;
					shared_at?: string | null;
					shared_with_parents?: boolean;
					tags?: string[];
					week_start?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'wish_cards_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'wish_cards_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'wish_cards_question_id_fkey';
						columns: ['question_id'];
						isOneToOne: false;
						referencedRelation: 'wish_questions';
						referencedColumns: ['id'];
					}
				];
			};
			wish_questions: {
				Row: {
					child_id: string;
					created_at: string;
					day: string;
					family_id: string;
					id: string;
					kind: string;
					max_picks: number;
					options: NonNullable<Json>;
					prompt: string;
					slot: number;
					source: string;
				};
				ComputedFields: never;
				Insert: {
					child_id: string;
					created_at?: string;
					day: string;
					family_id: string;
					id?: string;
					kind: string;
					max_picks?: number;
					options: NonNullable<Json>;
					prompt: string;
					slot: number;
					source: string;
				};
				Update: {
					child_id?: string;
					created_at?: string;
					day?: string;
					family_id?: string;
					id?: string;
					kind?: string;
					max_picks?: number;
					options?: NonNullable<Json>;
					prompt?: string;
					slot?: number;
					source?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'wish_questions_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'wish_questions_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
			wish_refresh: {
				Row: {
					child_id: string;
					family_id: string;
					handled_at: string | null;
					requested_at: string;
				};
				ComputedFields: never;
				Insert: {
					child_id: string;
					family_id: string;
					handled_at?: string | null;
					requested_at?: string;
				};
				Update: {
					child_id?: string;
					family_id?: string;
					handled_at?: string | null;
					requested_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'wish_refresh_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: true;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'wish_refresh_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			v_parent_time: {
				Row: {
					avg_rating: number | null;
					child_id: string;
					month: string | null;
					outings_count: number | null;
					parent_member_id: string;
					top_activities: string[] | null;
				};
				ComputedFields: never;
				Relationships: [
					{
						foreignKeyName: 'outings_child_id_fkey';
						columns: ['child_id'];
						isOneToOne: false;
						referencedRelation: 'children';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'outings_parent_member_id_fkey';
						columns: ['parent_member_id'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					}
				];
			};
			v_spending_by_category: {
				Row: {
					category: string;
					family_id: string;
					items: number | null;
					month: string | null;
					total_cents: number | null;
				};
				ComputedFields: never;
				Relationships: [
					{
						foreignKeyName: 'expenses_family_id_fkey';
						columns: ['family_id'];
						isOneToOne: false;
						referencedRelation: 'families';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Functions: {
			accept_invite: {
				Args: { p_display_name: string; p_token: string };
				Returns: {
					family_id: string;
					member_id: string;
				}[];
			};
			confirm_settlement: {
				Args: { p_settlement_id: string };
				Returns: {
					amount_cents: number;
					confirmed_at: string | null;
					created_at: string;
					credit_cents: number;
					family_id: string;
					id: string;
					kind: string;
					method: string;
					note: string | null;
					paid_by: string;
					paid_to: string;
				};
				SetofOptions: {
					from: '*';
					to: 'settlements';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			counter_swap: {
				Args: {
					p_note?: string;
					p_original_date: string;
					p_proposed_date?: string;
					p_swap_id: string;
				};
				Returns: {
					child_id: string | null;
					counter_of: string | null;
					created_at: string;
					family_id: string;
					id: string;
					note: string | null;
					original_date: string;
					proposed_date: string | null;
					requested_by: string;
					responded_at: string | null;
					responded_by: string | null;
					status: string;
				};
				SetofOptions: {
					from: '*';
					to: 'swap_requests';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			create_family: {
				Args: { p_display_name: string; p_family_name: string };
				Returns: {
					family_code: string;
					family_id: string;
					member_id: string;
				}[];
			};
			current_child_id: { Args: Record<PropertyKey, never>; Returns: string };
			current_member_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
			family_of_child: { Args: { cid: string }; Returns: string };
			generate_family_code: { Args: Record<PropertyKey, never>; Returns: string };
			generate_recurring_expenses: { Args: { p_family_id: string }; Returns: number };
			invite_preview: {
				Args: { p_token: string };
				Returns: {
					accepted: boolean;
					expired: boolean;
					family_name: string;
					invited_email: string;
					inviter_name: string;
				}[];
			};
			is_family_member: { Args: { fid: string }; Returns: boolean };
			is_family_parent: { Args: { fid: string }; Returns: boolean };
			kid_calendar: {
				Args: { p_from: string; p_to: string };
				Returns: {
					ends_at: string;
					home: string;
					id: string;
					kind: string;
					place: string;
					starts_at: string;
					title: string;
				}[];
			};
			kid_exchange_place: { Args: Record<PropertyKey, never>; Returns: string };
			my_memberships: {
				Args: Record<PropertyKey, never>;
				Returns: {
					child_id: string;
					child_status: Database['public']['Enums']['child_status'];
					display_name: string;
					family_code: string;
					family_id: string;
					family_name: string;
					home: string;
					member_id: string;
					role: Database['public']['Enums']['member_role'];
				}[];
			};
			other_parent_of: { Args: { p_family_id: string; p_member_id: string }; Returns: string };
			parent_member_in_family: { Args: { fid: string }; Returns: string };
			propose_family_split: {
				Args: { p_basis: string; p_family_id: string; p_my_pct: number };
				Returns: {
					basis: string;
					created_at: string;
					family_id: string;
					id: string;
					proposed_by: string;
					responded_at: string | null;
					responded_by: string | null;
					shares: NonNullable<Json>;
					status: string;
				};
				SetofOptions: {
					from: '*';
					to: 'split_proposals';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			purge_old_kid_chat: { Args: Record<PropertyKey, never>; Returns: number };
			replace_custody_schedule: {
				Args: {
					p_blocks: Json;
					p_exchange_time: string;
					p_family_id: string;
					p_first_home: string;
					p_from: string;
					p_rules?: Json;
					p_source?: string;
					p_start_date: string;
					p_template: string;
				};
				Returns: string;
			};
			request_covers: {
				Args: {
					p_amount: number;
					p_family_id: string;
					p_paid_by: string;
					p_request_id: string;
					p_split: Json;
				};
				Returns: boolean;
			};
			request_wish_refresh_for_family: { Args: { fid: string }; Returns: undefined };
			respond_to_expense: {
				Args: { p_action: string; p_expense_id: string; p_note?: string };
				Returns: {
					amount_cents: number;
					category: string;
					child_id: string | null;
					created_at: string;
					currency: string;
					family_id: string;
					id: string;
					note: string | null;
					paid_by: string;
					receipt_path: string | null;
					recurring_id: string | null;
					recurring_month: string | null;
					reimbursed_at: string | null;
					request_id: string | null;
					responded_at: string | null;
					responded_by: string | null;
					resubmit_of: string | null;
					settlement_id: string | null;
					spent_on: string;
					split: NonNullable<Json>;
					status: string;
					status_note: string | null;
					title: string;
				};
				SetofOptions: {
					from: '*';
					to: 'expenses';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			respond_to_expense_request: {
				Args: { p_action: string; p_note?: string; p_request_id: string };
				Returns: {
					category: string;
					child_id: string | null;
					created_at: string;
					estimate_cents: number;
					expense_id: string | null;
					family_id: string;
					id: string;
					note: string | null;
					requested_by: string;
					responded_at: string | null;
					responded_by: string | null;
					response_note: string | null;
					split: NonNullable<Json>;
					status: string;
					title: string;
				};
				SetofOptions: {
					from: '*';
					to: 'expense_requests';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			respond_to_recurring: {
				Args: { p_action: string; p_recurring_id: string };
				Returns: {
					amount_cents: number;
					category: string;
					child_id: string | null;
					created_at: string;
					created_by: string;
					day_of_month: number;
					family_id: string;
					id: string;
					last_month: string | null;
					responded_at: string | null;
					responded_by: string | null;
					split: NonNullable<Json>;
					start_month: string;
					status: string;
					title: string;
				};
				SetofOptions: {
					from: '*';
					to: 'recurring_expenses';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			respond_to_split_proposal: {
				Args: { p_action: string; p_proposal_id: string };
				Returns: {
					basis: string;
					created_at: string;
					family_id: string;
					id: string;
					proposed_by: string;
					responded_at: string | null;
					responded_by: string | null;
					shares: NonNullable<Json>;
					status: string;
				};
				SetofOptions: {
					from: '*';
					to: 'split_proposals';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			respond_to_swap: {
				Args: { p_action: string; p_swap_id: string; p_tz?: string };
				Returns: {
					child_id: string | null;
					counter_of: string | null;
					created_at: string;
					family_id: string;
					id: string;
					note: string | null;
					original_date: string;
					proposed_date: string | null;
					requested_by: string;
					responded_at: string | null;
					responded_by: string | null;
					status: string;
				};
				SetofOptions: {
					from: '*';
					to: 'swap_requests';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			safe_tz: { Args: { p_tz: string }; Returns: string };
			settle_up: {
				Args: { p_amount_cents: number; p_family_id: string; p_method: string; p_note?: string };
				Returns: {
					amount_cents: number;
					confirmed_at: string | null;
					created_at: string;
					credit_cents: number;
					family_id: string;
					id: string;
					kind: string;
					method: string;
					note: string | null;
					paid_by: string;
					paid_to: string;
				};
				SetofOptions: {
					from: '*';
					to: 'settlements';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			storage_family_id: { Args: { object_name: string }; Returns: string };
			valid_split: { Args: { s: Json }; Returns: boolean };
		};
		Enums: {
			child_mode: 'pet' | 'teen';
			child_status: 'pending_consent' | 'active' | 'disabled';
			member_role: 'parent' | 'child' | 'bonus' | 'professional';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never) = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never) = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never) = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends (DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never) = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never) = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {
			child_mode: ['pet', 'teen'],
			child_status: ['pending_consent', 'active', 'disabled'],
			member_role: ['parent', 'child', 'bonus', 'professional']
		}
	}
} as const;
