<script lang="ts">
	import { invalidate } from '$app/navigation';
	import CustodyLegend from '#lib/components/calendar/CustodyLegend.svelte';
	import EventForm from '#lib/components/calendar/EventForm.svelte';
	import MonthView from '#lib/components/calendar/MonthView.svelte';
	import ScheduleForm from '#lib/components/calendar/ScheduleForm.svelte';
	import SwapRequestCard from '#lib/components/calendar/SwapRequestCard.svelte';
	import SwapRequestDialog from '#lib/components/calendar/SwapRequestDialog.svelte';
	import { subscribeToEvents } from '#lib/components/calendar/subscribeToEvents.js';
	import WeekView from '#lib/components/calendar/WeekView.svelte';
	import PlanWeekendPanel from '#lib/components/insights/PlanWeekendPanel.svelte';
	import type { CalDay, CalEvent } from '#lib/components/calendar/types.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { subscribeToFamily } from '#lib/realtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const otherName = $derived(data.otherName ?? 'your co-parent');
	const href = (params: Record<string, string>) =>
		`/calendar?${new URLSearchParams({ view: data.view, date: data.anchor, ...params })}`;

	// Event dialog
	let eventOpen = $state(false);
	let editing = $state<CalEvent | null>(null);
	function addEvent() {
		editing = null;
		eventOpen = true;
	}
	function editEvent(ev: CalEvent) {
		editing = ev;
		eventOpen = true;
	}

	// Swap dialog (from a day or the toolbar)
	let swapOpen = $state(false);
	let swapOriginal = $state('');
	let swapProposed = $state('');
	function swapFor(day: CalDay | null) {
		swapOriginal = day?.mine ? day.date : '';
		swapProposed = day && day.mine === false ? day.date : '';
		swapOpen = true;
	}

	// Live: swaps and events (incl. accepted swaps flipping nights).
	$effect(() => {
		const familyId = data.parent.family_id;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const refresh = () => {
			clearTimeout(timer);
			timer = setTimeout(() => void invalidate('app:calendar'), 300);
		};
		const offs = [
			subscribeToFamily('swap_requests', familyId, refresh),
			subscribeToEvents(familyId, refresh)
		];
		return () => {
			clearTimeout(timer);
			for (const off of offs) off();
		};
	});
</script>

<svelte:head><title>Calendar · TeamKid</title></svelte:head>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold">Calendar</h1>
			<p class="text-muted-foreground">{data.title}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button
				variant="outline"
				size="sm"
				href={href({ date: data.prev })}
				aria-label="Previous {data.view}">←</Button
			>
			<Button variant="outline" size="sm" href={href({ date: data.today })}>Today</Button>
			<Button
				variant="outline"
				size="sm"
				href={href({ date: data.next })}
				aria-label="Next {data.view}">→</Button
			>
			<div class="flex rounded-lg border p-0.5" role="group" aria-label="View">
				<a
					href={href({ view: 'week' })}
					aria-current={data.view === 'week' ? 'page' : undefined}
					class="rounded-md px-3 py-1 text-sm aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
					>Week</a
				>
				<a
					href={href({ view: 'month' })}
					aria-current={data.view === 'month' ? 'page' : undefined}
					class="rounded-md px-3 py-1 text-sm aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
					>Month</a
				>
			</div>
		</div>
	</div>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<CustodyLegend {otherName} />
		<div class="flex flex-wrap gap-2">
			<Button size="sm" onclick={addEvent}>Add event</Button>
			{#if data.canSwap}
				<Button size="sm" variant="outline" onclick={() => swapFor(null)}>Request a swap</Button>
			{/if}
		</div>
	</div>

	{#if data.swaps.length}
		<Card.Root>
			<Card.Header><Card.Title>Swap requests</Card.Title></Card.Header>
			<Card.Content class="divide-y">
				{#each data.swaps as swap (swap.id)}
					<SwapRequestCard {swap} {otherName} window={data.swapWindow} />
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.view === 'week'}
		<WeekView days={data.days} canSwap={data.canSwap} onSwap={swapFor} onEditEvent={editEvent} />
	{:else}
		<MonthView days={data.days} />
		<p class="text-xs text-muted-foreground">
			Open a day to see its events, edit them or request a swap.
		</p>
	{/if}

	<PlanWeekendPanel panel={data.plan} nudge={data.planNudge} />

	<details class="rounded-xl border bg-card p-4">
		<summary class="cursor-pointer font-medium">Set up the custody schedule</summary>
		<p class="mt-2 mb-4 text-sm text-muted-foreground">
			Creates custody nights for the next 12 weeks from the start date. Future nights are replaced;
			past nights are kept. Single nights change only through swaps.
		</p>
		<ScheduleForm
			defaults={data.schedule.defaults}
			homes={data.schedule.homes}
			templates={data.schedule.templates}
		/>
	</details>
</div>

<EventForm
	bind:open={eventOpen}
	event={editing}
	defaultDate={data.anchor}
	children={data.children}
/>
{#if data.canSwap}
	<SwapRequestDialog
		bind:open={swapOpen}
		originalDate={swapOriginal}
		proposedDate={swapProposed}
		{otherName}
		window={data.swapWindow}
	/>
{/if}
