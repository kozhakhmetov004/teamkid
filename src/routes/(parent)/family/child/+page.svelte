<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { ageOn } from '#lib/kids/profile.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let saving = $state(false);

	const today = new Date().toISOString().slice(0, 10);
	const name = $derived(data.child?.first_name ?? 'your child');
	const errors = $derived(
		form && 'errors' in form
			? (form.errors as Record<string, string>)
			: ({} as Record<string, string>)
	);
	const age = $derived(
		data.child ? ageOn(today, data.profile?.birthday ?? null, data.child.birth_year) : null
	);
	const updated = $derived(
		data.profile?.updated_at
			? new Intl.DateTimeFormat('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				}).format(new Date(data.profile.updated_at))
			: null
	);
	const textarea =
		'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

<svelte:head><title>{name}'s profile · TeamKid</title></svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a href="/family" class="text-sm text-muted-foreground hover:underline">← Family</a>
		<h1 class="text-2xl font-bold">{name}'s profile</h1>
		<p class="text-muted-foreground">
			Shared by both parents. Birthday and interests help Pebble pick {name}'s weekly wish cards.
		</p>
	</div>

	{#if !data.child}
		<Card.Root>
			<Card.Header><Card.Title>Add your child first</Card.Title></Card.Header>
			<Card.Footer><Button href="/family">Go to Family</Button></Card.Footer>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>About {name}</Card.Title>
				<Card.Description>
					{#if updated}Updated by {data.updatedBy ?? 'a parent'} · {updated}{:else}Not filled in yet{/if}
				</Card.Description>
			</Card.Header>
			<form
				method="POST"
				action="?/save"
				use:enhance={() => {
					saving = true;
					return async ({ result, update }) => {
						await update({ reset: false });
						saving = false;
						if (result.type === 'success') toast.success('Profile saved');
					};
				}}
			>
				<Card.Content class="space-y-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-1">
							<Label for="firstName">Name</Label>
							<Input
								id="firstName"
								name="firstName"
								value={data.child.first_name}
								maxlength={40}
								required
							/>
							{#if errors.firstName}<p class="text-xs text-destructive">{errors.firstName}</p>{/if}
						</div>
						<div class="space-y-1">
							<Label for="birthday">Birthday</Label>
							<Input
								id="birthday"
								name="birthday"
								type="date"
								value={data.profile?.birthday ?? ''}
								max={today}
							/>
							{#if errors.birthday}<p class="text-xs text-destructive">{errors.birthday}</p>{/if}
						</div>
						<div class="space-y-1">
							<Label for="grade">Grade</Label>
							<Input
								id="grade"
								name="grade"
								value={data.profile?.grade ?? ''}
								maxlength={30}
								placeholder="e.g. 2nd grade"
							/>
						</div>
						<div class="space-y-1">
							<p class="text-sm font-medium">Age</p>
							<p class="pt-2 text-sm text-muted-foreground">
								{age !== null ? `${age} years old` : '—'}
							</p>
						</div>
					</div>

					<div class="space-y-1">
						<Label for="interests">Interests you've noticed</Label>
						<textarea
							id="interests"
							name="interests"
							rows="2"
							class={textarea}
							placeholder="Horses, drawing, Lego"
							>{(data.profile?.interests ?? []).join(', ')}</textarea
						>
						<p class="text-xs text-muted-foreground">
							Separate with commas. Shown as "noted by parents", apart from {name}'s own choices.
						</p>
					</div>
					<div class="space-y-1">
						<Label for="dislikes">Dislikes</Label>
						<textarea
							id="dislikes"
							name="dislikes"
							rows="2"
							class={textarea}
							placeholder="Loud places, spicy food"
							>{(data.profile?.dislikes ?? []).join(', ')}</textarea
						>
					</div>
					<div class="space-y-1">
						<Label for="notes">Important notes</Label>
						<textarea
							id="notes"
							name="notes"
							rows="3"
							maxlength="600"
							class={textarea}
							placeholder="Allergies, bedtime, medicines">{data.profile?.notes ?? ''}</textarea
						>
						<p class="text-xs text-muted-foreground">
							Only parents see these. They are never sent to the AI.
						</p>
						{#if errors.notes}<p class="text-xs text-destructive">{errors.notes}</p>{/if}
					</div>
					{#if form && 'message' in form && form.form === 'profile' && !('ok' in form)}
						<p role="alert" class="text-sm text-destructive">{form.message}</p>
					{/if}
				</Card.Content>
				<Card.Footer>
					<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
				</Card.Footer>
			</form>
		</Card.Root>
	{/if}
</div>
