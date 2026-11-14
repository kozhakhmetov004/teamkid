<script lang="ts">
	/**
	 * Child safety alerts for parents (identical for both). Renders nothing when
	 * there are no open alerts.
	 *
	 *   <SafetyAlerts familyId={…} childName="Lily" />
	 *
	 * Self-loading through the browser client (RLS: parents of the family) with
	 * its own Realtime channel `safety:${familyId}`. Shows the category only,
	 * never the child's words (there are none: the kid page uses preset choices).
	 */
	import { onMount } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { getSupabaseBrowserClient } from '#lib/supabase.js';
	import { parentAlertText } from '#lib/safety/help.js';

	let { familyId, childName }: { familyId: string; childName: string } = $props();

	type Alert = { id: string; level: string; category: string | null; created_at: string };
	let alerts = $state<Alert[]>([]);
	let busy = $state<string | null>(null);

	const timeFmt = new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit'
	});

	onMount(() => {
		const client = getSupabaseBrowserClient();
		let alive = true;
		async function refresh() {
			const { data } = await client
				.from('safety_alerts')
				.select('id, level, category, created_at')
				.eq('family_id', familyId)
				.is('resolved_at', null)
				.order('created_at', { ascending: false })
				.limit(5);
			if (alive) alerts = data ?? [];
		}
		void refresh();
		const channel = client
			.channel(`safety:${familyId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'safety_alerts',
					filter: `family_id=eq.${familyId}`
				},
				() => void refresh()
			)
			.subscribe();
		return () => {
			alive = false;
			void client.removeChannel(channel);
		};
	});

	async function resolve(id: string) {
		busy = id;
		try {
			const res = await fetch(`/api/safety/alerts/${id}/resolve`, { method: 'POST' });
			if (res.ok) alerts = alerts.filter((a) => a.id !== id);
		} finally {
			busy = null;
		}
	}
</script>

{#each alerts as a (a.id)}
	<section
		role="alert"
		class="space-y-3 rounded-2xl border-2 p-4 {a.level === 'crisis'
			? 'border-destructive bg-destructive/10'
			: 'border-amber-400 bg-amber-50 dark:bg-amber-950'}"
	>
		<p class="text-base font-semibold">
			{a.level === 'crisis' ? '🚨' : '💛'}
			{childName}
			{parentAlertText(a.category)}
			<span class="text-sm font-normal text-muted-foreground"
				>· {timeFmt.format(new Date(a.created_at))}</span
			>
		</p>
		<ul class="ms-5 list-disc space-y-1 text-sm">
			<li>Find {childName} now and talk calmly. Listen first, don't question hard.</li>
			{#if a.level === 'crisis'}
				<li>If anyone is in immediate danger, call <strong>911</strong>.</li>
				<li>
					For support any time, call or text <strong>988</strong> (Suicide & Crisis Lifeline).
				</li>
			{/if}
			<li>Your co-parent sees this same alert.</li>
		</ul>
		<Button size="sm" variant="outline" disabled={busy === a.id} onclick={() => resolve(a.id)}>
			{busy === a.id ? 'Saving…' : "I've checked in with " + childName}
		</Button>
	</section>
{/each}
