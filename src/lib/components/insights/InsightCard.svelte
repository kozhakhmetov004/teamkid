<script lang="ts">
	/**
	 * Parents' weekly insight card (identical for both parents).
	 *
	 *   <InsightCard childId={child.id} childName={child.first_name} />
	 *
	 * Self-loading through the BROWSER Supabase client (RLS: parents only see the
	 * weekly insight and wishes the child shared). Live: its own Realtime channel
	 * `insight:${childId}` on weekly_insights + wish_cards → re-query (300 ms debounce).
	 * Never reads mood_checkins, pet_state or kid_chat_raw.
	 */
	import { onMount } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { getSupabaseBrowserClient } from '#lib/supabase.js';
	import InsightSkeleton from './InsightSkeleton.svelte';
	import InsightView from './InsightView.svelte';
	import { loadInsight, type InsightData } from './loadInsight.js';

	let {
		childId,
		childName,
		familyId
	}: {
		childId: string;
		childName: string;
		/** Optional: also narrows the queries to this family (RLS already does). */
		familyId?: string;
	} = $props();

	let data = $state<InsightData | null>(null);
	let failed = $state(false);
	let now = $state(Date.now());

	const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
	function relative(iso: string): string {
		const sec = Math.round((Date.parse(iso) - now) / 1000);
		const abs = Math.abs(sec);
		if (abs < 45) return 'just now';
		if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
		if (abs < 86_400) return rtf.format(Math.round(sec / 3600), 'hour');
		return rtf.format(Math.round(sec / 86_400), 'day');
	}

	onMount(() => {
		const client = getSupabaseBrowserClient();
		let timer: ReturnType<typeof setTimeout> | undefined;
		let alive = true;

		async function refresh() {
			try {
				const next = await loadInsight(client, childId, new Date(), familyId);
				if (alive) {
					data = next;
					failed = false;
				}
			} catch {
				if (alive) failed = true;
			}
		}
		const debounced = () => {
			clearTimeout(timer);
			timer = setTimeout(refresh, 300);
		};

		void refresh();
		const filter = `child_id=eq.${childId}`;
		const channel = client
			.channel(`insight:${childId}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'weekly_insights', filter },
				debounced
			)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'wish_cards', filter },
				debounced
			)
			.subscribe();
		const tickTimer = setInterval(() => (now = Date.now()), 60_000);

		return () => {
			alive = false;
			clearTimeout(timer);
			clearInterval(tickTimer);
			void client.removeChannel(channel);
		};
	});
</script>

<Card.Root class="h-full">
	<Card.Header>
		<Card.Title>{childName}'s week</Card.Title>
		<Card.Description>
			{#if data?.insight}
				Updated {relative(data.insight.created_at)}
			{:else}
				Weekly summary from Pebble
			{/if}
		</Card.Description>
	</Card.Header>
	<Card.Content aria-live="polite">
		{#if failed && !data}
			<p class="text-sm text-muted-foreground">The weekly summary couldn't load. Try refreshing.</p>
		{:else if !data}
			<InsightSkeleton />
		{:else}
			<InsightView {data} {childName} />
		{/if}
	</Card.Content>
	<Card.Footer class="flex flex-col items-start gap-3">
		<Button href="/plan" variant="outline">Plan something together</Button>
		<p class="text-xs text-muted-foreground">
			{childName} chose what to share. You and your co-parent see the same summary.
		</p>
	</Card.Footer>
</Card.Root>
