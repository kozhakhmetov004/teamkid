<script lang="ts">
	import { enhance } from '$app/forms';
	import AddChildForm from '#lib/components/family/AddChildForm.svelte';
	import InviteForm from '#lib/components/family/InviteForm.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let pending = $state(false);

	const createFailure = $derived(
		form && 'form' in form && form.form === 'createFamily' ? form : null
	);
	const hasCoParent = $derived((data.overview?.parents.length ?? 0) >= 2);
	const hasInvite = $derived((data.overview?.invites.length ?? 0) > 0);
	const hasChild = $derived((data.overview?.children.length ?? 0) > 0);
</script>

<svelte:head><title>Set up your family · TeamKid</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10">
	<header class="space-y-1">
		<p class="text-sm text-muted-foreground">Signed in as {data.email}</p>
		<h1 class="text-3xl font-bold">Set up your family</h1>
	</header>

	<!-- Step 1: family -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				1. Create your family
				{#if data.member}<Badge variant="secondary">Done</Badge>{/if}
			</Card.Title>
			{#if data.overview?.family}
				<Card.Description>
					{data.overview.family.name} · kid login code
					<strong class="font-mono">{data.overview.family.family_code}</strong>
				</Card.Description>
			{/if}
		</Card.Header>
		{#if !data.member}
			<Card.Content>
				<form
					method="POST"
					action="?/createFamily"
					class="grid gap-4 sm:grid-cols-2"
					use:enhance={() => {
						pending = true;
						return async ({ update }) => {
							await update();
							pending = false;
						};
					}}
				>
					<div class="space-y-2">
						<Label for="family-name">Family name</Label>
						<Input
							id="family-name"
							name="familyName"
							required
							maxlength={80}
							placeholder="e.g. Carter family"
							value={createFailure?.values?.familyName ?? ''}
						/>
						{#if createFailure?.errors?.familyName}<p class="text-sm text-destructive">
								{createFailure.errors.familyName}
							</p>{/if}
					</div>
					<div class="space-y-2">
						<Label for="display-name">Your name (as your co-parent sees it)</Label>
						<Input
							id="display-name"
							name="displayName"
							required
							maxlength={60}
							placeholder="e.g. Mom"
							value={createFailure?.values?.displayName ?? ''}
						/>
						{#if createFailure?.errors?.displayName}<p class="text-sm text-destructive">
								{createFailure.errors.displayName}
							</p>{/if}
					</div>
					{#if createFailure && !Object.keys(createFailure.errors ?? {}).length}
						<p class="text-sm text-destructive sm:col-span-2" role="alert">
							{createFailure.message}
						</p>
					{/if}
					<div class="sm:col-span-2">
						<Button type="submit" disabled={pending}
							>{pending ? 'Creating…' : 'Create family'}</Button
						>
					</div>
				</form>
			</Card.Content>
		{/if}
	</Card.Root>

	{#if data.member}
		<!-- Step 2: co-parent -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					2. Invite your co-parent
					{#if hasCoParent}<Badge variant="secondary">Joined</Badge>{:else if hasInvite}<Badge
							variant="outline">Invited</Badge
						>{/if}
				</Card.Title>
				<Card.Description
					>Both parents see the same calendar, messages, expenses and insights.</Card.Description
				>
			</Card.Header>
			{#if !hasCoParent}
				<Card.Content><InviteForm {form} /></Card.Content>
			{/if}
		</Card.Root>

		<!-- Step 3: child -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					3. Add your child
					{#if hasChild}<Badge variant="secondary">Added</Badge>{/if}
				</Card.Title>
				<Card.Description
					>Your child logs in with the family code and their own PIN. No email needed.</Card.Description
				>
			</Card.Header>
			<Card.Content><AddChildForm {form} /></Card.Content>
		</Card.Root>

		<div class="flex justify-end">
			<Button href="/dashboard" size="lg">Go to dashboard →</Button>
		</div>
	{/if}

	<form method="POST" action="/logout">
		<Button variant="link" type="submit" class="px-0">Sign out</Button>
	</form>
</main>
