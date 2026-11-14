<script lang="ts">
	/**
	 * "Shield" for a message from the co-parent: shows just the facts and the
	 * requests (POST /api/ai/shield). Read-only: the original message stays
	 * as it is, and nothing is saved.
	 */
	let { messageId }: { messageId: string } = $props();

	type Result = {
		tone: 'calm' | 'tense' | 'hostile';
		facts: string[];
		requests: string[];
		ai: boolean;
	};

	let open = $state(false);
	let loading = $state(false);
	let result = $state<Result | null>(null);
	let error = $state<string | null>(null);

	const TONE: Record<Result['tone'], string> = {
		calm: 'Calm message',
		tense: 'A bit tense',
		hostile: 'Heated message: here is what matters'
	};

	async function toggle() {
		open = !open;
		if (!open || result || loading) return;
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/ai/shield', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ messageId })
			});
			if (!res.ok) {
				error =
					res.status === 429
						? 'Too many in a minute. Try again shortly.'
						: 'Shield is unavailable.';
				return;
			}
			result = (await res.json()) as Result;
		} catch {
			error = 'Shield is unavailable.';
		} finally {
			loading = false;
		}
	}
</script>

<button
	type="button"
	class="rounded-full border px-2 py-0.5 hover:bg-accent"
	aria-expanded={open}
	onclick={toggle}
>
	🛡️ {open ? 'Hide shield' : 'Shield'}
</button>

{#if open}
	<div
		class="mt-1 w-full basis-full space-y-2 rounded-xl border bg-secondary/50 p-3 text-sm text-foreground"
		aria-live="polite"
	>
		{#if loading}
			<p class="text-muted-foreground">Reading the message calmly…</p>
		{:else if error}
			<p class="text-muted-foreground">{error}</p>
		{:else if result}
			<p class="text-xs font-medium text-muted-foreground">{TONE[result.tone]}</p>
			{#if result.requests.length}
				<div>
					<p class="font-semibold">They're asking you to</p>
					<ul class="ms-5 list-disc">
						{#each result.requests as r (r)}<li>{r}</li>{/each}
					</ul>
				</div>
			{/if}
			{#if result.facts.length}
				<div>
					<p class="font-semibold">Facts</p>
					<ul class="ms-5 list-disc">
						{#each result.facts as f (f)}<li>{f}</li>{/each}
					</ul>
				</div>
			{/if}
			{#if !result.requests.length && !result.facts.length}
				<p>Nothing here needs an answer. You can take your time or skip it.</p>
			{/if}
			<p class="text-xs text-muted-foreground">
				{result.ai ? 'AI summary' : 'Quick summary'} · the original message is unchanged.
			</p>
		{/if}
	</div>
{/if}
