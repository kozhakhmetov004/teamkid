<script lang="ts">
	/**
	 * Parent navigation. `sidebar` = vertical (desktop), `bar` = horizontal
	 * scroller (phones). Messages shows a live unread badge (messages from the
	 * other parent not opened yet; RLS limits the count to this family).
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

	let unread = $state(0);
	const me = $derived(
		(page.data as { parent?: { member_id: string; family_id: string } }).parent ?? null
	);

	onMount(() => {
		if (!me) return;
		const { member_id, family_id } = me;
		const client = getSupabaseBrowserClient();
		let timer: ReturnType<typeof setTimeout> | undefined;
		async function count() {
			const { count: n } = await client
				.from('messages')
				.select('id', { count: 'exact', head: true })
				.eq('family_id', family_id)
				.is('first_read_at', null)
				.neq('sender_id', member_id);
			unread = n ?? 0;
		}
		const channel = client
			.channel(`nav-unread:${family_id}:${variant}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'messages', filter: `family_id=eq.${family_id}` },
				() => {
					clearTimeout(timer);
					timer = setTimeout(count, 300);
				}
			)
			.subscribe();
		return () => {
			clearTimeout(timer);
			void client.removeChannel(channel);
		};
	});

	// Re-count after navigating (e.g. opening a thread marks it read).
	$effect(() => {
		void page.url.pathname;
		if (!me) return;
		const { member_id, family_id } = me;
		void getSupabaseBrowserClient()
			.from('messages')
			.select('id', { count: 'exact', head: true })
			.eq('family_id', family_id)
			.is('first_read_at', null)
			.neq('sender_id', member_id)
			.then(({ count: n }) => (unread = n ?? 0));
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
						{#if item.href === '/messages' && unread > 0}
							{@render badge(unread)}
							<span class="sr-only">({unread} unread)</span>
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
						{#if item.href === '/messages' && unread > 0}
							{@render badge(unread)}
							<span class="sr-only">({unread} unread)</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
