<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
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
			: '';
	const moodLabel: Record<string, string> = {
		mostly_happy: 'Mostly happy',
		mostly_calm: 'Mostly calm',
		mixed: 'A mixed week',
		a_bit_tired: 'A bit tired',
		a_bit_low: 'A bit low'
	};
</script>

<svelte:head><title>Dashboard · TeamKid</title></svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-2">
		<div>
			<h1 class="text-2xl font-bold">Hi, {data.parent.display_name}</h1>
			<p class="text-muted-foreground">Here's this week for {childName}.</p>
		</div>
		{#if data.child && data.child.status !== 'active'}
			<Button href="/family" variant="outline">{childName}'s account needs approval</Button>
		{/if}
	</div>

	{#if !data.child}
		<Card.Root>
			<Card.Header>
				<Card.Title>Add your child to get started</Card.Title>
				<Card.Description
					>Invite your co-parent and add your child on the Family page.</Card.Description
				>
			</Card.Header>
			<Card.Footer><Button href="/family">Go to Family</Button></Card.Footer>
		</Card.Root>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		<!-- This week (shared) -->
		<Card.Root>
			<Card.Header>
				<Card.Title>This week</Card.Title>
				<Card.Description>Calendar · shared with both parents</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.week.length === 0}
					<p class="text-sm text-muted-foreground">Nothing on the calendar this week.</p>
				{:else}
					<ul class="divide-y">
						{#each data.week as event (event.id)}
							<li class="flex items-center justify-between gap-3 py-2 text-sm">
								<span class="w-24 shrink-0 text-muted-foreground">{event.day}</span>
								<span class="flex-1">{event.title}</span>
								{#if event.home}<Badge variant="secondary">{event.home}</Badge>{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Child's week (insights, identical for both parents) -->
		<Card.Root>
			<Card.Header>
				<Card.Title>{childName}'s week</Card.Title>
				<Card.Description
					>Weekly insight · the same for both parents, never {childName}'s own words</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if data.insight}
					<p class="text-lg font-medium">
						{data.insight.summary ?? moodLabel[data.insight.mood_trend] ?? data.insight.mood_trend}
					</p>
					<div class="flex flex-wrap gap-2">
						<Badge variant="outline"
							>{moodLabel[data.insight.mood_trend] ?? data.insight.mood_trend}</Badge
						>
						{#each data.insight.interests as interest (interest)}<Badge variant="secondary"
								>{interest}</Badge
							>{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						The first insight appears after a week of check-ins.
					</p>
				{/if}
				{#if data.sharedWishes.length}
					<div>
						<p class="text-sm font-medium">{childName} wants to share:</p>
						<ul class="mt-1 list-inside list-disc text-sm">
							{#each data.sharedWishes as wish (wish)}<li>{wish}</li>{/each}
						</ul>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Spending (shared) -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Spending</Card.Title>
				<Card.Description
					>{monthLabel(data.spending.month) || 'This month'} · same numbers for both parents</Card.Description
				>
			</Card.Header>
			<Card.Content>
				{#if data.spending.rows.length === 0}
					<p class="text-sm text-muted-foreground">No expenses logged yet.</p>
				{:else}
					<ul class="space-y-2">
						{#each data.spending.rows as row (row.category)}
							<li class="text-sm">
								<div class="flex justify-between">
									<span class="capitalize">{row.category}</span>
									<span class="font-medium tabular-nums">{money(row.totalCents)}</span>
								</div>
								<div class="mt-1 h-2 rounded-full bg-muted" aria-hidden="true">
									<div
										class="h-2 rounded-full bg-primary"
										style:width="{Math.round((row.totalCents / data.spending.totalCents) * 100)}%"
									></div>
								</div>
							</li>
						{/each}
					</ul>
					<p class="mt-3 text-right text-sm font-semibold tabular-nums">
						Total {money(data.spending.totalCents)}
					</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- My time (private to this parent) -->
		<Card.Root>
			<Card.Header>
				<Card.Title>My time with {childName}</Card.Title>
				<Card.Description>Private · only you see this card</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3 text-sm">
				<p>
					<span class="text-2xl font-bold">{data.myTime.outings}</span>
					outing{data.myTime.outings === 1 ? '' : 's'} logged recently{#if data.myTime.avgRating !== null}
						· {childName}'s rating <strong>{data.myTime.avgRating}★</strong>{/if}
				</p>
				{#if data.myTime.topActivities.length}
					<p class="text-muted-foreground">Favourites: {data.myTime.topActivities.join(', ')}</p>
				{/if}
				{#if data.myTime.suggestion}
					<p class="rounded-lg bg-secondary p-3 text-secondary-foreground">
						💡 {data.myTime.suggestion}
					</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
