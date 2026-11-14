<script lang="ts">
	import ComingSoon from '#lib/components/layout/ComingSoon.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
</script>

<Card.Root class="mb-6">
	<Card.Header>
		<Card.Title>Have a parenting plan?</Card.Title>
		<Card.Description>
			Upload the PDF, check what we found, and add the custody schedule to your calendar.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<Button href="/plan/import">Import your parenting plan</Button>
	</Card.Content>
</Card.Root>

<ComingSoon
	title="Plan my weekend"
	owner="Member 3 · AI + integrations"
	startFrom="shared wish_cards + ask() in #lib/server/ai/llm.ts"
/>
