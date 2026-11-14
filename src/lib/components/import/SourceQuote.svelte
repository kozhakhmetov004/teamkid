<script lang="ts">
	/** The sentence a field came from, so the parent can check it against the plan. */
	let { quote }: { quote: { text: string; page: number } | null } = $props();
</script>

{#if quote}
	<blockquote class="border-l-2 border-border pl-2 text-xs text-muted-foreground">
		“{quote.text}” <span class="whitespace-nowrap">(page {quote.page})</span>
	</blockquote>
{/if}
