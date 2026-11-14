<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Label } from '#lib/components/ui/label/index.js';

	let {
		open = $bindable(false),
		draft,
		suggestion,
		notes = [],
		onSendCalm,
		onSendMine,
		onEdit
	}: {
		open?: boolean;
		draft: string;
		suggestion: string;
		notes?: string[];
		onSendCalm: (text: string) => void;
		onSendMine: () => void;
		onEdit: () => void;
	} = $props();

	let calm = $state('');
	$effect(() => {
		if (open) calm = suggestion;
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Want to send a calmer version?</Dialog.Title>
			<Dialog.Description>
				Messages can't be edited or deleted later. Only the version you send is kept.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="space-y-2">
				<p class="text-sm font-medium">Your message</p>
				<p
					class="max-h-56 overflow-y-auto rounded-lg border bg-muted p-3 text-sm whitespace-pre-wrap"
				>
					{draft}
				</p>
			</div>
			<div class="space-y-2">
				<Label for="calm-version">Calmer version (you can edit it)</Label>
				<textarea
					id="calm-version"
					bind:value={calm}
					rows="6"
					maxlength="4000"
					class="w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				></textarea>
			</div>
		</div>
		{#if notes.length}
			<ul class="list-inside list-disc text-sm text-muted-foreground">
				{#each notes as note (note)}<li>{note}</li>{/each}
			</ul>
		{/if}

		<Dialog.Footer class="flex-col gap-2 sm:flex-row sm:justify-end">
			<Button variant="ghost" onclick={onEdit}>Edit my message</Button>
			<Button variant="outline" onclick={onSendMine}>Send mine anyway</Button>
			<Button onclick={() => onSendCalm(calm.trim())} disabled={calm.trim() === ''}>
				Send calmer version
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
