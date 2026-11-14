<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { CITIES, DEFAULT_CITY } from './cities.js';
	import { weekendLabel, type PlanParams } from './types.js';

	let {
		weekends,
		childName,
		otherParentName,
		loading,
		onPlan,
		saturday = $bindable()
	}: {
		weekends: { saturday: string; withYou: boolean }[];
		childName: string;
		otherParentName: string;
		loading: boolean;
		onPlan: (p: PlanParams) => void;
		saturday: string;
	} = $props();

	const STORE = 'teamkid.planner';
	let cityId = $state(DEFAULT_CITY);
	let radiusMiles = $state<5 | 10 | 25>(10);
	let budget = $state<PlanParams['budget']>('any');
	/** The parent's own time range (local). Not remembered: every visit starts at all day. */
	let from = $state('09:00');
	let to = $state('19:00');
	const PRESETS = [
		{ label: 'Morning', from: '09:00', to: '13:00' },
		{ label: 'Afternoon', from: '13:00', to: '19:00' },
		{ label: 'All day', from: '09:00', to: '19:00' }
	] as const;
	const rangeProblem = $derived.by(() => {
		if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to))
			return 'Enter a start and an end time.';
		if (from < '07:00' || to > '21:00') return 'Pick times between 7 AM and 9 PM.';
		const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
		if (mins(to) - mins(from) < 60) return 'Leave at least one hour.';
		return null;
	});
	/** "Use my location": rounded to ~1 km in the browser, never stored on the server. */
	let myLocation = $state<{ lat: number; lon: number } | null>(null);
	let locating = $state(false);
	let locationError = $state<string | null>(null);

	// Per-parent conveniences only (city, distance, budget); storage may be blocked.
	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(STORE) ?? '{}');
			if (CITIES.some((c) => c.id === saved.cityId)) cityId = saved.cityId;
			if ([5, 10, 25].includes(saved.radiusMiles)) radiusMiles = saved.radiusMiles;
			if (['free', 'under_25', 'under_60', 'any'].includes(saved.budget)) budget = saved.budget;
		} catch {
			// private window or blocked storage: keep the defaults
		}
	});

	function remember() {
		try {
			localStorage.setItem(STORE, JSON.stringify({ cityId, radiusMiles, budget }));
		} catch {
			// ignore
		}
	}

	function useMyLocation() {
		locationError = null;
		if (!('geolocation' in navigator)) {
			locationError = 'Your browser can’t share a location. Pick a city instead.';
			return;
		}
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const round = (n: number) => Math.round(n * 100) / 100;
				myLocation = { lat: round(pos.coords.latitude), lon: round(pos.coords.longitude) };
				locating = false;
			},
			() => {
				locationError = 'Location wasn’t shared. Pick a city instead.';
				locating = false;
			},
			{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }
		);
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (rangeProblem) return;
		remember();
		const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0];
		onPlan({
			saturday,
			center: myLocation ?? { lat: city.lat, lon: city.lon },
			radiusMiles,
			budget,
			from,
			to
		});
	}

	const selectClass =
		'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

<form onsubmit={submit} class="grid items-end gap-4 md:grid-cols-2 lg:grid-cols-3">
	<div class="space-y-1">
		<Label for="pf-weekend">Weekend</Label>
		<select id="pf-weekend" class={selectClass} bind:value={saturday}>
			{#each weekends as w (w.saturday)}
				<option value={w.saturday}>
					{weekendLabel(w.saturday)} · {w.withYou
						? `${childName} is with you`
						: `with ${otherParentName}`}
				</option>
			{/each}
		</select>
	</div>

	<div class="space-y-1">
		<Label for="pf-city">Near</Label>
		{#if myLocation}
			<div
				class="flex h-9 items-center justify-between gap-2 rounded-lg border border-input px-2 text-sm"
			>
				<span>Your location (about 1 km)</span>
				<button type="button" class="text-xs underline" onclick={() => (myLocation = null)}>
					Use a city
				</button>
			</div>
		{:else}
			<div class="flex gap-2">
				<select id="pf-city" class={selectClass} bind:value={cityId}>
					{#each CITIES as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
				</select>
				<Button
					type="button"
					variant="outline"
					size="sm"
					class="h-9 shrink-0"
					onclick={useMyLocation}
					disabled={locating}
				>
					{locating ? 'Locating…' : 'Use my location'}
				</Button>
			</div>
		{/if}
		{#if locationError}<p role="alert" class="text-xs text-destructive">{locationError}</p>{/if}
	</div>

	<div class="space-y-1">
		<Label for="pf-radius">Max distance</Label>
		<select id="pf-radius" class={selectClass} bind:value={radiusMiles}>
			<option value={5}>5 miles</option>
			<option value={10}>10 miles</option>
			<option value={25}>25 miles</option>
		</select>
	</div>

	<div class="space-y-1">
		<Label for="pf-budget">Budget per outing</Label>
		<select id="pf-budget" class={selectClass} bind:value={budget}>
			<option value="free">Free</option>
			<option value="under_25">Under $25</option>
			<option value="under_60">Under $60</option>
			<option value="any">Any</option>
		</select>
	</div>

	<fieldset class="space-y-1">
		<legend class="text-sm leading-none font-medium select-none">Time</legend>
		<div class="flex items-center gap-2">
			<Label for="pf-from" class="sr-only">From</Label>
			<Input id="pf-from" type="time" step="900" min="07:00" max="21:00" bind:value={from} />
			<span class="text-sm text-muted-foreground" aria-hidden="true">to</span>
			<Label for="pf-to" class="sr-only">To</Label>
			<Input id="pf-to" type="time" step="900" min="07:00" max="21:00" bind:value={to} />
		</div>
		<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
			{#each PRESETS as p (p.label)}
				<button
					type="button"
					class="underline-offset-2 hover:underline aria-pressed:font-semibold aria-pressed:text-primary"
					aria-pressed={from === p.from && to === p.to}
					onclick={() => {
						from = p.from;
						to = p.to;
					}}>{p.label}</button
				>
			{/each}
		</div>
		{#if rangeProblem}<p role="alert" class="text-xs text-destructive">{rangeProblem}</p>{/if}
	</fieldset>

	<Button type="submit" disabled={loading || !!rangeProblem} class="h-9">
		{loading ? 'Planning…' : 'Plan my weekend'}
	</Button>
</form>
