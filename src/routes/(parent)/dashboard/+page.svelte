<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import MyTimeCard from '#lib/components/analytics/MyTimeCard.svelte';
	import SpendingChart from '#lib/components/analytics/SpendingChart.svelte';
	import InsightCard from '#lib/components/insights/InsightCard.svelte';
	import SafetyAlerts from '#lib/components/safety/SafetyAlerts.svelte';
	import DashCard from '#lib/components/today/DashCard.svelte';
	import DashboardSlot from '#lib/components/today/DashboardSlot.svelte';
	import MoodToday from '#lib/components/today/MoodToday.svelte';
	import NextHandover from '#lib/components/today/NextHandover.svelte';
	import PendingSwapsCard from '#lib/components/today/PendingSwapsCard.svelte';
	import TodayHeader from '#lib/components/today/TodayHeader.svelte';
	import TonightCard from '#lib/components/today/TonightCard.svelte';
	import UnreadMessagesCard from '#lib/components/today/UnreadMessagesCard.svelte';
	import WeekStrip from '#lib/components/today/WeekStrip.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import SwapRequestDialog from '#lib/components/calendar/SwapRequestDialog.svelte';
	import { subscribeToEvents } from '#lib/components/calendar/subscribeToEvents.js';
	import { subscribeToSharedMood } from '#lib/components/today/subscribeToSharedMood.js';
	import { subscribeToFamily } from '#lib/realtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let swapOpen = $state(false);

	const childName = $derived(data.child?.first_name ?? 'your child');
	const tonight = $derived(data.strip.find((d) => d.isToday) ?? null);
	const childActive = $derived(data.child?.status === 'active');

	// Send the browser's time zone to the server once, then reload the data in it.
	onMount(() => {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (tz && tz !== data.tz) {
			document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
			void invalidate('app:today');
		}
	});

	// Live updates: swaps, messages, events and the shared feeling (debounced reload).
	$effect(() => {
		const familyId = data.parent.family_id;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const refresh = () => {
			clearTimeout(timer);
			timer = setTimeout(() => void invalidate('app:today'), 300);
		};
		const unsubscribe = [
			subscribeToFamily('swap_requests', familyId, refresh),
			subscribeToFamily('messages', familyId, refresh),
			subscribeToEvents(familyId, refresh),
			subscribeToSharedMood(familyId, refresh)
		];
		return () => {
			clearTimeout(timer);
			for (const off of unsubscribe) off();
		};
	});
</script>

<svelte:head><title>Today · TeamKid</title></svelte:head>

{#snippet notice(icon: string, title: string, text: string, href: string, label: string)}
	<div
		class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-pebble/60 bg-pebble/15 px-4 py-3 text-sm"
	>
		<span aria-hidden="true" class="text-lg">{icon}</span>
		<p class="min-w-0 flex-1">
			<span class="font-semibold">{title}</span>
			<span class="text-muted-foreground"> · {text}</span>
		</p>
		<Button {href} size="sm" variant="outline">{label}</Button>
	</div>
{/snippet}

<div class="space-y-6 sm:space-y-8">
	<!-- Header: greeting + the main shortcut -->
	<div class="flex flex-wrap items-end justify-between gap-4">
		<TodayHeader {...data.header} custodyLine={null} />
		{#if data.child}
			<Button href="/calendar#plan" class="shrink-0">Plan this weekend</Button>
		{/if}
	</div>

	<SafetyAlerts familyId={data.parent.family_id} {childName} />

	<!-- Setup steps: compact one-line callouts -->
	{#if !data.child || !childActive || !data.hasCoParent}
		<div class="grid gap-2">
			{#if !data.child}
				{@render notice(
					'👶',
					'Add your child to get started',
					"Their calendar and Pebble appear once they're added.",
					'/family',
					'Go to Family'
				)}
			{:else if !childActive}
				{@render notice(
					'✅',
					`${childName}'s account needs approval`,
					`Both parents approve before ${childName} can use Pebble.`,
					'/family',
					'Review'
				)}
			{/if}
			{#if !data.hasCoParent}
				{@render notice(
					'🤝',
					'Invite your co-parent',
					'Swaps, messages and the week view work best with both parents.',
					'/family',
					'Invite'
				)}
			{/if}
		</div>
	{/if}

	<!--
		Two columns on desktop that stack independently (no holes between cards).
		On phones the column wrappers become `contents`, so every card sits in one
		list ordered by importance (order-*): tonight + today, handover, week,
		swaps, messages, child's week, feeling + My time, money.
	-->
	<div class="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
		<div class="contents lg:col-span-8 lg:flex lg:flex-col lg:gap-6">
			<div class="order-1 min-w-0 lg:order-none">
				<TonightCard
					{childName}
					mine={tonight?.mine ?? null}
					withName={tonight?.label ?? null}
					custodyLine={data.header.custodyLine}
					events={data.todayEvents}
					briefing={data.briefing}
				/>
			</div>
			<div class="order-3 min-w-0 lg:order-none">
				<WeekStrip days={data.strip} />
			</div>
			{#if data.child}
				<div class="order-6 min-w-0 lg:order-none">
					<DashboardSlot name="insights" title="{childName}'s week" owner="Member 2 (InsightCard)">
						<InsightCard childId={data.child.id} {childName} familyId={data.parent.family_id} />
					</DashboardSlot>
				</div>
			{/if}
			<div class="order-8 min-w-0 lg:order-none">
				<DashboardSlot name="spending" title="Spending" owner="Member 1">
					<SpendingChart months={data.slots.chart} compact />
				</DashboardSlot>
			</div>
		</div>

		<div class="contents lg:col-span-4 lg:flex lg:flex-col lg:gap-6">
			<div class="order-2 min-w-0 lg:order-none">
				<NextHandover
					handover={data.nextHandover}
					{childName}
					onRequestSwap={data.canSwap ? () => (swapOpen = true) : undefined}
				/>
			</div>
			<div class="order-4 min-w-0 lg:order-none">
				<PendingSwapsCard swaps={data.swaps} otherName={data.otherName} window={data.swapWindow} />
			</div>
			<div class="order-5 min-w-0 lg:order-none">
				<UnreadMessagesCard count={data.unread.count} threads={data.unread.threads} />
			</div>
			{#if data.child}
				<div class="order-7 grid min-w-0 gap-4 lg:order-none lg:gap-6">
					{#if childActive}
						<MoodToday {childName} mood={data.moodToday} />
					{/if}
					<DashboardSlot name="my-time" title="My time with {childName}" owner="Member 2 (P2)">
						<MyTimeCard childId={data.child.id} {childName} />
					</DashboardSlot>
				</div>
			{/if}
			<div class="order-9 min-w-0 lg:order-none">
				<DashCard
					title="Balance"
					icon="💰"
					action={data.slots.balance.items > 0
						? { href: '/expenses?status=approved', label: 'See them' }
						: { href: '/expenses', label: 'Expenses' }}
				>
					<p class="text-lg leading-snug font-semibold">{data.slots.balance.text}</p>
					<p class="mt-1 text-sm text-muted-foreground">
						{data.slots.balance.items === 0
							? 'Nothing outstanding.'
							: `From ${data.slots.balance.items} approved expense${data.slots.balance.items === 1 ? '' : 's'} not reimbursed yet.`}
					</p>
				</DashCard>
			</div>
		</div>
	</div>
</div>
{#if data.canSwap}
	<SwapRequestDialog
		bind:open={swapOpen}
		originalDate={data.swapPrefill.original}
		proposedDate={data.swapPrefill.proposed}
		otherName={data.otherName ?? 'your co-parent'}
		window={data.swapWindow}
	/>
{/if}
