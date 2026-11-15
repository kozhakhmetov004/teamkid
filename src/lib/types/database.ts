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
					kind: string;
					notes: string | null;
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
					kind?: string;
					notes?: string | null;
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
					kind?: string;
					notes?: string | null;
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
					reimbursed_at: string | null;
					responded_at: string | null;
					responded_by: string | null;
					resubmit_of: string | null;
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
					reimbursed_at?: string | null;
					responded_at?: string | null;
					responded_by?: string | null;
					resubmit_of?: string | null;
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
					reimbursed_at?: string | null;
					responded_at?: string | null;
					responded_by?: string | null;
					resubmit_of?: string | null;
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
			pet_state: {
				Row: {
					child_id: string;
					colors: NonNullable<Json>;
					created_at: string;
					mood_shown: string;
					name: string;
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
					shell_patterns?: NonNullable<Json>;
					updated_at?: string;
				};
				Update: {
					child_id?: string;
					colors?: NonNullable<Json>;
					created_at?: string;
					mood_shown?: string;
					name?: string;
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
					child_id: string;
					created_at: string;
					family_id: string;
					id: string;
					interest: string;
					prompt: string | null;
					shared_at: string | null;
					shared_with_parents: boolean;
				};
				ComputedFields: never;
				Insert: {
					child_id: string;
					created_at?: string;
					family_id: string;
					id?: string;
					interest: string;
					prompt?: string | null;
					shared_at?: string | null;
					shared_with_parents?: boolean;
				};
				Update: {
					child_id?: string;
					created_at?: string;
					family_id?: string;
					id?: string;
					interest?: string;
					prompt?: string | null;
					shared_at?: string | null;
					shared_with_parents?: boolean;
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
			parent_member_in_family: { Args: { fid: string }; Returns: string };
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
					reimbursed_at: string | null;
					responded_at: string | null;
					responded_by: string | null;
					resubmit_of: string | null;
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
			storage_family_id: { Args: { object_name: string }; Returns: string };
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
