<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let pending = $state<'magic' | 'password' | null>(null);
	let mode = $state<'magic' | 'password'>('magic');

	const failure = $derived(form && 'message' in form ? form : null);
	const sentTo = $derived(form && 'sentTo' in form ? form.sentTo : null);
</script>

<svelte:head><title>Parent login · TeamKid</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
	<a href="/" class="text-sm text-muted-foreground hover:underline">← Back</a>
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-2xl">Parent login</Card.Title>
			<Card.Description
				>New here? Enter your email and we'll send you a sign-in link.</Card.Description
			>
		</Card.Header>
		<Card.Content class="space-y-5">
			{#if data.error}
				<p role="alert" class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					That sign-in link didn't work or has expired. Please request a new one.
				</p>
			{/if}

			{#if sentTo}
				<div role="status" class="rounded-md bg-secondary p-4 text-secondary-foreground">
					<p class="font-medium">Check your email</p>
					<p class="text-sm">We sent a sign-in link to <strong>{sentTo}</strong>.</p>
				</div>
			{:else if mode === 'magic'}
				<form
					method="POST"
					action="?/magic"
					class="space-y-4"
					use:enhance={() => {
						pending = 'magic';
						return async ({ update }) => {
							await update();
							pending = null;
						};
					}}
				>
					<input type="hidden" name="next" value={data.next ?? ''} />
					<div class="space-y-2">
						<Label for="magic-email">Email</Label>
						<Input
							id="magic-email"
							name="email"
							type="email"
							autocomplete="email"
							required
							value={failure?.form === 'magic' ? (failure.values?.email ?? '') : ''}
							aria-invalid={failure?.form === 'magic' && !!failure.errors?.email}
						/>
						{#if failure?.form === 'magic'}
							<p class="text-sm text-destructive">{failure.errors?.email ?? failure.message}</p>
						{/if}
					</div>
					<Button type="submit" class="w-full" size="lg" disabled={pending !== null}>
						{pending === 'magic' ? 'Sending…' : 'Email me a sign-in link'}
					</Button>
				</form>
				<Button variant="link" class="w-full" onclick={() => (mode = 'password')}>
					Use a password instead (demo accounts)
				</Button>
			{:else}
				<form
					method="POST"
					action="?/password"
					class="space-y-4"
					use:enhance={() => {
						pending = 'password';
						return async ({ update }) => {
							await update({ reset: false });
							pending = null;
						};
					}}
				>
					<input type="hidden" name="next" value={data.next ?? ''} />
					<div class="space-y-2">
						<Label for="pw-email">Email</Label>
						<Input
							id="pw-email"
							name="email"
							type="email"
							autocomplete="email"
							required
							value={failure?.form === 'password' ? (failure.values?.email ?? '') : ''}
						/>
					</div>
					<div class="space-y-2">
						<Label for="pw-password">Password</Label>
						<Input
							id="pw-password"
							name="password"
							type="password"
							autocomplete="current-password"
							required
						/>
					</div>
					{#if failure?.form === 'password'}
						<p role="alert" class="text-sm text-destructive">{failure.message}</p>
					{/if}
					<Button type="submit" class="w-full" size="lg" disabled={pending !== null}>
						{pending === 'password' ? 'Signing in…' : 'Sign in'}
					</Button>
				</form>
				<Button variant="link" class="w-full" onclick={() => (mode = 'magic')}>
					Use an email link instead
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>
	<p class="text-center text-sm text-muted-foreground">
		Are you a kid? <a href="/kid-login" class="font-medium text-primary underline">Kid login</a>
	</p>
</main>
