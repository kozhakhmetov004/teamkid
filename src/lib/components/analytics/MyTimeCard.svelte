<script lang="ts">
	/**
	 * Private "My time with <child>" card (only the signed-in parent sees it).
	 *
	 *   <MyTimeCard childId={child.id} childName={child.first_name} />
	 *
	 * Self-loading from GET /api/analytics/my-time (own outings only, via RLS)
	 * plus one AI idea built from the child's SHARED wishes. Logging an outing
	 * posts to the same endpoint. No comparisons with the other parent, ever.
	 */
	import { onMount } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';

	let { childId, childName }: { childId: string; childName: string } = $props();

	interface MyTime {
		count: number;
		avgRating: number | null;
		favorites: string[];
		recent: { title: string; child_rating: number | null; happened_on: string }[];
		suggestion: string;
		days: number;
	}

	let data = $state<MyTime | null>(null);
	let failed = $state(false);
	let adding = $state(false);
	let saving = $state(false);
	let formError = $state<string | null>(null);
	let title = $state('');
	let rating = $state<number | null>(null);
	const todayIso = () => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	};
	let happenedOn = $state(todayIso());

	async function refresh() {
		try {
			const res = await fetch(`/api/analytics/my-time?childId=${encodeURIComponent(childId)}`);
			if (!res.ok) throw new Error(String(res.status));
			data = (await res.json()) as MyTime;
			failed = false;
		} catch {
			failed = true;
		}
	}

	onMount(() => {
		void refresh();
	});

	async function save(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		if (!title.trim()) {
			formError = 'Add a short title, like “Park after school”.';
			return;
		}
		saving = true;
		try {
			const res = await fetch('/api/analytics/my-time', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ childId, title: title.trim(), happenedOn, rating })
			});
			if (!res.ok) {
				formError =
					res.status === 429
						? 'That’s a lot of outings for one hour. Try again later.'
						: 'Couldn’t save that. Check the date and try again.';
				return;
			}
			title = '';
			rating = null;
			happenedOn = todayIso();
			adding = false;
			await refresh();
		} finally {
			saving = false;
		}
	}

	const dateFmt = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	});
	const fmtDate = (iso: string) => dateFmt.format(new Date(`${iso}T12:00:00Z`));
</script>

<Card.Root class="h-full">
	<Card.Header>
		<Card.Title>My time with {childName}</Card.Title>
		<Card.Description>Private · only you see this card</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-3 text-sm" aria-live="polite">
		{#if failed && !data}
			<p class="text-muted-foreground">This card couldn't load. Try refreshing.</p>
		{:else if !data}
			<div class="space-y-2" aria-hidden="true">
				<div class="h-6 w-1/2 animate-pulse rounded bg-muted"></div>
				<div class="h-14 animate-pulse rounded bg-muted"></div>
			</div>
			<span class="sr-only">Loading</span>
		{:else}
			<p>
				<span class="text-xl font-bold">{data.count}</span>
				outing{data.count === 1 ? '' : 's'} in the last {data.days} days
				{#if data.avgRating !== null}
					<span class="ms-1">· {childName}'s rating <strong>{data.avgRating}★</strong></span>
				{/if}
			</p>
			{#if data.favorites.length}
				<p class="text-muted-foreground">
					Favourites: {data.favorites.join(', ')}
				</p>
			{/if}
			<p class="rounded-lg bg-secondary p-3 text-secondary-foreground">
				<span aria-hidden="true">💡</span>
				{data.suggestion}
			</p>
			{#if data.recent.length}
				<ul class="space-y-1">
					{#each data.recent.slice(0, 3) as o (o.title + o.happened_on)}
						<li class="flex justify-between gap-2">
							<span class="truncate">{o.title}</span>
							<span class="shrink-0 text-muted-foreground"
								>{fmtDate(o.happened_on)}{#if o.child_rating}
									· {'★'.repeat(o.child_rating)}{/if}</span
							>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}

		{#if adding}
			<form class="space-y-3 rounded-lg border p-3" onsubmit={save}>
				<div class="space-y-1">
					<Label for="outing-title">What did you do?</Label>
					<Input id="outing-title" maxlength={80} bind:value={title} placeholder="Zoo morning" />
				</div>
				<div class="space-y-1">
					<Label for="outing-date">When</Label>
					<Input id="outing-date" type="date" max={todayIso()} bind:value={happenedOn} />
				</div>
				<fieldset class="space-y-1">
					<legend class="text-sm font-medium">{childName}'s stars (optional)</legend>
					<div class="flex gap-1">
						{#each [1, 2, 3, 4, 5] as n (n)}
							<button
								type="button"
								class="size-9 rounded-md border text-lg {rating !== null && n <= rating
									? 'bg-primary text-primary-foreground'
									: ''}"
								aria-pressed={rating === n}
								aria-label="{n} star{n === 1 ? '' : 's'}"
								onclick={() => (rating = rating === n ? null : n)}>★</button
							>
						{/each}
					</div>
				</fieldset>
				{#if formError}<p class="text-destructive" role="alert">{formError}</p>{/if}
				<div class="flex gap-2">
					<Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
					<Button type="button" size="sm" variant="ghost" onclick={() => (adding = false)}
						>Cancel</Button
					>
				</div>
			</form>
		{/if}
	</Card.Content>
	{#if !adding}
		<Card.Footer>
			<Button variant="outline" size="sm" onclick={() => (adding = true)}>Log an outing</Button>
		</Card.Footer>
	{/if}
</Card.Root>
