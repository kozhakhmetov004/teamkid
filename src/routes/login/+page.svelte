<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { PageProps } from './$types';

	/** Email + password only: no emails are sent (see +page.server.ts). */
	const PASSWORD_MIN = 8;

	let { data, form }: PageProps = $props();
	let pending = $state(false);

	const failure = $derived(form && 'message' in form ? form : null);
	// svelte-ignore state_referenced_locally
	let mode = $state<'signin' | 'register'>(data.startOn);
	$effect(() => {
		if (failure?.form === 'register') mode = 'register';
		else if (failure?.form === 'password') mode = 'signin';
	});
	const fromInvite = $derived(data.next?.startsWith('/invite/') ?? false);
	const email = $derived(failure?.values?.email ?? '');

	const submit = () => {
		pending = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			pending = false;
		};
	};
</script>

<svelte:head
	><title>{mode === 'register' ? 'Create account' : 'Parent login'} · TeamKid</title></svelte:head
>

<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
	<a href="/" class="text-sm text-muted-foreground hover:underline">← Back</a>
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-2xl">
				{mode === 'register' ? 'Create your parent account' : 'Parent login'}
			</Card.Title>
			<Card.Description>
				{#if fromInvite}
					Your co-parent invited you. Sign in, or create an account to join the family.
				{:else if mode === 'register'}
					Just an email and a password. You can set up your family right after.
				{:else}
					Welcome back. Sign in with your email and password.
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-5">
			<div
				role="tablist"
				aria-label="Sign in or create an account"
				class="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
			>
				<button
					type="button"
					role="tab"
					aria-selected={mode === 'signin'}
					class="rounded-md px-3 py-2 text-sm font-medium transition {mode === 'signin'
						? 'bg-background shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (mode = 'signin')}>Sign in</button
				>
				<button
					type="button"
					role="tab"
					aria-selected={mode === 'register'}
					class="rounded-md px-3 py-2 text-sm font-medium transition {mode === 'register'
						? 'bg-background shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (mode = 'register')}>Create account</button
				>
			</div>

			{#if data.error}
				<p role="alert" class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					That sign-in link didn't work or has expired. Please sign in with your password.
				</p>
			{/if}

			{#key mode}
				<form
					method="POST"
					action={mode === 'register' ? '?/register' : '?/password'}
					class="space-y-4"
					use:enhance={submit}
				>
					<input type="hidden" name="next" value={data.next ?? ''} />
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							value={email}
							aria-invalid={!!failure?.errors?.email}
						/>
						{#if failure?.errors?.email}
							<p class="text-sm text-destructive">{failure.errors.email}</p>
						{/if}
					</div>
					<div class="space-y-2">
						<Label for="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							autocomplete={mode === 'register' ? 'new-password' : 'current-password'}
							minlength={mode === 'register' ? PASSWORD_MIN : undefined}
							required
							aria-invalid={!!failure?.errors?.password}
							aria-describedby={mode === 'register' ? 'password-hint' : undefined}
						/>
						{#if failure?.errors?.password}
							<p class="text-sm text-destructive">{failure.errors.password}</p>
						{:else if mode === 'register'}
							<p id="password-hint" class="text-sm text-muted-foreground">
								At least {PASSWORD_MIN} characters.
							</p>
						{/if}
					</div>
					{#if failure && !failure.errors?.email && !failure.errors?.password}
						<p role="alert" class="text-sm text-destructive">{failure.message}</p>
					{/if}
					<Button type="submit" class="w-full" size="lg" disabled={pending}>
						{#if mode === 'register'}
							{pending ? 'Creating your account…' : 'Create account'}
						{:else}
							{pending ? 'Signing in…' : 'Sign in'}
						{/if}
					</Button>
				</form>
			{/key}
		</Card.Content>
	</Card.Root>
	<p class="text-center text-sm text-muted-foreground">
		Are you a kid? <a href="/kid-login" class="font-medium text-primary underline">Kid login</a>
	</p>
</main>
