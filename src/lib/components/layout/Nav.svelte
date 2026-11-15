<script lang="ts">
	/**
	 * Parent navigation. `sidebar` = vertical (desktop), `bar` = horizontal
	 * scroller (phones). Badges show what waits for me from the other parent:
	 * unread messages, swap requests (Planner), and expenses, purchase requests,
	 * monthly costs and split proposals (Expenses). RLS limits counts to this family.
	 */
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import FileText from '@lucide/svelte/icons/file-text';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Users from '@lucide/svelte/icons/users';
	import Wallet from '@lucide/svelte/icons/wallet';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getSupabaseBrowserClient } from '#lib/supabase.js';

	let { variant = 'bar' }: { variant?: 'sidebar' | 'bar' } = $props();

	const PARENT_NAV = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/calendar', label: 'Planner', icon: CalendarDays },
		{ href: '/messages', label: 'Messages', icon: MessageSquare },
		{ href: '/expenses', label: 'Expenses', icon: Wallet },
		{ href: '/documents', label: 'Documents', icon: FileText },
		{ href: '/family', label: 'Family', icon: Users }
	] as const;

	const isActive = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);

	/** Badges per menu item: things the OTHER parent sent that wait for me. */
	let counts = $state<Record<string, number>>({});
	const me = $derived(
		(page.data as { parent?: { member_id: string; family_id: string } }).parent ?? null
	);

	async function countAll(member_id: string, family_id: string) {
		const client = getSupabaseBrowserClient();
		const head = { count: 'exact' as const, head: true };
		const [unread, swaps, expenses, requests, recurring, splits] = await Promise.all([
			client
				.from('messages')
				.select('id', head)
				.eq('family_id', family_id)
				.is('first_read_at', null)
				.neq('sender_id', member_id),
			client
				.from('swap_requests')
				.select('id', head)
				.eq('family_id', family_id)
				.eq('status', 'pending')
				.neq('requested_by', member_id),
			client
				.from('expenses')
				.select('id', head)
				.eq('family_id', family_id)
				.eq('status', 'pending')
				.neq('paid_by', member_id),
			client
				.from('expense_requests')
				.select('id', head)
				.eq('family_id', family_id)
				.eq('status', 'pending')
				.neq('requested_by', member_id),
			client
				.from('recurring_expenses')
				.select('id', head)
				.eq('family_id', family_id)
				.eq('status', 'pending')
				.neq('created_by', member_id),
			client
				.from('split_proposals')
				.select('id', head)
				.eq('family_id', family_id)
				.eq('status', 'pending')
				.neq('proposed_by', member_id)
		]);
		const n = (r: { count: number | null }) => r.count ?? 0;
		counts = {
			'/messages': n(unread),
			'/calendar': n(swaps),
			'/expenses': n(expenses) + n(requests) + n(recurring) + n(splits)
		};
	}

	const BADGE_LABEL: Record<string, string> = {
		'/messages': 'unread',
		'/calendar': 'swap requests to answer',
		'/expenses': 'waiting for your answer'
	};

	onMount(() => {
		if (!me) return;
		const { member_id, family_id } = me;
		const client = getSupabaseBrowserClient();
		let timer: ReturnType<typeof setTimeout> | undefined;
		const recount = () => {
			clearTimeout(timer);
			timer = setTimeout(() => void countAll(member_id, family_id), 300);
		};
		const filter = `family_id=eq.${family_id}`;
		let channel = client.channel(`nav-badges:${family_id}:${variant}`);
		for (const table of ['messages', 'swap_requests', 'expenses'] as const) {
			channel = channel.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table, filter },
				recount
			);
		}
		channel.subscribe();
		// Tables without Realtime (requests, monthly costs, splits) catch up here.
		const poll = setInterval(recount, 60_000);
		return () => {
			clearTimeout(timer);
			clearInterval(poll);
			void client.removeChannel(channel);
		};
	});

	// Re-count after navigating (e.g. opening a thread marks it read).
	$effect(() => {
		void page.url.pathname;
		if (me) void countAll(me.member_id, me.family_id);
	});
</script>

{#snippet badge(n: number)}
	<span
		class="ml-auto grid min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] leading-5 font-semibold text-white"
		aria-hidden="true">{n > 99 ? '99+' : n}</span
	>
{/snippet}

{#if variant === 'sidebar'}
	<nav aria-label="Main">
		<ul class="space-y-1">
			{#each PARENT_NAV as item (item.href)}
				{@const Icon = item.icon}
				<li>
					<a
						href={item.href}
						aria-current={isActive(item.href) ? 'page' : undefined}
						class="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
					>
						<Icon class="size-4 shrink-0" aria-hidden="true" />
						{item.label}
						{#if counts[item.href]}
							{@render badge(counts[item.href])}
							<span class="sr-only">({counts[item.href]} {BADGE_LABEL[item.href]})</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{:else}
	<nav aria-label="Main" class="-mx-4 overflow-x-auto px-4">
		<ul class="flex min-w-max gap-1">
			{#each PARENT_NAV as item (item.href)}
				{@const Icon = item.icon}
				<li>
					<a
						href={item.href}
						aria-current={isActive(item.href) ? 'page' : undefined}
						class="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
					>
						<Icon class="size-4 shrink-0" aria-hidden="true" />
						{item.label}
						{#if counts[item.href]}
							{@render badge(counts[item.href])}
							<span class="sr-only">({counts[item.href]} {BADGE_LABEL[item.href]})</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
