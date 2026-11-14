<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { FamilyFormResult } from './types.js';

	let { form }: { form: FamilyFormResult | null | undefined } = $props();
	let pending = $state(false);

	const mine = $derived(form?.form === 'invite' ? form : null);

	async function copy(url: string) {
		try {
			await navigator.clipboard.writeText(url);
			toast.success('Invite link copied');
		} catch {
			toast.error('Could not copy. Select the link and copy it manually.');
		}
	}
</script>

<form
	method="POST"
	action="?/invite"
	class="space-y-3"
	use:enhance={() => {
		pending = true;
		return async ({ update }) => {
			await update();
			pending = false;
		};
	}}
>
	<div class="space-y-2">
		<Label for="invite-email">Co-parent's email</Label>
		<div class="flex flex-col gap-2 sm:flex-row">
			<Input
				id="invite-email"
				name="email"
				type="email"
				required
				autocomplete="off"
				value={mine?.values?.email ?? ''}
				aria-invalid={!!mine?.errors?.email}
			/>
			<Button type="submit" disabled={pending}
				>{pending ? 'Creating…' : 'Create invite link'}</Button
			>
		</div>
		{#if mine?.message}
			<p class="text-sm text-destructive" role="alert">{mine.errors?.email ?? mine.message}</p>
		{/if}
	</div>
</form>

{#if mine?.inviteUrl}
	<div class="mt-3 space-y-2 rounded-lg bg-secondary p-3" role="status">
		<p class="text-sm font-medium text-secondary-foreground">
			Send this link to your co-parent (valid for 7 days):
		</p>
		<div class="flex flex-col gap-2 sm:flex-row">
			<Input
				readonly
				value={mine.inviteUrl}
				aria-label="Invite link"
				onfocus={(e) => e.currentTarget.select()}
			/>
			<Button variant="outline" type="button" onclick={() => copy(mine.inviteUrl!)}>Copy</Button>
		</div>
	</div>
{/if}
