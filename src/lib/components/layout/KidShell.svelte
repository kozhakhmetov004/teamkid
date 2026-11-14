<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Big, friendly, minimal. No adult navigation. */
	let { children }: { children: Snippet } = $props();
</script>

<div class="flex min-h-dvh flex-col bg-kid-background text-lg">
	<main class="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
		{@render children()}
	</main>
	<footer class="mx-auto w-full max-w-md px-4 pb-6">
		<form method="POST" action="/logout" class="flex justify-center">
			<button
				type="submit"
				class="min-h-12 rounded-full bg-kid-surface px-6 text-base font-medium text-muted-foreground shadow-sm"
			>
				👋 Bye for now
			</button>
		</form>
	</footer>
</div>
