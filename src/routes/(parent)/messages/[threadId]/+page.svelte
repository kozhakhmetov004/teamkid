<script lang="ts">
	import { invalidate } from '$app/navigation';
	import Composer from '#lib/components/messages/Composer.svelte';
	import ThreadView from '#lib/components/messages/ThreadView.svelte';
	import { subscribeToFamily } from '#lib/realtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Live: reload when a message in this thread is added or marked read.
	$effect(() => {
		const threadId = data.thread.id;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const off = subscribeToFamily('messages', data.parent.family_id, (change) => {
			const row = (change.new ?? change.old) as { thread_id?: string } | null;
			if (row?.thread_id !== threadId) return;
			clearTimeout(timer);
			timer = setTimeout(() => void invalidate('app:thread'), 200);
		});
		return () => {
			clearTimeout(timer);
			off();
		};
	});

	// Read receipts: mark the other parent's unread messages as read.
	let marking = false;
	$effect(() => {
		const threadId = data.thread.id;
		if (data.unreadIncoming === 0 || marking) return;
		marking = true;
		void fetch(`/messages/${threadId}/read`, { method: 'POST' }).finally(() => {
			marking = false;
		});
	});
</script>

<svelte:head><title>{data.thread.topic} · Messages · TeamKid</title></svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-4">
	<div class="flex items-center justify-between gap-2">
		<div>
			<a href="/messages" class="text-sm text-muted-foreground hover:underline">← All topics</a>
			<h1 class="text-2xl font-bold">{data.thread.topic}</h1>
			{#if data.otherName}<p class="text-sm text-muted-foreground">With {data.otherName}</p>{/if}
		</div>
	</div>

	<ThreadView messages={data.messages} />

	<div class="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur">
		<Composer threadId={data.thread.id} />
	</div>
</div>
