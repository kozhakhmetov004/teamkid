<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
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
	import { subscribeToFamily } from '#lib/realtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const childName = $derived(data.child?.first_name ?? 'your child');
	const money = (cents: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
	const monthLabel = (iso: string | null) =>
		iso
			? new Intl.DateTimeFormat('en-US', {
					month: 'long',
					year: 'numeric',
					timeZone: 'UTC'
				}).format(new Date(iso))
			: 'This month';

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
			subscribeToFamily('messages', familyId, refresh)
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
		<NextHandover handover={data.nextHandover} {childName} />
		<PendingSwapsCard swaps={data.swaps} otherName={data.otherName} />
		<UnreadMessagesCard count={data.unread.count} threads={data.unread.threads} />
	</div>

	<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
		<p class="text-sm">Looking for ideas for your next weekend with {childName}?</p>
		<Button href="/plan">Plan my weekend</Button>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<DashboardSlot name="insights" title="{childName}'s week" owner="Member 2 (InsightCard)" />

		<DashboardSlot name="spending" title="Spending" owner="Member 1 (P2)">
			<Card.Root class="h-full">
				<Card.Header>
					<Card.Title>Spending</Card.Title>
					<Card.Description
						>{monthLabel(data.slots.spending.month)} · same numbers for both parents</Card.Description
					>
				</Card.Header>
				<Card.Content>
					{#if data.slots.spending.rows.length === 0}
						<p class="text-sm text-muted-foreground">No expenses logged yet.</p>
					{:else}
						<ul class="space-y-1 text-sm">
							{#each data.slots.spending.rows as row (row.category)}
								<li class="flex justify-between">
									<span class="capitalize">{row.category}</span>
									<span class="tabular-nums">{money(row.totalCents)}</span>
								</li>
							{/each}
						</ul>
						<p class="mt-2 text-right text-sm font-semibold tabular-nums">
							Total {money(data.slots.spending.totalCents)}
						</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</DashboardSlot>

		<DashboardSlot name="my-time" title="My time with {childName}" owner="Member 2 (P2)">
			<Card.Root class="h-full">
				<Card.Header>
					<Card.Title>My time with {childName}</Card.Title>
					<Card.Description>Private · only you see this card</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm">
					<p>
						<span class="text-xl font-bold">{data.slots.myTime.outings}</span>
						outing{data.slots.myTime.outings === 1 ? '' : 's'} logged recently{#if data.slots.myTime.avgRating !== null}<span
								class="ms-1">· rating <strong>{data.slots.myTime.avgRating}★</strong></span
							>{/if}
					</p>
					{#if data.slots.myTime.suggestion}
						<p class="rounded-lg bg-secondary p-3 text-secondary-foreground">
							💡 {data.slots.myTime.suggestion}
						</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</DashboardSlot>
	</div>
</div>
