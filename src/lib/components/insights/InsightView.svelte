<script lang="ts">
	/**
	 * "Lily's week" (pure display, no loading). Only what the child SHARED plus
	 * parent-noted interests (shown apart). Typed ideas appear only as their
	 * cleaned label with an "own idea" badge. Icons always come with words.
	 */
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { gentleText, isMoodTrend, TREND_DISPLAY } from '#lib/kids/insightRules.js';
	import type { InsightData, SharedWish } from './loadInsight.js';

	let {
		data,
		childName,
		showGentle = true
	}: { data: InsightData; childName: string; showGentle?: boolean } = $props();

	const insight = $derived(data.insight);
	const trend = $derived(
		insight && isMoodTrend(insight.mood_trend) ? TREND_DISPLAY[insight.mood_trend] : null
	);
	const notEnough = $derived(!insight || insight.mood_trend === 'not_enough');
	const gentle = $derived(insight?.gentle_flag ? gentleText(insight.mood_trend) : null);

	const into = $derived(
		data.sharedWishes.filter((w) => (w.kind === 'interest' && w.thisWeek) || w.kind === null)
	);
	const weekend = $derived(data.sharedWishes.filter((w) => w.kind === 'activity' && w.thisWeek));
	const gifts = $derived(data.sharedWishes.filter((w) => w.kind === 'gift' && w.thisWeek));
	const aboutMe = $derived(data.sharedWishes.filter((w) => w.kind === 'everyday' && w.thisWeek));
	const nothingShared = $derived(
		!into.length && !weekend.length && !gifts.length && !aboutMe.length
	);
</script>

{#snippet chip(w: SharedWish)}
	<li>
		<Badge variant="secondary" class="gap-1.5 px-2.5 py-1 text-sm">
			<span aria-hidden="true">{w.emoji ?? '⭐'}</span>{w.interest}
			{#if w.custom}
				<span class="rounded-full bg-background px-1.5 text-xs font-normal"
					>{childName}'s own idea ✏️</span
				>
			{/if}
		</Badge>
	</li>
{/snippet}

<div class="space-y-4">
	{#if insight?.ai_line}
		<p class="text-lg leading-snug font-medium">
			{insight.ai_line}
			<span class="ml-1 align-middle text-xs font-normal text-muted-foreground">✨ AI summary</span>
		</p>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		{#if trend && !notEnough}
			<Badge variant="outline" class="gap-1.5 px-2.5 py-1 text-sm">
				<span aria-hidden="true">{trend.icon}</span>{trend.label}
			</Badge>
		{:else}
			<span class="text-sm text-muted-foreground">
				No mood summary yet. It appears after a couple of check-ins with Pebble.
			</span>
		{/if}
	</div>

	{#if gentle && showGentle}
		<p
			class="rounded-lg border border-border bg-secondary/60 p-3 text-sm text-secondary-foreground"
		>
			<span aria-hidden="true">💬</span>
			{gentle}
		</p>
	{/if}

	<section aria-label="Into right now" class="space-y-2">
		<h3 class="text-sm font-semibold">Into right now</h3>
		{#if into.length || data.parentNoted.length}
			<ul class="flex flex-wrap gap-2">
				{#each into as w (w.id)}{@render chip(w)}{/each}
				{#each data.parentNoted as note (note)}
					<li>
						<Badge variant="outline" class="gap-1.5 border-dashed px-2.5 py-1 text-sm">
							{note}<span class="text-xs text-muted-foreground">noted by parents</span>
						</Badge>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-muted-foreground">Nothing shared yet.</p>
		{/if}
	</section>

	<section aria-label="Wants to do this weekend" class="space-y-2">
		<h3 class="text-sm font-semibold">Wants to do this weekend</h3>
		{#if weekend.length}
			<ul class="flex flex-wrap gap-2">
				{#each weekend as w (w.id)}{@render chip(w)}{/each}
			</ul>
		{:else}
			<p class="text-sm text-muted-foreground">Nothing shared yet.</p>
		{/if}
	</section>

	{#if gifts.length}
		<section aria-label="Present ideas" class="space-y-2">
			<h3 class="text-sm font-semibold">Present ideas</h3>
			<ul class="flex flex-wrap gap-2">
				{#each gifts as w (w.id)}{@render chip(w)}{/each}
			</ul>
		</section>
	{/if}

	{#if aboutMe.length}
		<section aria-label="Also shared this week" class="space-y-2">
			<h3 class="text-sm font-semibold">Also shared this week</h3>
			<ul class="flex flex-wrap gap-2">
				{#each aboutMe as w (w.id)}{@render chip(w)}{/each}
			</ul>
		</section>
	{/if}

	{#if nothingShared}
		<p class="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
			<span aria-hidden="true">🐢</span>
			{childName} hasn't shared any wish cards this week yet. That's okay: sharing is always {childName}'s
			choice.
		</p>
	{/if}
</div>
