<script lang="ts">
	import KidShell from '#lib/components/layout/KidShell.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<KidShell>
	{@render children()}
</KidShell>
