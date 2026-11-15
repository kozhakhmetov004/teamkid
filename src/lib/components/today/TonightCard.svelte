<script lang="ts">
	/**
	 * Hero card: where the child sleeps tonight (from today's week-strip day),
	 * the custody line, and the daily briefing (rule-based, or AI when
	 * source="ai"). Replaces the separate BriefingCard on the dashboard.
	 */
	let {
		childName,
		mine,
		withName,
		custodyLine,
		briefing,
		source = 'rules'
	}: {
		childName: string;
		/** true = with you tonight, false = with the other parent, null = not set */
		mine: boolean | null;
		withName: string | null;
		custodyLine: string | null;
		briefing: string;
		source?: 'rules' | 'ai';
	} = $props();

	const headline = $derived(
		mine === true
			? `${childName} is with you`
			: mine === false
				? `${childName} is with ${withName ?? 'your co-parent'}`
				: 'Tonight isn’t set yet'
	);
</script>

<section
	aria-label="Tonight"
	class="flex min-w-0 flex-col gap-4 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.42_0.08_185)] p-5 text-primary-foreground shadow-sm sm:p-6"
>
	<div class="flex items-start gap-4">
		<span
			class="grid size-12 shrink-0 place-items-center rounded-2xl bg-pebble text-2xl text-pebble-foreground"
			aria-hidden="true">{mine === null ? '🐢' : '🌙'}</span
		>
		<div class="min-w-0 space-y-1">
			<p class="text-xs font-medium tracking-wide uppercase opacity-90">Tonight</p>
			<p class="text-2xl leading-tight font-bold sm:text-3xl">{headline}</p>
			{#if custodyLine}<p class="text-sm opacity-90">{custodyLine}</p>{/if}
			{#if mine === null}
				<a
					href="/calendar"
					class="inline-block rounded-md text-sm font-medium underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-primary-foreground/60 focus-visible:outline-none"
					>Set up the custody schedule</a
				>
			{/if}
		</div>
	</div>
	<div class="rounded-xl bg-black/10 p-4">
		<p class="mb-1 text-xs font-medium opacity-90">
			Today's briefing{#if source === 'ai'}<span> · AI summary</span>{/if}
		</p>
		<p class="text-sm leading-relaxed sm:text-base">{briefing}</p>
	</div>
</section>
