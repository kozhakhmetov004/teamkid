<script lang="ts">
	import { STATUS_LABEL, type Status } from './content.js';

	/** Visible label for anything not on main yet. Renders nothing for 'live'. */
	let { status, class: className = '' }: { status: Status; class?: string } = $props();
</script>

{#if status !== 'live'}
	<span
		class="inline-flex shrink-0 items-center gap-1 rounded-full border border-(--mk-peach-strong) bg-(--mk-peach) px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-(--mk-amber-text) {className}"
	>
		<span aria-hidden="true">{status === 'in-development' ? '🛠' : '⏳'}</span>
		{STATUS_LABEL[status]}
	</span>
{/if}
