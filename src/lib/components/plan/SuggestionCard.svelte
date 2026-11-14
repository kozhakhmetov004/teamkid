<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { CATEGORY_LABEL, miles, type PlannedSuggestion } from './types.js';

	let { suggestion, demo }: { suggestion: PlannedSuggestion; demo: boolean } = $props();

	const p = $derived(suggestion.place);
	const mapsUrl = $derived(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`);
	const placeText = $derived(p.address ? `${p.name}, ${p.address}` : p.name);
	const uid = $props.id();

	// The AI's slot, editable before saving (the card is re-created for every plan).
	const initial = untrack(() => ({
		date: suggestion.date,
		from: suggestion.from,
		to: suggestion.to
	}));
	let date = $state(initial.date);
	let from = $state(initial.from);
	let to = $state(initial.to);
	const edited = $derived(date !== initial.date || from !== initial.from || to !== initial.to);

	/** Same rules as the server (which checks again): one day, 30 min to 8 h. */
	const problem = $derived.by(() => {
		if (
			!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
			!/^\d{2}:\d{2}$/.test(from) ||
			!/^\d{2}:\d{2}$/.test(to)
		) {
			return 'Enter a day, a start and an end time.';
		}
		const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
		const length = mins(to) - mins(from);
		if (length <= 0) return 'The end time must be after the start time.';
		if (length < 30) return 'Make it at least 30 minutes.';
		if (length > 480) return 'Keep it to 8 hours or less.';
		return null;
	});

	// Soft warnings for an edited time (custody, overlaps). They never block saving.
	let warnings = $state<string[]>([]);
	$effect(() => {
		const slot = { date, from, to };
		if (!edited || problem) {
			warnings = [];
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			try {
				const res = await fetch('/api/planner/check-slot', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(slot),
					signal: controller.signal
				});
				const body = await res.json();
				warnings = res.ok && Array.isArray(body.warnings) ? body.warnings : [];
			} catch {
				// aborted or offline: no warning is better than a wrong one
			}
		}, 400);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	let adding = $state(false);
	let added = $state(false);
	let saveError = $state<string | null>(null);
</script>

<Card.Root class="flex h-full flex-col">
	<Card.Header>
		<div class="flex flex-wrap items-center gap-2 text-xs">
			<span
				class="rounded-4xl border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium text-primary"
			>
				{CATEGORY_LABEL[p.category] ?? p.category}
			</span>
			{#if demo}
				<span
					class="rounded-4xl border border-pebble bg-pebble/30 px-2 py-0.5 font-medium text-pebble-foreground"
				>
					Demo place
				</span>
			{/if}
			<span class="text-muted-foreground">{miles(p.distanceKm)} away</span>
		</div>
		<Card.Title class="text-lg">{p.name}</Card.Title>
		<Card.Description>{suggestion.title}</Card.Description>
	</Card.Header>
	<form
		method="POST"
		action="?/add"
		class="flex flex-1 flex-col"
		use:enhance={({ cancel }) => {
			if (problem) {
				cancel();
				return;
			}
			adding = true;
			saveError = null;
			return async ({ result }) => {
				adding = false;
				if (result.type === 'success') {
					added = true;
					toast.success(String(result.data?.message ?? 'Added to your calendar'));
				} else if (result.type === 'failure') {
					saveError = String(result.data?.message ?? 'Could not add it to the calendar.');
				} else {
					saveError = 'Could not add it to the calendar.';
				}
			};
		}}
	>
		<Card.Content class="flex-1 space-y-3 text-sm">
			<p>{suggestion.why}</p>

			<fieldset class="space-y-1" disabled={added}>
				<legend class="sr-only">When</legend>
				<div class="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
					<div class="space-y-1">
						<Label for="{uid}-date" class="text-xs">Day</Label>
						<Input id="{uid}-date" name="date" type="date" bind:value={date} required />
					</div>
					<div class="space-y-1">
						<Label for="{uid}-from" class="text-xs">Start</Label>
						<Input id="{uid}-from" name="from" type="time" step="900" bind:value={from} required />
					</div>
					<div class="space-y-1">
						<Label for="{uid}-to" class="text-xs">End</Label>
						<Input id="{uid}-to" name="to" type="time" step="900" bind:value={to} required />
					</div>
				</div>
			</fieldset>
			{#if problem}<p role="alert" class="text-xs text-destructive">{problem}</p>{/if}
			{#each warnings as w (w)}
				<p
					class="rounded-md border border-pebble bg-pebble/20 px-2 py-1 text-xs text-pebble-foreground"
					role="status"
				>
					⚠ {w}. You can still add it.
				</p>
			{/each}

			{#if p.address}<p class="text-muted-foreground">{p.address}</p>{/if}
			{#if p.openingHours}<p class="text-xs text-muted-foreground">Hours: {p.openingHours}</p>{/if}
			<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
				{#if !demo}
					<a class="underline" href={mapsUrl} target="_blank" rel="noopener noreferrer"
						>Open in Google Maps</a
					>
				{/if}
				{#if p.website}
					<a class="underline" href={p.website} target="_blank" rel="noopener noreferrer nofollow"
						>Website</a
					>
				{/if}
			</div>
		</Card.Content>
		<Card.Footer class="flex-col items-start gap-2">
			<input type="hidden" name="title" value={suggestion.title} />
			<input type="hidden" name="place" value={placeText.slice(0, 200)} />
			{#if saveError}<p role="alert" class="text-xs text-destructive">{saveError}</p>{/if}
			<Button
				type="submit"
				variant={added ? 'outline' : 'default'}
				disabled={adding || added || !!problem}
			>
				{added ? '✓ Added to calendar' : adding ? 'Adding…' : 'Add to calendar'}
			</Button>
		</Card.Footer>
	</form>
</Card.Root>
