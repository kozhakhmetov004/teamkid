<script lang="ts">
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import AddChildForm from '#lib/components/family/AddChildForm.svelte';
	import InviteForm from '#lib/components/family/InviteForm.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let consenting = $state<string | null>(null);

	const o = $derived(data.overview);
	const roleLabel: Record<string, string> = {
		parent: 'Parent',
		child: 'Child',
		bonus: 'Bonus family',
		professional: 'Professional'
	};
	const statusLabel: Record<string, string> = {
		pending_consent: 'Waiting for approval',
		active: 'Active',
		disabled: 'Paused'
	};
	const dateFmt = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	});
</script>

<svelte:head><title>Family · TeamKid</title></svelte:head>

<div class="space-y-6">
	<PageHeader title={o.family?.name ?? 'Family'} icon="🏡">
		{#snippet actions()}
			<p class="rounded-xl bg-card px-4 py-2 text-sm shadow-sm">
				Kid login code:
				<strong class="font-mono text-base">{o.family?.family_code}</strong>
			</p>
		{/snippet}
	</PageHeader>

	<!-- Children + consent -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Children</Card.Title>
			<Card.Description
				>A child's account turns on only when both parents approve it.</Card.Description
			>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#each o.children as child (child.id)}
				<div
					class="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<div>
						<p class="font-semibold">
							{child.first_name}
							<span class="font-normal text-muted-foreground">· born {child.birth_year}</span>
							<a href="/family/child" class="ml-2 text-sm font-normal text-primary hover:underline"
								>Edit profile</a
							>
						</p>
						<div class="mt-1 flex flex-wrap items-center gap-2 text-sm">
							<Badge variant={child.status === 'active' ? 'default' : 'outline'}
								>{statusLabel[child.status]}</Badge
							>
							<span class="text-muted-foreground">
								Approved by {child.consentedBy.length} of {Math.max(2, o.parents.length)} parents
							</span>
						</div>
						{#if child.status === 'pending_consent' && child.waitingForCoParent}
							<p class="mt-2 text-sm text-muted-foreground">
								Waiting for your co-parent to join. Invite them below; they'll approve {child.first_name}'s
								account after joining.
							</p>
						{/if}
					</div>
					{#if child.status === 'pending_consent' && !child.iConsented}
						<form
							method="POST"
							action="?/consent"
							use:enhance={() => {
								consenting = child.id;
								return async ({ result, update }) => {
									await update();
									consenting = null;
									if (result.type === 'success')
										toast.success(`You approved ${child.first_name}'s account`);
								};
							}}
						>
							<input type="hidden" name="childId" value={child.id} />
							<Button type="submit" disabled={consenting === child.id}>
								{consenting === child.id ? 'Approving…' : `Approve ${child.first_name}'s account`}
							</Button>
						</form>
					{:else if child.iConsented && child.status === 'pending_consent'}
						<Badge variant="secondary">You approved</Badge>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No children yet.</p>
			{/each}
			{#if form && 'form' in form && form.form === 'consent' && 'message' in form}
				<p role="alert" class="text-sm text-destructive">{form.message}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- Members -->
		<Card.Root>
			<Card.Header><Card.Title>Members</Card.Title></Card.Header>
			<Card.Content>
				<ul class="divide-y">
					{#each o.members as m (m.id)}
						<li class="flex items-center justify-between py-2 text-sm">
							<span>
								{m.display_name}
								{#if m.id === data.meMemberId}<span class="text-muted-foreground">(you)</span>{/if}
							</span>
							<span class="flex gap-2">
								{#if m.home}<Badge variant="outline">Home {m.home}</Badge>{/if}
								<Badge variant="secondary">{roleLabel[m.role]}</Badge>
							</span>
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>

		<!-- Invites -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Invite your co-parent</Card.Title>
				<Card.Description>They get a link to join this family.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<InviteForm {form} />
				{#if o.invites.length}
					<ul class="divide-y text-sm">
						{#each o.invites as invite (invite.id)}
							<li class="flex items-center justify-between gap-2 py-2">
								<span class="truncate">{invite.email}</span>
								<span class="flex shrink-0 items-center gap-2 text-muted-foreground">
									{dateFmt.format(new Date(invite.created_at))}
									<Badge variant={invite.status === 'accepted' ? 'default' : 'outline'}
										>{invite.status}</Badge
									>
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Add a child</Card.Title>
			<Card.Description
				>Ages 6–12. Your child logs in with the family code and their own PIN.</Card.Description
			>
		</Card.Header>
		<Card.Content><AddChildForm {form} /></Card.Content>
	</Card.Root>
</div>
