<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { navigating } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import { getSupabaseBrowserClient } from '#lib/supabase.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	onMount(() => {
		// Keep server data in sync when the session changes in this or another tab.
		const supabase = getSupabaseBrowserClient();
		const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
			if ((newSession?.expires_at ?? null) !== data.sessionExpiresAt) {
				void invalidate('supabase:auth');
			}
		});
		return () => sub.subscription.unsubscribe();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>TeamKid</title>
	<meta name="description" content="Two homes. One team. One kid." />
</svelte:head>

{#if navigating.to}
	<div
		class="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/20"
		role="progressbar"
		aria-label="Loading"
	>
		<div class="h-full w-1/3 animate-pulse bg-primary"></div>
	</div>
{/if}

{@render children()}
<Toaster richColors position="top-center" />
