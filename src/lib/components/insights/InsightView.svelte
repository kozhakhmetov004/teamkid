<script lang="ts">
	/**
	 * Pure display of a weekly insight (no data loading). Text comes only from
	 * templates + theme words; the trend chip has an icon AND words.
	 */
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { gentleText, isMoodTrend, TREND_DISPLAY } from '#lib/kids/insightRules.js';
	import { themeLabel } from '#lib/kids/wishDeck.js';
	import type { InsightData } from './loadInsight.js';

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
	const themes = $derived(
		(insight?.interests ?? []).map((t) => themeLabel(t) ?? null).filter((t): t is string => !!t)
	);
	const gentle = $derived(insight?.gentle_flag ? gentleText(insight.mood_trend) : null);
</script>

<div class="space-y-4">
	{#if notEnough}
		<p class="text-muted-foreground">
			No check-ins yet this week. Pebble will share a summary once {childName} checks in.
		</p>
	{:else if insight}
		<p class="text-lg leading-snug font-medium">{insight.summary}</p>
	{/if}

	{#if (trend && !notEnough) || themes.length}
		<div class="flex flex-wrap gap-2">
			{#if trend && !notEnough}
				<Badge variant="outline" class="gap-1.5 px-2.5 py-1 text-sm">
					<span aria-hidden="true">{trend.icon}</span>{trend.label}
				</Badge>
			{/if}
			{#each themes as theme (theme)}
				<Badge variant="secondary" class="px-2.5 py-1 text-sm">Into {theme}</Badge>
			{/each}
		</div>
	{/if}

	{#if gentle && showGentle}
		<p
			class="rounded-lg border border-border bg-secondary/60 p-3 text-sm text-secondary-foreground"
		>
			<span aria-hidden="true">💬</span>
			{gentle}
		</p>
	{/if}

	{#if data.sharedWishes.length}
		<div>
			<p class="text-sm font-medium">{childName} chose to share:</p>
			<ul class="mt-1 space-y-1 text-sm">
				{#each data.sharedWishes as wish (wish.id)}
					<li class="flex flex-wrap items-center gap-2">
						<span aria-hidden="true">{wish.emoji ?? '⭐'}</span>{wish.interest}
						{#if wish.custom}
							<Badge variant="outline" class="text-xs">{childName}'s own idea ✏️</Badge>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
