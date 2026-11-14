<script lang="ts">
	import ParentShell from '#lib/components/layout/ParentShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<ParentShell familyName={data.parent.family_name} displayName={data.parent.display_name}>
	{@render children()}
</ParentShell>
