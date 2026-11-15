<script lang="ts">
	/**
	 * This week's wish cards: one card at a time, multi-select picture chips,
	 * "Other ✏️" for a typed idea (checked on the server), then Pebble asks if
	 * Mom and Dad can see it (private by default). Answers can change all week.
	 */
	import { onMount, tick } from 'svelte';
	import { deserialize } from '$app/forms';
	import { cardShareAsk, DECK_LINES, WISH_LINES } from '#lib/kids/pebbleLines.js';
	import type { ShellColor, ShellPatternKey } from '#lib/kids/pet.js';
	import { KID_FOCUS } from '#lib/kids/ui.js';
	import { IDEA_MAX, type WeeklyDeck } from '#lib/kids/weeklyDeck.js';
	import type { PebbleState } from './Pebble.svelte';
	import ShareAsk from './ShareAsk.svelte';

	interface Answer {
		kind: string;
		key: string;
		label: string;
		emoji: string;
		custom: boolean;
		shared: boolean;
	}

	let {
		deck,
		answers,
		weekendLine,
		petName,
		color,
		pattern,
		onsay
	}: {
		deck: WeeklyDeck;
		answers: Answer[];
		weekendLine: string | null;
		petName: string;
		color: ShellColor;
		pattern: ShellPatternKey | null;
		onsay: (text: string, mood?: PebbleState) => void;
	} = $props();

	const uid = $props.id();

	// Saved answers per card (kept in sync after each save / share).
	let saved = $state<Answer[]>([]);
	let index = $state(0);
	let picked = $state<string[]>([]);
	let keepOwn = $state<string[]>([]);
	let otherOpen = $state(false);
	let other = $state('');
	let pending = $state(false);
	let error = $state('');
	let needsGrownUp = $state(false);
	let askOpen = $state(false);
	let heading: HTMLHeadingElement | undefined = $state();

	const card = $derived(deck.cards[index] ?? null);
	const mine = $derived(card ? saved.filter((a) => a.kind === card.kind) : []);
	const ownIdeas = $derived(mine.filter((a) => a.custom));
	const count = $derived(picked.length + keepOwn.length + (other.trim() ? 1 : 0));
	const answeredKinds = $derived(new Set(saved.map((a) => a.kind)));

	function loadCard() {
		const current = deck.cards[index];
		const rows = current ? saved.filter((a) => a.kind === current.kind) : [];
		picked = rows.filter((a) => !a.custom).map((a) => a.key);
		keepOwn = rows.filter((a) => a.custom).map((a) => a.key);
		other = '';
		otherOpen = false;
		error = '';
		needsGrownUp = false;
	}

	onMount(() => {
		saved = answers.map((a) => ({ ...a }));
		loadCard();
		onsay(DECK_LINES.start, 'happy');
	});

	function toggle(list: string[], key: string): string[] {
		return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
	}

	function togglePick(key: string) {
		if (!card) return;
		if (!picked.includes(key) && count >= card.max) {
			error = `You can pick up to ${card.max}. Tap one again to take it away.`;
			return;
		}
		error = '';
		picked = toggle(picked, key);
	}

	async function post(action: string, body: FormData) {
		const res = await fetch(`?/${action}`, {
			method: 'POST',
			body,
			headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
		});
		return deserialize(await res.text());
	}

	async function save() {
		if (!card || pending) return;
		if (count === 0) {
			error = 'Pick one, or type your own idea!';
			return;
		}
		const body = new FormData();
		body.set('card', card.kind);
		for (const k of picked) body.append('options', k);
		for (const k of keepOwn) body.append('keepOwn', k);
		body.set('other', other.trim());
		pending = true;
		error = '';
		needsGrownUp = false;
		const result = await post('answer', body);
		pending = false;

		if (result.type === 'success' && result.data) {
			const d = result.data as {
				status: 'saved' | 'retry' | 'big_feeling';
				reply?: string;
				saved?: { key: string; label: string; emoji: string; custom: boolean }[];
			};
			if (d.status === 'big_feeling') {
				other = '';
				otherOpen = false;
				needsGrownUp = true;
				onsay(d.reply ?? '', 'idle');
				return;
			}
			if (d.status === 'retry') {
				onsay(d.reply ?? '', 'idle');
				return;
			}
			const kind = card.kind;
			saved = [
				...saved.filter((a) => a.kind !== kind),
				...(d.saved ?? []).map((s) => ({ ...s, kind, shared: false }))
			];
			loadCard();
			onsay(DECK_LINES.saved, 'happy');
			askOpen = true;
			return;
		}
		error =
			result.type === 'failure' && typeof result.data?.message === 'string'
				? result.data.message
				: 'Oops, Pebble could not save that. Try again?';
	}

	async function goTo(i: number, line: string) {
		index = i;
		loadCard();
		onsay(line, i >= deck.cards.length ? 'proud' : 'idle');
		await tick();
		heading?.focus();
	}

	async function onanswer(share: boolean) {
		if (!card) return;
		const kind = card.kind;
		if (share) {
			pending = true;
			const body = new FormData();
			body.set('card', kind);
			const result = await post('share', body);
			pending = false;
			if (result.type === 'success') {
				saved = saved.map((a) => (a.kind === kind ? { ...a, shared: true } : a));
			} else {
				error = 'Oops, that did not reach Mom and Dad. It stays just for you for now.';
			}
		}
		askOpen = false;
		const line = share ? WISH_LINES.sharedYes : WISH_LINES.sharedNo;
		await goTo(index + 1, index + 1 >= deck.cards.length ? `${line} ${DECK_LINES.end}` : line);
	}

	const shareQuestion = $derived(
		card
			? cardShareAsk(
					card.kind,
					mine.map((a) => a.label)
				)
			: ''
	);
	const hint = $derived(
		card?.kind === 'interest' ? 'Pick as many as you like' : `Pick 1 to ${card?.max ?? 3}`
	);
</script>

<!-- progress dots, with a text label too -->
<div class="flex flex-wrap items-center gap-3">
	<ol class="flex gap-2" aria-hidden="true">
		{#each deck.cards as c, i (c.kind)}
			<li
				class="size-3.5 rounded-full {answeredKinds.has(c.kind)
					? 'bg-primary'
					: i === index
						? 'bg-primary/60 ring-2 ring-primary'
						: 'bg-border'}"
			></li>
		{/each}
	</ol>
	{#if card}
		<span class="text-lg text-muted-foreground">Card {index + 1} of {deck.cards.length}</span>
	{/if}
</div>

{#if card}
	<article class="flex flex-col gap-5 rounded-[2.5rem] bg-kid-surface p-6 shadow-md lg:p-8">
		<div class="space-y-2">
			<h1 bind:this={heading} tabindex="-1" class="text-4xl font-bold outline-none lg:text-5xl">
				{card.prompt}
			</h1>
			{#if card.kind === 'activity' && weekendLine}
				<p class="text-xl text-muted-foreground">{weekendLine}</p>
			{/if}
			<p class="text-lg text-muted-foreground">{hint}</p>
		</div>

		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label={card.prompt}>
			{#each card.options as o (o.key)}
				{@const on = picked.includes(o.key)}
				<button
					type="button"
					aria-pressed={on}
					disabled={pending}
					onclick={() => togglePick(o.key)}
					class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[1.5rem] border-4 p-3 text-center text-xl font-semibold transition disabled:opacity-60 {on
						? 'border-primary bg-primary/10'
						: 'border-transparent bg-background'} {KID_FOCUS}"
				>
					<span class="text-4xl" aria-hidden="true">{o.emoji}</span>
					{o.label}
					{#if on}<span class="sr-only">(picked)</span>{/if}
				</button>
			{/each}
			{#each ownIdeas as o (o.key)}
				{@const on = keepOwn.includes(o.key)}
				<button
					type="button"
					aria-pressed={on}
					disabled={pending}
					onclick={() => (keepOwn = toggle(keepOwn, o.key))}
					class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[1.5rem] border-4 p-3 text-center text-xl font-semibold disabled:opacity-60 {on
						? 'border-primary bg-primary/10'
						: 'border-transparent bg-background'} {KID_FOCUS}"
				>
					<span class="text-4xl" aria-hidden="true">{o.emoji}</span>
					{o.label}
					<span class="text-base font-normal text-muted-foreground">My idea ✏️</span>
				</button>
			{/each}
			<button
				type="button"
				aria-expanded={otherOpen}
				aria-controls="{uid}-other"
				disabled={pending}
				onclick={() => (otherOpen = !otherOpen)}
				class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[1.5rem] border-4 border-dashed border-border bg-background p-3 text-xl font-semibold disabled:opacity-60 {KID_FOCUS}"
			>
				<span class="text-4xl" aria-hidden="true">✏️</span> Other
			</button>
		</div>

		{#if otherOpen}
			<div id="{uid}-other" class="grid gap-2">
				<label for="{uid}-text" class="text-xl font-semibold">Type your own idea</label>
				<input
					id="{uid}-text"
					type="text"
					bind:value={other}
					maxlength={IDEA_MAX}
					autocomplete="off"
					class="min-h-16 rounded-2xl border-2 border-border bg-background px-4 text-xl {KID_FOCUS}"
				/>
				<p class="text-base text-muted-foreground">
					{other.length}/{IDEA_MAX} · Please don’t type names, addresses or phone numbers.
				</p>
			</div>
		{/if}

		<button
			type="button"
			onclick={save}
			disabled={pending}
			class="flex min-h-20 items-center justify-center gap-3 rounded-[2rem] bg-primary px-6 text-2xl font-bold text-primary-foreground shadow-sm disabled:opacity-60 {KID_FOCUS}"
		>
			<span aria-hidden="true">💾</span>
			{pending ? 'Saving…' : mine.length ? 'Save my changes' : 'Save my picks'}
		</button>

		<div class="flex flex-wrap justify-between gap-3">
			<button
				type="button"
				disabled={pending || index === 0}
				onclick={() => goTo(index - 1, DECK_LINES.next)}
				class="min-h-14 rounded-2xl px-4 text-xl font-semibold text-muted-foreground disabled:opacity-40 {KID_FOCUS}"
			>
				← Back
			</button>
			<button
				type="button"
				disabled={pending}
				onclick={() =>
					goTo(index + 1, index + 1 >= deck.cards.length ? DECK_LINES.end : DECK_LINES.next)}
				class="min-h-14 rounded-2xl bg-secondary px-5 text-xl font-semibold text-secondary-foreground {KID_FOCUS}"
			>
				{mine.length ? 'Next card →' : 'Skip this card →'}
			</button>
		</div>

		{#if mine.length}
			<p class="text-lg text-muted-foreground">
				{#if mine.some((a) => a.shared)}💌 Mom and Dad can see this card.{:else}🤫 Just for you
					right now.{/if}
			</p>
		{/if}
	</article>
{:else}
	<article class="flex flex-col gap-6 rounded-[2.5rem] bg-kid-surface p-8 text-center shadow-md">
		<h1 bind:this={heading} tabindex="-1" class="text-4xl font-bold outline-none">
			That was every card! 🎉
		</h1>
		<p class="text-xl text-muted-foreground">You can change your answers until Sunday.</p>
		<div class="grid gap-4 sm:grid-cols-2">
			<button
				type="button"
				onclick={() => goTo(0, DECK_LINES.start)}
				class="flex min-h-20 items-center justify-center gap-3 rounded-[2rem] bg-kid-surface px-6 text-2xl font-bold shadow-sm ring-2 ring-border {KID_FOCUS}"
			>
				<span aria-hidden="true">🔁</span> Change my answers
			</button>
			<a
				href="/my-sharing"
				class="flex min-h-20 items-center justify-center gap-3 rounded-[2rem] bg-primary px-6 text-2xl font-bold text-primary-foreground shadow-sm {KID_FOCUS}"
			>
				<span aria-hidden="true">👀</span> What do Mom and Dad see?
			</a>
		</div>
	</article>
{/if}

{#if needsGrownUp}
	<a
		href="/help"
		class="inline-flex min-h-16 items-center gap-3 self-start rounded-2xl bg-kid-surface px-5 text-xl font-semibold shadow-sm ring-2 ring-primary {KID_FOCUS}"
	>
		<span aria-hidden="true">🆘</span> I need a grown-up
	</a>
{/if}

{#if error}
	<p role="alert" class="rounded-2xl bg-pebble/40 p-4 text-center text-xl text-pebble-foreground">
		{error}
	</p>
{/if}

<ShareAsk
	bind:open={askOpen}
	question={shareQuestion}
	icon={mine[0]?.emoji ?? '⭐'}
	{petName}
	{color}
	{pattern}
	{pending}
	{onanswer}
/>
