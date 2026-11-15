<script lang="ts">
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
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

<!-- Fills the viewport so the composer always sits at the bottom of the page. -->
<div
	class="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-3xl flex-col gap-4 lg:min-h-[calc(100dvh-4rem)]"
>
	<PageHeader
		title={data.thread.topic}
		icon="💬"
		description={data.otherName ? `With ${data.otherName}` : undefined}
		back={{ href: '/messages', label: 'All topics' }}
	/>

	<div class="flex-1">
		<ThreadView messages={data.messages} />
	</div>

	<div class="sticky bottom-4 mt-auto rounded-xl bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
		<Composer threadId={data.thread.id} />
	</div>
</div>
