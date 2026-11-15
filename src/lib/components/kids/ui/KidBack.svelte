<script lang="ts">
	/** Round "back home" button with a word next to it (never an arrow alone). */
	let { href = '/pebble', label = 'Home' }: { href?: string; label?: string } = $props();
</script>

<a
	{href}
	class="group inline-flex items-center gap-3 self-start rounded-full py-1 pr-4 text-xl font-extrabold text-muted-foreground transition-colors hover:text-foreground"
>
	<span
		class="grid size-12 place-items-center rounded-full border-2 border-[var(--k-line)] bg-[var(--kid-surface)] text-2xl text-foreground shadow-[0_3px_0_oklch(0.87_0.025_200)] transition-transform group-hover:-translate-x-0.5 group-active:translate-y-0.5"
		aria-hidden="true">←</span
	>
	{label}
</a>
