<script lang="ts">
	/**
	 * Today's feeling, only when the child chose to tell both parents (shared_moods).
	 * Soft colours by tone, always with words; big feelings get a gentle idea,
	 * never an alarm. Identical for both parents.
	 */
	import type { MoodTone, MoodToday } from '#lib/kids/moodToday.js';

	let { childName, mood }: { childName: string; mood: MoodToday | null } = $props();

	const TONE_CLASS: Record<MoodTone, string> = {
		sunny: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
		calm: 'border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40',
		sleepy: 'border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40',
		heavy: 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40',
		stormy: 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40'
	};
	const ICON_RING: Record<MoodTone, string> = {
		sunny: 'bg-amber-100 dark:bg-amber-900/60',
		calm: 'bg-teal-100 dark:bg-teal-900/60',
		sleepy: 'bg-indigo-100 dark:bg-indigo-900/60',
		heavy: 'bg-sky-100 dark:bg-sky-900/60',
		stormy: 'bg-rose-100 dark:bg-rose-900/60'
	};
</script>

{#if mood}
	<section
		aria-label="{childName}'s feeling today"
		aria-live="polite"
		class="flex w-full items-start gap-4 rounded-2xl border p-4 shadow-xs {TONE_CLASS[mood.tone]}"
	>
		<span
			aria-hidden="true"
			class="grid size-14 shrink-0 place-items-center rounded-full text-3xl {ICON_RING[mood.tone]}"
			>{mood.icon}</span
		>
		<div class="min-w-0 space-y-1">
			<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{childName} shared today
			</p>
			<p class="text-lg leading-snug font-semibold">
				Feels {mood.feeling}{#if mood.energy}<span class="font-normal text-muted-foreground">
						· <span aria-hidden="true">{mood.energy.icon}</span>
						{mood.energy.label.toLowerCase()} energy</span
					>{/if}
			</p>
			{#if mood.hint}
				<p class="text-sm">{mood.hint}</p>
			{/if}
			<p class="text-xs text-muted-foreground">Shared at {mood.sharedAt}</p>
		</div>
	</section>
{:else}
	<p
		class="flex w-full items-center gap-3 rounded-2xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground"
	>
		<span aria-hidden="true" class="text-2xl">🐢</span>
		No feeling shared today. {childName} decides what to share.
	</p>
{/if}
