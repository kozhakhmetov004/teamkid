<script lang="ts">
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
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
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { subscribeToFamily } from '#lib/realtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const otherName = $derived(data.otherName ?? 'your co-parent');
	const href = (params: Record<string, string>) =>
		`/calendar?${new URLSearchParams({ view: data.view, date: data.anchor, ...params })}`;

	let scheduleOpen = $state(false);

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

<svelte:head><title>Planner · TeamKid</title></svelte:head>

<div class="space-y-6">
	<PageHeader title="Planner" icon="🗓️" description={data.title}>
		{#snippet actions()}
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
			<div class="flex rounded-lg bg-card p-0.5 shadow-sm" role="group" aria-label="View">
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
		{/snippet}
	</PageHeader>

	<div
		class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 shadow-sm"
	>
		<CustodyLegend {otherName} />
		<div class="flex flex-wrap gap-2">
			<Button size="sm" onclick={addEvent}>Add event</Button>
			<Button size="sm" variant="outline" onclick={() => (scheduleOpen = true)}
				>Set up schedule</Button
			>
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
</div>

<Dialog.Root bind:open={scheduleOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Set up the custody schedule</Dialog.Title>
			<Dialog.Description>
				Creates custody nights for the next 12 weeks from the start date. Future nights are
				replaced; past nights are kept. Single nights change only through swaps.
			</Dialog.Description>
		</Dialog.Header>
		<ScheduleForm
			defaults={data.schedule.defaults}
			homes={data.schedule.homes}
			templates={data.schedule.templates}
			onsaved={() => (scheduleOpen = false)}
		/>
		<p class="rounded-lg bg-muted/60 p-3 text-sm">
			Have a parenting plan as a PDF?
			<a
				href="/plan/import"
				class="font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				>Import it and we'll read the schedule for you</a
			>.
		</p>
	</Dialog.Content>
</Dialog.Root>

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
