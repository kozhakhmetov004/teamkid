<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';

	/** Neutral "who owes whom" from approved, not-yet-reimbursed expenses. */
	let {
		text,
		items,
		compact = false
	}: { text: string; items: number; compact?: boolean } = $props();
</script>

<Card.Root class={compact ? 'h-full' : ''}>
	<Card.Header>
		<Card.Title>Balance</Card.Title>
		<Card.Description>From approved expenses that haven't been reimbursed yet</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-3">
		<p class="text-2xl font-bold">{text}</p>
		<p class="text-sm text-muted-foreground">
			{items === 0
				? 'Nothing outstanding.'
				: `${items} expense${items === 1 ? '' : 's'} behind this number.`}
		</p>
		{#if items > 0}
			<Button href="/expenses?status=approved" variant="outline" size="sm">See them</Button>
		{/if}
	</Card.Content>
</Card.Root>
