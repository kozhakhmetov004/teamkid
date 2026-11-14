<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';

	let { idea }: { idea: { title: string; why: string } } = $props();
</script>

<Card.Root class="border-dashed">
	<Card.Header>
		<div class="text-xs">
			<span class="rounded-4xl border border-border bg-muted px-2 py-0.5 font-medium">At home</span>
		</div>
		<Card.Title class="text-lg">{idea.title}</Card.Title>
		<Card.Description>{idea.why}</Card.Description>
	</Card.Header>
</Card.Root>
