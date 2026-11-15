<script lang="ts">
	/**
	 * Pond Pairs: a calm memory game with Pebble's pond friends.
	 * No timer, no losing, no streaks. Each match shows a tiny true fact.
	 */
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PebbleState } from '#lib/components/kids/Pebble.svelte';
	import KidPebble from '#lib/components/kids/ui/KidPebble.svelte';
	import {
		DAILY_GAMES,
		friendByKey,
		levelInfo,
		POND_FRIENDS,
		type FriendKey
	} from '#lib/kids/pond.js';
	import Celebrate from '#lib/components/kids/ui/Celebrate.svelte';
	import KidBack from '#lib/components/kids/ui/KidBack.svelte';
	import KidStage from '#lib/components/kids/ui/KidStage.svelte';
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

<div class="k-sky flex flex-col gap-6">
	<KidBack label="Back to {data.pet.name}" />

	<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)] lg:gap-10">
		<!-- Pebble + collection -->
		<KidStage
			speech={speech ?? greeting}
			label="{data.pet.name} and the pond friends"
			petWidth="16rem"
		>
			<KidPebble state={mood} name={data.pet.name} color={data.pet.colorKey} />
			{#snippet below()}
				<div class="rounded-[1.75rem] bg-[oklch(1_0_0/0.7)] p-4 backdrop-blur-sm">
					<h2 class="mb-3 flex items-center justify-between text-xl font-black">
						<span><span aria-hidden="true">🐸</span> Pond friends</span>
						<span class="k-eyebrow">{data.friends.length}/{POND_FRIENDS.length}</span>
					</h2>
					<ul class="grid grid-cols-4 gap-2">
						{#each POND_FRIENDS as f (f.key)}
							<li>
								{#if owned.has(f.key)}
									<button
										type="button"
										class="friend flex aspect-square w-full flex-col items-center justify-center rounded-2xl text-3xl {showFact ===
										f.key
											? 'is-open'
											: ''}"
										aria-label="{f.name}: tap to hear a fact"
										onclick={() => {
											showFact = showFact === f.key ? null : f.key;
											if (showFact) speech = `${f.name}: ${f.fact}`;
										}}
									>
										<span aria-hidden="true">{f.emoji}</span>
										<span class="text-xs font-extrabold">{f.name}</span>
									</button>
								{:else}
									<div
										class="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-[var(--a-edge)]/50 text-2xl font-black text-[var(--a-edge)]"
										aria-label="A friend you haven't met yet"
									>
										?
									</div>
								{/if}
							</li>
						{/each}
					</ul>
					<p class="mt-3 text-base font-semibold text-muted-foreground">
						Meet one new friend each day you finish a game.
					</p>
				</div>
			{/snippet}
		</KidStage>

		<!-- Game -->
		<section aria-labelledby="pond-title" class="flex flex-col gap-5">
			<header class="k-rise flex flex-wrap items-end justify-between gap-3">
				<div class="flex flex-col items-start gap-3">
					<span class="k-eyebrow"><span aria-hidden="true">🪷</span> Memory game</span>
					<h1 id="pond-title" class="k-display">Pond Pairs</h1>
				</div>
				{#if phase === 'playing' || phase === 'saving'}
					<p
						class="flex items-center gap-2 rounded-full bg-[var(--kid-surface)] px-4 py-2 text-xl font-extrabold shadow-[0_3px_0_var(--a-edge)]"
						aria-live="polite"
					>
						{info.name} · Moves: <strong class="font-black text-[var(--a-deep)]">{moves}</strong>
					</p>
				{/if}
			</header>

			{#if error}
				<p class="k-note k-peach" role="alert">{error}</p>
			{/if}

			{#if phase === 'menu'}
				<div class="grid gap-4 sm:grid-cols-3">
					{#each data.levels as l (l.level)}
						<button
							type="button"
							disabled={!l.unlocked || !data.canPlay || busy}
							class="k-choice k-rise min-h-44"
							style:animation-delay="{l.level * 50}ms"
							onclick={() => start(l.level)}
						>
							<span
								class="grid size-16 place-items-center rounded-[1.25rem] bg-[var(--a-solid)] text-4xl shadow-[inset_0_-5px_0_var(--a-edge)]"
								aria-hidden="true">{l.level === 1 ? '💧' : l.level === 2 ? '🍃' : '🌊'}</span
							>
							<span class="text-2xl font-black">{l.name}</span>
							<span class="text-lg font-semibold text-muted-foreground">{l.pairs} pairs</span>
							{#if !l.unlocked}
								<span class="text-base font-bold">🔒 Meet {l.unlockAt} friends</span>
							{:else if data.best[l.level]}
								<span class="text-xl" aria-label="Best: {data.best[l.level]} stars"
									>{'⭐'.repeat(data.best[l.level] ?? 0)}</span
								>
							{/if}
						</button>
					{/each}
				</div>
				<p class="k-note text-lg">
					<span class="k-note__icon" aria-hidden="true">🐢</span> Games today: {data.playedToday}/{DAILY_GAMES}.
					There’s no timer, so take your time.
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
								class="pond-card relative aspect-square w-full rounded-3xl text-5xl {up
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
					class="k-card k-card--accent k-sun k-rise relative flex flex-col items-start gap-4 p-6 lg:p-8"
					aria-live="polite"
				>
					<Celebrate />
					<p class="text-6xl" aria-label="{result.stars} stars">
						{'⭐'.repeat(result.stars)}<span class="opacity-20"
							>{'⭐'.repeat(3 - result.stars)}</span
						>
					</p>
					<p class="k-title">
						All pairs in <strong class="font-black">{result.moves}</strong> moves{result.newBest
							? ' · New best!'
							: ''}
					</p>
					{#if friend}
						<p class="k-note k-mint items-center text-2xl">
							<span class="text-5xl" aria-hidden="true">{friend.emoji}</span>
							<span>New pond friend: <strong>{friend.name}</strong></span>
						</p>
					{/if}
					{#each result.unlocked as l (l)}
						<p class="text-xl font-bold">
							🔓 New pond open: <strong>{levelInfo(l)?.name}</strong>!
						</p>
					{/each}
					<div class="flex flex-wrap gap-3">
						{#if data.canPlay}
							<button
								type="button"
								class="k-btn k-btn--lg k-sky"
								disabled={busy}
								onclick={() => start(level)}
							>
								<span class="k-btn__icon" aria-hidden="true">🔁</span> Play again
							</button>
						{/if}
						<button
							type="button"
							class="k-btn k-btn--lg k-btn--quiet"
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
		transition: transform 0.12s ease;
		-webkit-tap-highlight-color: transparent;
	}
	.pond-card:active:not(:disabled) {
		transform: translateY(3px);
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
		/* water with a lily pad and ripples */
		border: 3px solid oklch(1 0 0 / 0.55);
		background:
			radial-gradient(circle at 70% 72%, oklch(0.78 0.13 150) 0 22%, transparent 23%),
			radial-gradient(circle at 28% 30%, oklch(1 0 0 / 0.35) 0 9%, transparent 10%),
			repeating-radial-gradient(
				circle at 30% 30%,
				transparent 0 14px,
				oklch(1 0 0 / 0.12) 14px 16px
			),
			linear-gradient(160deg, oklch(0.8 0.1 220), oklch(0.66 0.11 225));
		box-shadow: 0 5px 0 oklch(0.55 0.1 230);
		font-size: 0.75em;
	}
	.pond-front {
		background: var(--kid-surface, #fff);
		border: 3px solid var(--k-line, #ddd);
		box-shadow: 0 5px 0 oklch(0.88 0.025 200);
		transform: rotateY(180deg);
	}
	.is-up .pond-back {
		transform: rotateY(180deg);
	}
	.is-up .pond-front {
		transform: rotateY(0deg);
	}
	.is-matched .pond-front {
		border-color: var(--k-sun-edge, #f5c84b);
		background: var(--k-sun-soft, #fff8e1);
		box-shadow: 0 5px 0 var(--k-sun-edge, #f5c84b);
	}
	.friend {
		background: var(--kid-surface, #fff);
		box-shadow: 0 3px 0 oklch(0.87 0.025 200);
		transition: transform 0.12s ease;
	}
	.friend:active {
		transform: translateY(2px);
	}
	.friend.is-open {
		background: var(--a-soft);
		box-shadow:
			0 3px 0 var(--a-edge),
			inset 0 0 0 3px var(--a-edge);
	}
	@media (prefers-reduced-motion: reduce) {
		.pond-face,
		.pond-card,
		.friend {
			transition: none;
		}
		.pond-card:active:not(:disabled),
		.friend:active {
			transform: none;
		}
	}
</style>
