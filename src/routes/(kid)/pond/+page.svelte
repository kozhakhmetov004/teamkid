<script lang="ts">
	/**
	 * Pond Pairs: a calm memory game with Pebble's pond friends.
	 * No timer, no losing, no streaks. Each match shows a tiny true fact.
	 */
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Pebble, { type PebbleState } from '#lib/components/kids/Pebble.svelte';
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import { shellColorByKey } from '#lib/kids/pet.js';
	import {
		DAILY_GAMES,
		friendByKey,
		levelInfo,
		POND_FRIENDS,
		type FriendKey
	} from '#lib/kids/pond.js';
	import { KID_FOCUS, KID_FONT } from '#lib/kids/ui.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Phase = 'menu' | 'playing' | 'saving' | 'done';
	type Result = {
		moves: number;
		stars: 1 | 2 | 3;
		newBest: boolean;
		newFriend: FriendKey | null;
		unlocked: number[];
	};

	let phase = $state<Phase>('menu');
	let level = $state(1);
	let deck = $state<FriendKey[]>([]);
	let ticket = '';
	let flips: number[] = [];
	let open = $state<number[]>([]);
	let matched = $state<Set<number>>(new Set());
	let moves = $state(0);
	let busy = $state(false);
	let speech = $state<string | null>(null);
	let mood = $state<PebbleState>('idle');
	let result = $state<Result | null>(null);
	let error = $state<string | null>(null);
	let showFact = $state<FriendKey | null>(null);

	const color = $derived(shellColorByKey(data.pet.colorKey));
	const info = $derived(levelInfo(level)!);
	const owned = $derived(new Set(data.friends.map((f) => f.key)));

	const greeting = $derived(
		!data.canPlay
			? `We played ${DAILY_GAMES} games today! My flippers need a rest. Let’s play again tomorrow.`
			: data.friendToday
				? 'You already met a new friend today! Want to play for stars?'
				: 'Let’s play Pond Pairs! Finish a game to meet a new pond friend.'
	);

	async function post(action: 'start' | 'finish', fields: Record<string, string>) {
		const body = new FormData();
		for (const [k, v] of Object.entries(fields)) body.set(k, v);
		const res = await fetch(`?/${action}`, {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		return deserialize(await res.text());
	}

	async function start(l: number) {
		error = null;
		busy = true;
		try {
			const r = await post('start', { level: String(l) });
			if (r.type !== 'success' || !r.data) {
				error =
					r.type === 'failure' && typeof r.data?.message === 'string'
						? r.data.message
						: 'The pond is a bit sleepy. Try again?';
				return;
			}
			level = l;
			deck = r.data.deck as FriendKey[];
			ticket = String(r.data.ticket);
			flips = [];
			open = [];
			matched = new Set();
			moves = 0;
			result = null;
			mood = 'idle';
			speech = 'Find two friends that match. Take your time!';
			phase = 'playing';
		} catch {
			error = 'The pond is a bit sleepy. Try again?';
		} finally {
			busy = false;
		}
	}

	function flip(i: number) {
		if (phase !== 'playing' || busy || matched.has(i) || open.includes(i)) return;
		open = [...open, i];
		flips.push(i);
		if (open.length < 2) return;

		moves += 1;
		const [a, b] = open;
		if (deck[a] === deck[b]) {
			matched = new Set([...matched, a, b]);
			open = [];
			const f = friendByKey(deck[a])!;
			speech = `You found ${f.name}! ${f.fact}`;
			mood = 'happy';
			if (matched.size === deck.length) void finish();
		} else {
			busy = true;
			mood = 'idle';
			speech = 'Not a pair. Remember where they are!';
			setTimeout(() => {
				open = [];
				busy = false;
			}, 900);
		}
	}

	async function finish() {
		phase = 'saving';
		const r = await post('finish', { ticket, flips: flips.join(',') }).catch(() => null);
		if (!r || r.type !== 'success' || !r.data) {
			error =
				r?.type === 'failure' && typeof r.data?.message === 'string'
					? r.data.message
					: 'Pebble couldn’t save that. Try again?';
			phase = 'menu';
			return;
		}
		result = r.data as unknown as Result;
		mood = 'proud';
		const friend = result.newFriend ? friendByKey(result.newFriend) : null;
		speech = friend
			? `Hooray! ${friend.name} wants to be your pond friend! ${friend.fact}`
			: result.stars === 3
				? 'Wow, what a memory! Three stars!'
				: 'You did it! Every pair found.';
		phase = 'done';
		await invalidateAll();
	}

	const cardLabel = (i: number) =>
		matched.has(i) || open.includes(i)
			? `Card ${i + 1}: ${friendByKey(deck[i])?.name}`
			: `Card ${i + 1}, face down`;
</script>

<svelte:head><title>Pond Pairs · TeamKid</title></svelte:head>

<div class="flex flex-col gap-6" style="font-family: {KID_FONT}">
	<a
		href="/pebble"
		class="inline-flex min-h-14 items-center gap-2 self-start rounded-2xl px-4 text-xl font-semibold text-primary {KID_FOCUS}"
	>
		<span aria-hidden="true">←</span> Back to {data.pet.name}
	</a>

	<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)] lg:gap-10">
		<!-- Pebble + collection -->
		<section
			aria-label="{data.pet.name} and the pond friends"
			class="flex flex-col gap-5 rounded-[2.5rem] bg-gradient-to-b from-kid-surface to-secondary p-6 shadow-sm lg:sticky lg:top-6"
		>
			<PebbleSay text={speech ?? greeting} />
			<div class="mx-auto w-full max-w-[16rem]">
				<Pebble state={mood} name={data.pet.name} {color} />
			</div>

			<div>
				<h2 class="mb-2 text-xl font-bold">
					Pond friends <span class="text-muted-foreground"
						>{data.friends.length}/{POND_FRIENDS.length}</span
					>
				</h2>
				<ul class="grid grid-cols-4 gap-2">
					{#each POND_FRIENDS as f (f.key)}
						<li>
							{#if owned.has(f.key)}
								<button
									type="button"
									class="flex aspect-square w-full flex-col items-center justify-center rounded-2xl bg-kid-surface text-3xl shadow-sm {showFact ===
									f.key
										? 'ring-4 ring-primary'
										: ''} {KID_FOCUS}"
									aria-label="{f.name}: tap to hear a fact"
									onclick={() => {
										showFact = showFact === f.key ? null : f.key;
										if (showFact) speech = `${f.name}: ${f.fact}`;
									}}
								>
									<span aria-hidden="true">{f.emoji}</span>
									<span class="text-xs font-semibold">{f.name}</span>
								</button>
							{:else}
								<div
									class="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 text-2xl text-muted-foreground/60"
									aria-label="A friend you haven't met yet"
								>
									?
								</div>
							{/if}
						</li>
					{/each}
				</ul>
				<p class="mt-2 text-base text-muted-foreground">
					Meet one new friend each day you finish a game.
				</p>
			</div>
		</section>

		<!-- Game -->
		<section aria-labelledby="pond-title" class="flex flex-col gap-5">
			<header class="flex flex-wrap items-end justify-between gap-3">
				<h1 id="pond-title" class="text-4xl font-bold lg:text-5xl">Pond Pairs</h1>
				{#if phase === 'playing' || phase === 'saving'}
					<p class="text-xl text-muted-foreground" aria-live="polite">
						{info.name} · Moves: <strong class="text-foreground">{moves}</strong>
					</p>
				{/if}
			</header>

			{#if error}
				<p class="rounded-2xl bg-kid-surface p-4 text-xl shadow-sm" role="alert">{error}</p>
			{/if}

			{#if phase === 'menu'}
				<div class="grid gap-4 sm:grid-cols-3">
					{#each data.levels as l (l.level)}
						<button
							type="button"
							disabled={!l.unlocked || !data.canPlay || busy}
							class="flex min-h-36 flex-col items-center justify-center gap-1 rounded-3xl bg-kid-surface p-4 text-center shadow-sm disabled:opacity-50 {KID_FOCUS}"
							onclick={() => start(l.level)}
						>
							<span class="text-4xl" aria-hidden="true"
								>{l.level === 1 ? '💧' : l.level === 2 ? '🍃' : '🌊'}</span
							>
							<span class="text-2xl font-bold">{l.name}</span>
							<span class="text-lg text-muted-foreground">{l.pairs} pairs</span>
							{#if !l.unlocked}
								<span class="text-base">🔒 Meet {l.unlockAt} friends</span>
							{:else if data.best[l.level]}
								<span class="text-xl" aria-label="Best: {data.best[l.level]} stars"
									>{'⭐'.repeat(data.best[l.level] ?? 0)}</span
								>
							{/if}
						</button>
					{/each}
				</div>
				<p class="text-lg text-muted-foreground">
					Games today: {data.playedToday}/{DAILY_GAMES}. There’s no timer, so take your time.
				</p>
			{:else if phase === 'playing' || phase === 'saving'}
				<ol
					class="grid gap-3"
					style="grid-template-columns: repeat({info.cols}, minmax(0, 1fr))"
					aria-label="Cards"
				>
					{#each deck as key, i (i)}
						{@const up = matched.has(i) || open.includes(i)}
						<li>
							<button
								type="button"
								class="pond-card relative aspect-square w-full rounded-3xl text-5xl shadow-sm {KID_FOCUS} {up
									? 'is-up'
									: ''} {matched.has(i) ? 'is-matched' : ''}"
								aria-label={cardLabel(i)}
								aria-pressed={up}
								disabled={phase === 'saving' || matched.has(i)}
								onclick={() => flip(i)}
							>
								<span class="pond-face pond-back" aria-hidden="true">🐢</span>
								<span class="pond-face pond-front" aria-hidden="true"
									>{friendByKey(key)?.emoji}</span
								>
							</button>
						</li>
					{/each}
				</ol>
			{:else if phase === 'done' && result}
				{@const friend = result.newFriend ? friendByKey(result.newFriend) : null}
				<div
					class="flex flex-col items-start gap-4 rounded-3xl bg-kid-surface p-6 shadow-sm"
					aria-live="polite"
				>
					<p class="text-5xl" aria-label="{result.stars} stars">
						{'⭐'.repeat(result.stars)}<span class="opacity-20"
							>{'⭐'.repeat(3 - result.stars)}</span
						>
					</p>
					<p class="text-2xl">
						All pairs in <strong>{result.moves}</strong> moves{result.newBest ? ' · New best!' : ''}
					</p>
					{#if friend}
						<p class="flex items-center gap-3 text-2xl">
							<span class="text-5xl" aria-hidden="true">{friend.emoji}</span>
							<span>New pond friend: <strong>{friend.name}</strong></span>
						</p>
					{/if}
					{#each result.unlocked as l (l)}
						<p class="text-xl">🔓 New pond open: <strong>{levelInfo(l)?.name}</strong>!</p>
					{/each}
					<div class="flex flex-wrap gap-3">
						{#if data.canPlay}
							<button
								type="button"
								class="min-h-16 rounded-2xl bg-primary px-6 text-xl font-bold text-primary-foreground {KID_FOCUS}"
								disabled={busy}
								onclick={() => start(level)}
							>
								Play again
							</button>
						{/if}
						<button
							type="button"
							class="min-h-16 rounded-2xl bg-secondary px-6 text-xl font-semibold {KID_FOCUS}"
							onclick={() => {
								phase = 'menu';
								speech = null;
								mood = 'idle';
							}}
						>
							Choose a pond
						</button>
					</div>
				</div>
			{/if}
		</section>
	</div>
</div>

<style>
	.pond-card {
		perspective: 600px;
		background: transparent;
	}
	.pond-face {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		border-radius: 1.5rem;
		backface-visibility: hidden;
		transition: transform 300ms ease;
	}
	.pond-back {
		background: radial-gradient(circle at 30% 30%, #8fd3b6, #4f9f83);
	}
	.pond-front {
		background: var(--color-kid-surface, #fff);
		transform: rotateY(180deg);
	}
	.is-up .pond-back {
		transform: rotateY(180deg);
	}
	.is-up .pond-front {
		transform: rotateY(0deg);
	}
	.is-matched .pond-front {
		box-shadow: inset 0 0 0 4px #f5c84b;
	}
	@media (prefers-reduced-motion: reduce) {
		.pond-face {
			transition: none;
		}
	}
</style>
