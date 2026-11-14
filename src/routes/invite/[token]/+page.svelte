<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let pending = $state(false);

	const loginHref = $derived(`/login?next=${encodeURIComponent(page.url.pathname)}`);
	const wrongEmail = $derived(
		!!data.invite &&
			!!data.email &&
			data.email.toLowerCase() !== data.invite.invited_email.toLowerCase()
	);
</script>

<svelte:head><title>Join your family · TeamKid</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
	<Card.Root>
		{#if !data.invite}
			<Card.Header>
				<Card.Title>Invite not found</Card.Title>
				<Card.Description>Ask your co-parent to create a new invite link.</Card.Description>
			</Card.Header>
		{:else if data.invite.accepted}
			<Card.Header>
				<Card.Title>This invite was already used</Card.Title>
				<Card.Description>Sign in to see your family.</Card.Description>
			</Card.Header>
			<Card.Footer><Button href="/login">Sign in</Button></Card.Footer>
		{:else if data.invite.expired}
			<Card.Header>
				<Card.Title>This invite has expired</Card.Title>
				<Card.Description
					>Ask {data.invite.inviter_name ?? 'your co-parent'} for a new link.</Card.Description
				>
			</Card.Header>
		{:else}
			<Card.Header>
				<Card.Title class="text-2xl">Join {data.invite.family_name}</Card.Title>
				<Card.Description>
					{data.invite.inviter_name ?? 'Your co-parent'} invited
					<strong>{data.invite.invited_email}</strong> to TeamKid.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if !data.signedIn}
					<p>
						First sign in (or create your account) with <strong>{data.invite.invited_email}</strong
						>. You'll come right back here.
					</p>
					<Button href={loginHref} class="w-full" size="lg">Sign in to accept</Button>
				{:else if data.alreadyMember}
					<p>You already belong to a family on TeamKid.</p>
					<Button href="/dashboard">Go to dashboard</Button>
				{:else if wrongEmail}
					<p role="alert" class="text-destructive">
						You're signed in as {data.email}, but this invite is for {data.invite.invited_email}.
					</p>
					<form method="POST" action="/logout">
						<Button type="submit" variant="outline">Sign out and switch account</Button>
					</form>
				{:else}
					<form
						method="POST"
						class="space-y-4"
						use:enhance={() => {
							pending = true;
							return async ({ update }) => {
								await update();
								pending = false;
							};
						}}
					>
						<div class="space-y-2">
							<Label for="display-name">Your name (as your co-parent sees it)</Label>
							<Input
								id="display-name"
								name="displayName"
								required
								maxlength={60}
								placeholder="e.g. Dad"
								value={form?.values?.displayName ?? ''}
							/>
						</div>
						{#if form?.message}<p role="alert" class="text-sm text-destructive">
								{form.errors?.displayName ?? form.message}
							</p>{/if}
						<Button type="submit" class="w-full" size="lg" disabled={pending}
							>{pending ? 'Joining…' : 'Accept invite'}</Button
						>
					</form>
				{/if}
			</Card.Content>
		{/if}
	</Card.Root>
</main>
