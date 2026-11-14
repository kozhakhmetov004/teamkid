<script lang="ts">
	/** "Read Mon 3:42 PM" once the other parent opened the thread, else "Sent". */
	let { readLabel }: { readLabel: string | null } = $props();
</script>

<span class="text-xs {readLabel ? 'font-medium' : ''}">
	{readLabel ? `Read ${readLabel}` : 'Sent'}
</span>
