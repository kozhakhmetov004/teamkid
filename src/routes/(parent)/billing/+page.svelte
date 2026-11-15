<script lang="ts">
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import { invalidate } from '$app/navigation';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let busy = $state(false);
	let error = $state<string | null>(null);

	const FEATURES = [
		'Full AI assistant: tone check and message shield',
		'Parenting-plan PDF import',
		'"Plan my weekend" ideas from your child\'s wishes',
		"Weekly insights about your child's week"
	];

	// After Stripe redirects back, the webhook may take a few seconds: re-check.
	$effect(() => {
		if (data.checkout !== 'success' || data.active) return;
		let tries = 0;
		const timer = setInterval(() => {
			tries += 1;
			void invalidate('app:billing');
			if (tries >= 6) clearInterval(timer);
		}, 2500);
		return () => clearInterval(timer);
	});

	async function upgrade() {
		busy = true;
		error = null;
		try {
			const res = await fetch('/api/billing/checkout', { method: 'POST' });
			const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
			if (res.ok && body.url) {
				window.location.href = body.url;
				return;
			}
			error =
				body.error === 'already_subscribed'
					? 'You already have Family Plus.'
					: body.error === 'billing_not_configured'
						? 'Payments are not set up in this environment yet.'
						: 'Checkout is unavailable right now. Please try again.';
		} catch {
			error = 'Checkout is unavailable right now. Please try again.';
		} finally {
			busy = false;
		}
	}

	const renewLabel = $derived(
		data.renews
			? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(data.renews))
			: null
	);
</script>

<svelte:head><title>Billing · TeamKid</title></svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<PageHeader
		title="Billing"
		icon="⭐"
		description="Calendar, swaps and messages stay free. Family Plus adds the AI tools."
	/>

	<p
		class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
	>
		<strong>Test mode.</strong> No real money moves. Pay with card
		<code>4242 4242 4242 4242</code>, any future date and any CVC.
	</p>

	{#if data.checkout === 'success'}
		<p class="rounded-xl border bg-secondary p-3 text-sm" role="status">
			{data.active
				? 'Thank you! Family Plus is active.'
				: 'Payment received. Activating your plan…'}
		</p>
	{:else if data.checkout === 'cancelled'}
		<p class="rounded-xl border p-3 text-sm" role="status">
			Checkout was cancelled. Nothing was charged.
		</p>
	{/if}

	<Card.Root>
		<Card.Header>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<Card.Title class="text-xl">Family Plus</Card.Title>
				{#if data.active}
					<Badge>Active</Badge>
				{:else if data.status !== 'inactive'}
					<Badge variant="outline">{data.status.replace('_', ' ')}</Badge>
				{/if}
			</div>
			<Card.Description>
				<span class="text-2xl font-bold text-foreground">$11.99</span> / month · launch pricing
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<ul class="space-y-2 text-sm">
				{#each FEATURES as f (f)}
					<li class="flex gap-2"><span aria-hidden="true">✓</span>{f}</li>
				{/each}
			</ul>
		</Card.Content>
		<Card.Footer class="flex flex-col items-start gap-2">
			{#if data.active}
				<p class="text-sm">
					You're on Family Plus{renewLabel ? `, renews ${renewLabel}` : ''}.
				</p>
			{:else}
				<Button onclick={upgrade} disabled={busy || !data.configured}>
					{busy ? 'Opening checkout…' : 'Upgrade to Family Plus'}
				</Button>
				{#if !data.configured}
					<p class="text-sm text-muted-foreground">
						Payments are not set up here yet (add Stripe test keys).
					</p>
				{/if}
			{/if}
			{#if error}<p class="text-sm text-destructive" role="alert">{error}</p>{/if}
			<p class="text-xs text-muted-foreground">
				Hardship waivers available. Each parent manages their own plan.
			</p>
		</Card.Footer>
	</Card.Root>
</div>
