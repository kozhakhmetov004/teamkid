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
	const swapsEmpty = $derived(data.swaps.length === 0);
	const messagesEmpty = $derived(data.unread.threads.length === 0);

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

<!--
	Card look (white, no outline, header row) comes from ParentShell. Here only:
	when a row makes a card taller than its content, the content spreads out
	over the height instead of leaving a gap at the bottom.
-->
<div
	class="space-y-6 sm:space-y-8 [&_[data-slot=card-content]]:flex [&_[data-slot=card-content]]:flex-col [&_[data-slot=card-content]]:justify-between [&_[data-slot=card-content]]:gap-4"
>
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
		Rows on a 12-column grid: cards in the same row line up (equal height).
		An empty card never shares a row (it would stretch into a big box): it
		becomes a full-width one-line strip instead. Phones: one column, same order.
	-->
	<div class="grid gap-4 lg:grid-cols-12 lg:gap-6">
		<!-- Row 1: tonight + today | the child's feeling + next handover -->
		<div class="min-w-0 lg:col-span-8">
			<TonightCard
				{childName}
				mine={tonight?.mine ?? null}
				withName={tonight?.label ?? null}
				custodyLine={data.header.custodyLine}
				events={data.todayEvents}
				briefing={data.briefing}
			/>
		</div>
		<!--
			Right column: the feeling card absorbs any extra row height; Next
			handover keeps its natural height. (The Tonight card grows its teal
			top, never the white list, so neither side shows a blank gap.)
		-->
		<div class="flex min-w-0 flex-col gap-4 lg:col-span-4 lg:gap-6">
			{#if data.child && childActive}
				<div class="flex-1 [&>*]:h-full">
					<DashCard title="{childName}'s feeling" icon="💛">
						<MoodToday {childName} mood={data.moodToday} />
					</DashCard>
				</div>
			{/if}
			<div>
				<NextHandover
					handover={data.nextHandover}
					{childName}
					onRequestSwap={data.canSwap ? () => (swapOpen = true) : undefined}
				/>
			</div>
		</div>

		<!-- Row 2: the week -->
		<div class="min-w-0 lg:col-span-12">
			<WeekStrip days={data.strip} />
		</div>

		<!-- Row 3: things to act on -->
		{#if swapsEmpty || messagesEmpty}
			<div class="grid min-w-0 gap-4 lg:col-span-12 lg:gap-6">
				<PendingSwapsCard swaps={data.swaps} otherName={data.otherName} window={data.swapWindow} />
				<UnreadMessagesCard count={data.unread.count} threads={data.unread.threads} />
			</div>
		{:else}
			<div class="min-w-0 lg:col-span-6">
				<PendingSwapsCard swaps={data.swaps} otherName={data.otherName} window={data.swapWindow} />
			</div>
			<div class="min-w-0 lg:col-span-6">
				<UnreadMessagesCard count={data.unread.count} threads={data.unread.threads} />
			</div>
		{/if}

		<!-- Row 4: the child's week | my time -->
		{#if data.child}
			<div class="min-w-0 lg:col-span-8 [&>section]:h-full">
				<DashboardSlot name="insights" title="{childName}'s week" owner="Member 2 (InsightCard)">
					<InsightCard childId={data.child.id} {childName} familyId={data.parent.family_id} />
				</DashboardSlot>
			</div>
			<div class="min-w-0 lg:col-span-4 [&>section]:h-full">
				<DashboardSlot name="my-time" title="My time with {childName}" owner="Member 2 (P2)">
					<MyTimeCard childId={data.child.id} {childName} />
				</DashboardSlot>
			</div>
		{/if}

		<!-- Row 5: money -->
		<div class="min-w-0 lg:col-span-8 [&>section]:h-full">
			<DashboardSlot name="spending" title="Spending" owner="Member 1">
				<SpendingChart months={data.slots.chart} compact />
			</DashboardSlot>
		</div>
		<div class="min-w-0 lg:col-span-4">
			<DashCard title="Balance" icon="💰" action={{ href: '/expenses', label: 'Expenses' }}>
				<div>
					<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Right now</p>
					<p class="mt-1 text-2xl leading-tight font-bold">{data.slots.balance.text}</p>
				</div>
				<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
					<p class="text-sm text-muted-foreground">
						{data.slots.balance.items === 0
							? 'Nothing outstanding.'
							: `${data.slots.balance.items} approved expense${data.slots.balance.items === 1 ? '' : 's'} not reimbursed yet.`}
					</p>
					{#if data.slots.balance.items > 0}
						<Button href="/expenses?status=approved" size="sm" variant="outline">See them</Button>
					{/if}
				</div>
			</DashCard>
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
