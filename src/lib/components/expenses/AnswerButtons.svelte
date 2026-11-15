<script lang="ts">
	/**
	 * Small row of answer buttons posting { id, action[, note] } to a form action.
	 * An option with `note: true` opens a short note field first (e.g. "Decline").
	 */
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { withToast } from './submit.js';

	type Option = {
		action: string;
		label: string;
		variant?: 'default' | 'outline' | 'ghost' | 'destructive';
		note?: boolean;
		done: string;
	};
	let { formAction, id, options }: { formAction: string; id: string; options: Option[] } = $props();

	let noteFor = $state<Option | null>(null);
	let busy = $state(false);
</script>

{#if noteFor}
	<form
		method="POST"
		action={formAction}
		class="flex w-full flex-wrap items-center gap-2"
		use:enhance={withToast(noteFor.done, {
			busy: (b) => (busy = b),
			onSuccess: () => (noteFor = null)
		})}
	>
		<input type="hidden" name="id" value={id} />
		<input type="hidden" name="action" value={noteFor.action} />
		<Input
			name="note"
			required
			minlength={5}
			maxlength={280}
			class="h-8 min-w-48 flex-1"
			placeholder="A short, calm reason (5+ characters)"
			aria-label="Note"
		/>
		<Button type="submit" size="sm" variant={noteFor.variant ?? 'outline'} disabled={busy}
			>{noteFor.label}</Button
		>
		<Button type="button" size="sm" variant="ghost" onclick={() => (noteFor = null)}>Back</Button>
	</form>
{:else}
	<div class="flex flex-wrap gap-2">
		{#each options as o (o.action)}
			{#if o.note}
				<Button size="sm" variant={o.variant ?? 'outline'} onclick={() => (noteFor = o)}
					>{o.label}</Button
				>
			{:else}
				<form
					method="POST"
					action={formAction}
					use:enhance={withToast(o.done, { busy: (b) => (busy = b) })}
				>
					<input type="hidden" name="id" value={id} />
					<input type="hidden" name="action" value={o.action} />
					<Button type="submit" size="sm" variant={o.variant ?? 'default'} disabled={busy}
						>{o.label}</Button
					>
				</form>
			{/if}
		{/each}
	</div>
{/if}
