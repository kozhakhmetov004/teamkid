<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import ThreadList from '#lib/components/messages/ThreadList.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { subscribeToFamily } from '#lib/realtime.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let creating = $state(false);

	$effect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const off = subscribeToFamily('messages', data.parent.family_id, () => {
			clearTimeout(timer);
			timer = setTimeout(() => void invalidate('app:messages'), 300);
		});
		return () => {
			clearTimeout(timer);
			off();
		};
	});
</script>

<svelte:head><title>Messages · TeamKid</title></svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Messages</h1>
		<p class="text-sm text-muted-foreground">
			One conversation per topic. Messages can't be edited or deleted. They're kept as a record.
		</p>
	</div>

	{#if !data.hasCoParent}
		<Card.Root>
			<Card.Header>
				<Card.Title>Invite your co-parent first</Card.Title>
				<Card.Description>Messages are between the two parents of the family.</Card.Description>
			</Card.Header>
			<Card.Footer><Button href="/family">Invite on Family</Button></Card.Footer>
		</Card.Root>
	{/if}

	<ThreadList threads={data.threads} />

	<Card.Root>
		<Card.Header>
			<Card.Title>New topic</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				action="?/newThread"
				class="flex flex-col gap-2 sm:flex-row sm:items-end"
				use:enhance={() => {
					creating = true;
					return async ({ update }) => {
						await update();
						creating = false;
					};
				}}
			>
				<div class="flex-1 space-y-2">
					<Label for="topic">Topic</Label>
					<Input
						id="topic"
						name="topic"
						list="topic-suggestions"
						required
						maxlength={120}
						placeholder="e.g. School"
					/>
					<datalist id="topic-suggestions">
						{#each data.suggestedTopics as topic (topic)}<option value={topic}></option>{/each}
					</datalist>
				</div>
				<Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Start topic'}</Button>
			</form>
			{#if form && 'message' in form}
				<p role="alert" class="mt-2 text-sm text-destructive">
					{form.errors?.topic ?? form.message}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
