<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';

	/** "Set up schedule": template -> 12 weeks of custody nights (replaces future nights only). */
	let {
		defaults,
		homes,
		templates,
		onsaved
	}: {
		defaults: { template: string; startDate: string; exchangeTime: string; firstHome: string };
		homes: { home: string; name: string }[];
		templates: { value: string; label: string }[];
		/** Called after a successful save (e.g. to close the dialog). */
		onsaved?: () => void;
	} = $props();

	let pending = $state(false);
	let error = $state<string | null>(null);
	const selectClass =
		'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

<form
	method="POST"
	action="?/setupSchedule"
	class="grid gap-3 sm:grid-cols-2"
	use:enhance={({ cancel }) => {
		if (
			!confirm(
				'Replace the custody nights from the start date for the next 12 weeks? Past nights are kept.'
			)
		) {
			cancel();
			return;
		}
		pending = true;
		error = null;
		return async ({ result, update }) => {
			pending = false;
			if (result.type === 'success') {
				toast.success(String(result.data?.message ?? 'Schedule saved'));
				await update({ reset: false });
				onsaved?.();
			} else if (result.type === 'failure') {
				error = String(result.data?.message ?? 'Please check the form.');
			} else {
				await update();
			}
		};
	}}
>
	<div class="space-y-1">
		<Label for="sc-template">Template</Label>
		<select id="sc-template" name="template" class={selectClass} value={defaults.template}>
			{#each templates as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
		</select>
	</div>
	<div class="space-y-1">
		<Label for="sc-start">Start date</Label>
		<Input id="sc-start" name="startDate" type="date" required value={defaults.startDate} />
	</div>
	<div class="space-y-1">
		<Label for="sc-first">Who has the first night</Label>
		<select id="sc-first" name="firstHome" class={selectClass} value={defaults.firstHome}>
			{#each homes as h (h.home)}<option value={h.home}>{h.name}</option>{/each}
		</select>
	</div>
	<div class="space-y-1">
		<Label for="sc-time">Exchange time</Label>
		<Input id="sc-time" name="exchangeTime" type="time" required value={defaults.exchangeTime} />
	</div>
	{#if error}<p role="alert" class="text-sm text-destructive sm:col-span-2">{error}</p>{/if}
	<div class="sm:col-span-2">
		<Button type="submit" variant="outline" disabled={pending}>
			{pending ? 'Saving…' : 'Save schedule (next 12 weeks)'}
		</Button>
	</div>
</form>
