<script lang="ts">
	/**
	 * Daily briefing. P1 passes the rule-based text from buildBriefing();
	 * Member 3 can pass an AI briefing instead (set source="ai").
	 */
	let { briefing, source = 'rules' }: { briefing: string; source?: 'rules' | 'ai' } = $props();
</script>

<section
	aria-label="Today's briefing"
	class="flex items-start gap-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm"
>
	<div
		class="flex size-12 shrink-0 items-center justify-center rounded-full bg-pebble text-2xl"
		aria-hidden="true"
	>
		🐢
	</div>
	<div class="space-y-1">
		<p class="text-sm font-medium opacity-90">
			Today's briefing{#if source === 'ai'}<span> · AI summary</span>{/if}
		</p>
		<p class="text-base leading-relaxed sm:text-lg">{briefing}</p>
	</div>
</section>
