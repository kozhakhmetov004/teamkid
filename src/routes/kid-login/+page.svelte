<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let pending = $state(false);
</script>

<svelte:head><title>Kid login · TeamKid</title></svelte:head>

<main class="min-h-dvh bg-kid-background px-4 py-8">
	<div class="mx-auto flex max-w-sm flex-col gap-6">
		<a href="/" class="text-base text-muted-foreground">← Back</a>
		<header class="text-center">
			<div
				class="mx-auto flex size-28 items-center justify-center rounded-full bg-pebble text-6xl shadow-md"
				aria-hidden="true"
			>
				🐢
			</div>
			<h1 class="mt-4 text-3xl font-bold">Hi! Let's find Pebble</h1>
		</header>

		{#if data.reason === 'inactive'}
			<p role="status" class="rounded-2xl bg-kid-surface p-4 text-center text-lg">
				Almost there! Ask both grown-ups to say yes first.
			</p>
		{/if}

		<form
			method="POST"
			class="flex flex-col gap-5 rounded-3xl bg-kid-surface p-6 shadow-sm"
			use:enhance={() => {
				pending = true;
				return async ({ update }) => {
					await update();
					pending = false;
				};
			}}
		>
			<label class="flex flex-col gap-2 text-xl font-semibold">
				Family code
				<input
					name="familyCode"
					required
					autocomplete="off"
					autocapitalize="characters"
					spellcheck="false"
					placeholder="TURTLE-1234"
					value={form?.values?.familyCode ?? ''}
					class="h-16 rounded-2xl border-2 border-input bg-background px-4 text-center text-2xl tracking-widest uppercase focus-visible:border-primary focus-visible:outline-none"
				/>
			</label>
			<label class="flex flex-col gap-2 text-xl font-semibold">
				My PIN
				<input
					name="pin"
					type="password"
					required
					inputmode="numeric"
					pattern={'[0-9]{4,6}'}
					minlength="4"
					maxlength="6"
					autocomplete="off"
					placeholder="••••"
					class="h-16 rounded-2xl border-2 border-input bg-background px-4 text-center text-3xl tracking-[0.5em] focus-visible:border-primary focus-visible:outline-none"
				/>
			</label>

			{#if form?.message}
				<p
					role="alert"
					class="rounded-2xl bg-pebble/40 p-4 text-center text-lg text-pebble-foreground"
				>
					{form.message}
				</p>
			{/if}

			<button
				type="submit"
				disabled={pending}
				class="h-16 rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-sm transition active:scale-95 disabled:opacity-60"
			>
				{pending ? 'Finding Pebble…' : "Let's go!"}
			</button>
		</form>
	</div>
</main>
