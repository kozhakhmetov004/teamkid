<script lang="ts">
	let {
		greeting,
		name,
		date,
		custodyLine
	}: { greeting: string; name: string; date: string; custodyLine: string | null } = $props();
</script>

<header class="space-y-1">
	<h1 class="text-2xl font-bold sm:text-3xl">{greeting}, {name}</h1>
	<p class="text-muted-foreground">
		{date}{#if custodyLine}<span aria-hidden="true"> · </span><span class="text-foreground"
				>{custodyLine}</span
			>{/if}
	</p>
</header>
