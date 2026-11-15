<script lang="ts">
	/**
	 * Progress for step-by-step pages: pills that fill in, the current one wider,
	 * plus a text label ("Step 1 of 3"), so progress never relies on colour alone.
	 */
	let {
		total,
		current,
		done = [],
		label
	}: {
		total: number;
		/** 0-based index of the current step (may equal `total` when finished). */
		current: number;
		/** Indexes already completed (default: everything before `current`). */
		done?: number[];
		/** Visible text; default "Step x of y" / "All done!". */
		label?: string;
	} = $props();

	const isDone = (i: number) => (done.length ? done.includes(i) : i < current);
	const text = $derived(
		label ?? (current >= total ? 'All done!' : `Step ${current + 1} of ${total}`)
	);
</script>

<div class="flex flex-wrap items-center gap-3">
	<ol class="flex items-center gap-1.5" aria-hidden="true">
		{#each { length: total } as _, i (i)}
			<li
				class="h-3.5 rounded-full transition-all duration-300 {i === current
					? 'w-10 bg-[var(--a-edge)]'
					: isDone(i)
						? 'w-3.5 bg-[var(--a-solid)] ring-2 ring-[var(--a-edge)]/40'
						: 'w-3.5 bg-[var(--k-line)]'}"
			></li>
		{/each}
	</ol>
	<span class="text-lg font-extrabold text-muted-foreground">{text}</span>
</div>
