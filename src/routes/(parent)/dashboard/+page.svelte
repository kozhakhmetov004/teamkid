<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import MyTimeCard from '#lib/components/analytics/MyTimeCard.svelte';
	import SpendingChart from '#lib/components/analytics/SpendingChart.svelte';
	import InsightCard from '#lib/components/insights/InsightCard.svelte';
	import BalanceCard from '#lib/components/expenses/BalanceCard.svelte';
	import SafetyAlerts from '#lib/components/safety/SafetyAlerts.svelte';
	import BriefingCard from '#lib/components/today/BriefingCard.svelte';
	import DashboardSlot from '#lib/components/today/DashboardSlot.svelte';
	import NextHandover from '#lib/components/today/NextHandover.svelte';
	import PendingSwapsCard from '#lib/components/today/PendingSwapsCard.svelte';
	import TodayEvents from '#lib/components/today/TodayEvents.svelte';
	import TodayHeader from '#lib/components/today/TodayHeader.svelte';
	import UnreadMessagesCard from '#lib/components/today/UnreadMessagesCard.svelte';
	import WeekStrip from '#lib/components/today/WeekStrip.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import SwapRequestDialog from '#lib/components/calendar/SwapRequestDialog.svelte';
	import { subscribeToEvents } from '#lib/components/calendar/subscribeToEvents.js';
	import { subscribeToFamily } from '#lib/realtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let swapOpen = $state(false);

	const childName = $derived(data.child?.first_name ?? 'your child');

	// Send the browser's time zone to the server once, then reload the data in it.
	onMount(() => {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (tz && tz !== data.tz) {
			document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
			void invalidate('app:today');
		}
	});

	// Live updates: swaps and messages for this family (debounced reload).
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
			subscribeToEvents(familyId, refresh)
		];
		return () => {
			clearTimeout(timer);
			for (const off of unsubscribe) off();
		};
	});
</script>

<svelte:head><title>Today · TeamKid</title></svelte:head>

<div class="space-y-6">
	<TodayHeader {...data.header} />

	<SafetyAlerts familyId={data.parent.family_id} {childName} />

	{#if !data.child}
		<Card.Root>
			<Card.Header>
				<Card.Title>Add your child to get started</Card.Title>
				<Card.Description
					>Your child's calendar and Pebble appear once they're added.</Card.Description
				>
			</Card.Header>
			<Card.Footer><Button href="/family">Go to Family</Button></Card.Footer>
		</Card.Root>
	{:else if data.child.status !== 'active'}
		<Card.Root>
			<Card.Header>
				<Card.Title>{childName}'s account needs approval</Card.Title>
				<Card.Description>Both parents approve before {childName} can use Pebble.</Card.Description>
			</Card.Header>
			<Card.Footer><Button href="/family" variant="outline">Review on Family</Button></Card.Footer>
		</Card.Root>
	{/if}

	{#if !data.hasCoParent}
		<Card.Root>
			<Card.Header>
				<Card.Title>Invite your co-parent to share the calendar</Card.Title>
				<Card.Description
					>Swaps, messages and the week view work best with both parents.</Card.Description
				>
			</Card.Header>
			<Card.Footer><Button href="/family">Invite on Family</Button></Card.Footer>
		</Card.Root>
	{/if}

	<BriefingCard briefing={data.briefing} />

	<WeekStrip days={data.strip} />

	<div class="grid gap-4 md:grid-cols-2">
		<TodayEvents events={data.todayEvents} />
		<NextHandover
			handover={data.nextHandover}
			{childName}
			onRequestSwap={data.canSwap ? () => (swapOpen = true) : undefined}
		/>
		<PendingSwapsCard swaps={data.swaps} otherName={data.otherName} window={data.swapWindow} />
		<UnreadMessagesCard count={data.unread.count} threads={data.unread.threads} />
	</div>

	<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
		<p class="text-sm">Looking for ideas for your next weekend with {childName}?</p>
		<Button href="/plan">Plan my weekend</Button>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<DashboardSlot name="insights" title="{childName}'s week" owner="Member 2 (InsightCard)">
			{#if data.child}
				<InsightCard childId={data.child.id} {childName} familyId={data.parent.family_id} />
			{/if}
		</DashboardSlot>

		<DashboardSlot name="spending" title="Spending" owner="Member 1">
			<div class="grid gap-4">
				<SpendingChart months={data.slots.chart} compact />
				<BalanceCard text={data.slots.balance.text} items={data.slots.balance.items} compact />
			</div>
		</DashboardSlot>

		<DashboardSlot name="my-time" title="My time with {childName}" owner="Member 2 (P2)">
			{#if data.child}
				<MyTimeCard childId={data.child.id} {childName} />
			{/if}
		</DashboardSlot>
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
