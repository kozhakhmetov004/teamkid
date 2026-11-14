<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { FamilyFormResult } from './types.js';

	let { form }: { form: FamilyFormResult | null | undefined } = $props();
	let pending = $state(false);

	const mine = $derived(form?.form === 'addChild' ? form : null);
	const err = (field: string) => mine?.errors?.[field];
</script>

<form
	method="POST"
	action="?/addChild"
	class="grid gap-4 sm:grid-cols-2"
	use:enhance={() => {
		pending = true;
		return async ({ result, update }) => {
			await update();
			pending = false;
			if (result.type === 'success')
				toast.success('Child added. Waiting for both parents to approve.');
		};
	}}
>
	<div class="space-y-2">
		<Label for="child-first-name">First name</Label>
		<Input
			id="child-first-name"
			name="firstName"
			required
			maxlength={40}
			value={mine?.values?.firstName ?? ''}
			aria-invalid={!!err('firstName')}
		/>
		{#if err('firstName')}<p class="text-sm text-destructive">{err('firstName')}</p>{/if}
	</div>
	<div class="space-y-2">
		<Label for="child-birth-year">Birth year</Label>
		<Input
			id="child-birth-year"
			name="birthYear"
			type="number"
			inputmode="numeric"
			required
			value={mine?.values?.birthYear ?? ''}
			aria-invalid={!!err('birthYear')}
		/>
		{#if err('birthYear')}<p class="text-sm text-destructive">{err('birthYear')}</p>{/if}
	</div>
	<div class="space-y-2">
		<Label for="child-pin">PIN (4–6 digits)</Label>
		<Input
			id="child-pin"
			name="pin"
			type="password"
			inputmode="numeric"
			pattern={'[0-9]{4,6}'}
			minlength={4}
			maxlength={6}
			required
			autocomplete="new-password"
			aria-invalid={!!err('pin')}
		/>
		{#if err('pin')}<p class="text-sm text-destructive">{err('pin')}</p>{/if}
	</div>
	<div class="space-y-2">
		<Label for="child-pin-confirm">Repeat PIN</Label>
		<Input
			id="child-pin-confirm"
			name="pinConfirm"
			type="password"
			inputmode="numeric"
			minlength={4}
			maxlength={6}
			required
			autocomplete="new-password"
			aria-invalid={!!err('pinConfirm')}
		/>
		{#if err('pinConfirm')}<p class="text-sm text-destructive">{err('pinConfirm')}</p>{/if}
	</div>
	{#if mine?.message && !Object.keys(mine.errors ?? {}).length}
		<p class="text-sm text-destructive sm:col-span-2" role="alert">{mine.message}</p>
	{/if}
	<p class="text-sm text-muted-foreground sm:col-span-2">
		The account stays off until <strong>both</strong> parents approve it. Your approval is added now.
	</p>
	<div class="sm:col-span-2">
		<Button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add child'}</Button>
	</div>
</form>
