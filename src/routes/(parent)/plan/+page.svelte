<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import AtHomeIdea from '#lib/components/plan/AtHomeIdea.svelte';
	import PlanForm from '#lib/components/plan/PlanForm.svelte';
	import PlanSkeleton from '#lib/components/plan/PlanSkeleton.svelte';
	import SuggestionCard from '#lib/components/plan/SuggestionCard.svelte';
	import {
		timeLabel,
		weekendLabel,
		type PlanParams,
		type PlanResponse
	} from '#lib/components/plan/types.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const childName = $derived(data.childName ?? 'your child');
	const otherName = $derived(data.otherParentName ?? 'your co-parent');

	// Default: the first weekend the child is with this parent.
	let saturday = $state('');
	$effect.pre(() => {
		if (!data.weekends.some((w) => w.saturday === saturday)) {
			saturday = (data.weekends.find((w) => w.withYou) ?? data.weekends[0])?.saturday ?? '';
		}
	});

	let loading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<PlanResponse | null>(null);
	let lastParams = $state<PlanParams | null>(null);
	let seconds = $state(0);

	// Times are the parent's local time (cookie), as on /calendar.
	onMount(() => {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (tz && tz !== data.tz) {
			document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
			void invalidate('app:plan');
		}
	});

	$effect(() => {
		if (!loading) return;
		seconds = 0;
		const timer = setInterval(() => (seconds += 1), 1000);
		return () => clearInterval(timer);
	});

	async function plan(params: PlanParams) {
		lastParams = params;
		loading = true;
		error = null;
		result = null;
		try {
			const res = await fetch('/api/planner/weekend', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(params),
				signal: AbortSignal.timeout(55_000)
			});
			const body = await res.json().catch(() => null);
			if (res.ok && body?.status) result = body as PlanResponse;
			else if (res.status === 429)
				error = 'You’ve planned several times in the last hour. Please try again a bit later.';
			else error = 'We couldn’t plan this weekend right now.';
		} catch {
			error = 'Planning took too long.';
		} finally {
			loading = false;
		}
	}

	function planWeekendOf(next: string) {
		saturday = next;
		if (lastParams) void plan({ ...lastParams, saturday: next });
	}
</script>

<svelte:head><title>Plan my weekend · TeamKid</title></svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Plan my weekend</h1>
		<p class="text-muted-foreground">
			Ideas near you for your time with {childName}, based on the wishes {childName} chose to share.
		</p>
	</div>

	<Card.Root>
		<Card.Content class="pt-6">
			<PlanForm
				weekends={data.weekends}
				{childName}
				otherParentName={otherName}
				{loading}
				onPlan={plan}
				bind:saturday
			/>
		</Card.Content>
	</Card.Root>

	{#if !data.hasWishes}
		<p class="text-sm text-muted-foreground">
			Ask {childName} to share wishes with Pebble for better ideas. Until then, ideas are based on
			{childName}'s age and week.
		</p>
	{/if}

	{#if loading}
		<PlanSkeleton {seconds} />
	{:else if error}
		<Card.Root role="alert">
			<Card.Header>
				<Card.Title>{error}</Card.Title>
				<Card.Description>Nothing was changed. You can try again.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Button onclick={() => lastParams && plan(lastParams)}>Try again</Button>
			</Card.Content>
		</Card.Root>
	{:else if result?.status === 'no_time'}
		<Card.Root role="status">
			<Card.Header>
				<Card.Title>
					No free time between {timeLabel(result.from)} and {timeLabel(result.to)} on {weekendLabel(
						result.saturday
					)}
				</Card.Title>
				<Card.Description>Try a wider time range (“All day”) or another weekend.</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else if result?.status === 'not_with_you'}
		<Card.Root>
			<Card.Header>
				<Card.Title>{childName} is with {otherName} on {weekendLabel(result.saturday)}</Card.Title>
				<Card.Description>
					{result.nextSaturday
						? `Your next weekend with ${childName} is ${weekendLabel(result.nextSaturday)}.`
						: `There's no weekend with ${childName} in the next four weeks.`}
				</Card.Description>
			</Card.Header>
			{#if result.nextSaturday}
				{@const next = result.nextSaturday}
				<Card.Content>
					<Button onclick={() => planWeekendOf(next)}>Plan {weekendLabel(next)} instead</Button>
				</Card.Content>
			{/if}
		</Card.Root>
	{:else if result?.status === 'ok'}
		<section class="space-y-4" aria-label="Suggestions">
			<div class="flex flex-wrap items-center gap-2 text-sm">
				{#if result.usedWishes.length}
					<span class="text-muted-foreground">Based on {childName}'s wishes:</span>
					{#each result.usedWishes as w (w)}
						<span class="rounded-4xl border border-border bg-secondary px-2 py-0.5 text-xs"
							>“{w}”</span
						>
					{/each}
				{/if}
			</div>
			{#if result.source === 'demo'}
				<p class="rounded-lg border border-pebble bg-pebble/20 p-3 text-sm" role="status">
					<strong>Demo places.</strong> Live map data isn't available right now, so these are sample places
					to show how planning works. Try again later for real places nearby.
				</p>
			{/if}
			{#if result.suggestions.length === 0}
				<p class="text-sm text-muted-foreground">
					No places nearby fit your free time. Try a larger distance or another weekend.
				</p>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each result.suggestions as s (s.place.id)}
						<SuggestionCard suggestion={s} demo={result.source === 'demo'} />
					{/each}
				</div>
			{/if}
			<AtHomeIdea idea={result.atHome} />
			<p class="text-xs text-muted-foreground">
				{#if result.source === 'osm'}
					Places data © <a
						class="underline"
						href="https://www.openstreetmap.org/copyright"
						target="_blank"
						rel="noopener noreferrer">OpenStreetMap contributors</a
					>.
				{/if}
				Check opening times before you go; suggestions are made by AI and can be wrong.
			</p>
		</section>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Have a parenting plan?</Card.Title>
			<Card.Description>
				Upload the PDF, check what we found, and add the custody schedule to your calendar.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Button href="/plan/import" variant="outline">Import your parenting plan</Button>
		</Card.Content>
	</Card.Root>
</div>
