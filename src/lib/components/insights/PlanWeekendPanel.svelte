<script lang="ts">
	/**
	 * "Plan this weekend" (on /calendar). Knows who has the child this weekend
	 * and what's planned, shows an AI hint from the child's SHARED weekend picks,
	 * then real places from POST /api/planner/weekend. Each suggestion: why it
	 * fits ("Matches: …"), Add to calendar (SuggestionCard → ?/add), Not this
	 * time, More like this.
	 */
	import AtHomeIdea from '#lib/components/plan/AtHomeIdea.svelte';
	import PlanForm from '#lib/components/plan/PlanForm.svelte';
	import PlanSkeleton from '#lib/components/plan/PlanSkeleton.svelte';
	import SuggestionCard from '#lib/components/plan/SuggestionCard.svelte';
	import {
		weekendLabel,
		timeLabel,
		type PlanParams,
		type PlanResponse,
		type PlannedSuggestion
	} from '#lib/components/plan/types.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { matchesFor } from '#lib/kids/weekLines.js';
	import ReturnedIdea from './ReturnedIdea.svelte';

	interface Panel {
		childName: string;
		otherParentName: string | null;
		hasWishes: boolean;
		weekends: { saturday: string; withYou: boolean }[];
		childTags: string[];
		returnedIdeas: {
			id: string;
			title: string;
			place: string | null;
			date: string;
			from: string;
			to: string;
		}[];
		weekend: {
			saturday: string;
			days: { date: string; with: string | null }[];
			planned: { title: string; when: string }[];
		} | null;
	}

	let { panel, nudge }: { panel: Panel; nudge: Promise<{ text: string; ai: boolean } | null> } =
		$props();

	const childName = $derived(panel.childName);
	const otherName = $derived(panel.otherParentName ?? 'your co-parent');

	let saturday = $state('');
	$effect.pre(() => {
		if (!panel.weekends.some((w) => w.saturday === saturday)) {
			saturday = (panel.weekends.find((w) => w.withYou) ?? panel.weekends[0])?.saturday ?? '';
		}
	});

	let loading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<PlanResponse | null>(null);
	let lastParams = $state<PlanParams | null>(null);
	let seconds = $state(0);
	/** Place ids dismissed ("Not this time") or already shown before "More like this". */
	let hidden = $state<string[]>([]);
	/** "More like this": the liked suggestion (shown as a note above the results). */
	let liked = $state<{ category: string; title: string; name: string } | null>(null);

	$effect(() => {
		if (!loading) return;
		seconds = 0;
		const timer = setInterval(() => (seconds += 1), 1000);
		return () => clearInterval(timer);
	});

	async function plan(params: PlanParams) {
		lastParams = params;
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/planner/weekend', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					...params,
					focus: liked ? { category: liked.category, title: liked.title } : undefined,
					exclude: hidden.slice(-50)
				}),
				signal: AbortSignal.timeout(55_000)
			});
			const body = await res.json().catch(() => null);
			if (res.ok && body?.status) result = body as PlanResponse;
			else if (res.status === 429)
				error = 'You’ve planned several times in the last hour. Please try again a bit later.';
			else error = 'We couldn’t plan this weekend right now.';
		} catch {
			error = 'Planning took too long.';
		} finally {
			loading = false;
		}
	}

	function planWeekendOf(next: string) {
		saturday = next;
		if (lastParams) void plan({ ...lastParams, saturday: next });
	}

	function notThisTime(s: PlannedSuggestion) {
		hidden = [...hidden, s.place.id];
	}

	/** New places in the same spirit: the server searches the liked category first and skips what was already shown. */
	function moreLikeThis(s: PlannedSuggestion) {
		liked = { category: s.place.category, title: s.title, name: s.place.name };
		const seen = result?.status === 'ok' ? result.suggestions.map((x) => x.place.id) : [];
		hidden = [...new Set([...hidden, ...seen])];
		if (lastParams) void plan(lastParams);
	}

	const shown = $derived(
		result?.status === 'ok' ? result.suggestions.filter((s) => !hidden.includes(s.place.id)) : []
	);

	const dayName = (date: string) =>
		new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(
			new Date(`${date}T12:00:00Z`)
		);
</script>

<section id="plan" aria-labelledby="plan-title" class="scroll-mt-6 space-y-4">
	<Card.Root>
		<Card.Header class="flex items-center gap-2">
			<span
				class="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-sm"
				aria-hidden="true">🧭</span
			>
			<Card.Title id="plan-title">Plan this weekend</Card.Title>
			{#if panel.weekend}
				<span class="ml-auto text-sm text-muted-foreground"
					>{weekendLabel(panel.weekend.saturday)}</span
				>
			{/if}
		</Card.Header>
		<Card.Content class="space-y-4">
			<p class="text-sm text-muted-foreground">
				Ideas near you for your time with {childName}, based on what {childName} chose to share.
			</p>

			{#if panel.weekend}
				{@const w = panel.weekend}
				<div class="grid gap-3 sm:grid-cols-3">
					{#each w.days as d (d.date)}
						<div class="rounded-xl bg-muted/60 p-3">
							<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								{dayName(d.date)}
							</p>
							<p class="mt-1 text-sm font-semibold">
								{d.with === 'you' ? 'With you' : d.with ? `With ${d.with}` : 'Not set'}
							</p>
						</div>
					{/each}
					<div class="rounded-xl bg-muted/60 p-3">
						<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Already planned
						</p>
						{#if w.planned.length}
							<ul class="mt-1 space-y-0.5 text-sm">
								{#each w.planned as e (e.title + e.when)}
									<li class="truncate">
										<span class="font-semibold">{e.title}</span>
										<span class="text-muted-foreground">· {e.when}</span>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="mt-1 text-sm font-semibold">Nothing yet</p>
						{/if}
					</div>
				</div>
			{/if}

			{#await nudge then n}
				{#if n}
					<div class="flex items-start gap-3 rounded-xl bg-secondary p-4 text-secondary-foreground">
						<span class="text-2xl" aria-hidden="true">🐢</span>
						<div class="min-w-0 flex-1 space-y-1">
							<p class="font-medium">{n.text}</p>
							<p class="text-xs text-muted-foreground">
								{n.ai ? '✨ Suggested by AI' : 'Based on shared wish cards'} · only what {childName}
								chose to share
							</p>
						</div>
					</div>
				{/if}
			{/await}

			<div class="border-t border-border/60 pt-4">
				<PlanForm
					weekends={panel.weekends}
					{childName}
					otherParentName={otherName}
					{loading}
					onPlan={(p) => {
						liked = null;
						hidden = [];
						void plan(p);
					}}
					bind:saturday
				/>
			</div>

			{#if !panel.hasWishes}
				<p class="text-xs text-muted-foreground">
					Tip: ask {childName} to share wish cards with Pebble for better ideas. Until then, ideas are
					based on {childName}'s age and week.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if panel.returnedIdeas.length}
		<section aria-label="Back in your ideas" class="space-y-2">
			<h3 class="text-sm font-semibold">Back in your ideas</h3>
			<ul class="grid gap-3 md:grid-cols-2">
				{#each panel.returnedIdeas as idea (idea.id)}
					<ReturnedIdea {idea} />
				{/each}
			</ul>
		</section>
	{/if}

	{#if loading}
		<PlanSkeleton {seconds} />
	{:else if error}
		<Card.Root role="alert">
			<Card.Header>
				<Card.Title>{error}</Card.Title>
				<Card.Description>Nothing was changed. You can try again.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Button onclick={() => lastParams && plan(lastParams)}>Try again</Button>
			</Card.Content>
		</Card.Root>
	{:else if result?.status === 'no_time'}
		<Card.Root role="status">
			<Card.Header>
				<Card.Title>
					No free time between {timeLabel(result.from)} and {timeLabel(result.to)} on {weekendLabel(
						result.saturday
					)}
				</Card.Title>
				<Card.Description>Try a wider time range (“All day”) or another weekend.</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else if result?.status === 'not_with_you'}
		<Card.Root>
			<Card.Header>
				<Card.Title>{childName} is with {otherName} on {weekendLabel(result.saturday)}</Card.Title>
				<Card.Description>
					{result.nextSaturday
						? `Your next weekend with ${childName} is ${weekendLabel(result.nextSaturday)}.`
						: `There's no weekend with ${childName} in the next four weeks.`}
				</Card.Description>
			</Card.Header>
			{#if result.nextSaturday}
				{@const next = result.nextSaturday}
				<Card.Content>
					<Button onclick={() => planWeekendOf(next)}>Plan {weekendLabel(next)} instead</Button>
				</Card.Content>
			{/if}
		</Card.Root>
	{:else if result?.status === 'ok'}
		{@const demo = result.source === 'demo'}
		<div class="space-y-4" aria-label="Suggestions">
			{#if liked}
				<p class="flex flex-wrap items-center gap-2 text-sm" role="status">
					<span>More ideas like <strong>{liked.name}</strong></span>
					<Button
						size="sm"
						variant="ghost"
						onclick={() => {
							liked = null;
							hidden = [];
							if (lastParams) void plan(lastParams);
						}}>Show all ideas again</Button
					>
				</p>
			{/if}
			{#if demo}
				<p class="rounded-lg border border-pebble bg-pebble/20 p-3 text-sm" role="status">
					<strong>Demo places.</strong> Live map data isn't available right now, so these are sample places
					to show how planning works.
				</p>
			{/if}
			{#if shown.length === 0}
				<p class="text-sm text-muted-foreground">
					No more places here. Try a larger distance or another weekend.
				</p>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each shown as s (s.place.id)}
						{@const matches = matchesFor(s.place.category, panel.childTags)}
						<div class="flex flex-col gap-2">
							<SuggestionCard suggestion={s} {demo} childName={panel.childName} />
							<p class="text-xs text-muted-foreground">
								{matches.length ? `Matches: ${matches.join(', ')}` : 'A new idea to try'}
							</p>
							<div class="flex flex-wrap gap-2">
								<Button size="sm" variant="ghost" onclick={() => notThisTime(s)}
									>Not this time</Button
								>
								<Button size="sm" variant="outline" onclick={() => moreLikeThis(s)}
									>More like this</Button
								>
							</div>
						</div>
					{/each}
				</div>
			{/if}
			<AtHomeIdea idea={result.atHome} />
			<p class="text-xs text-muted-foreground">
				{#if result.source === 'osm'}
					Places data © <a
						class="underline"
						href="https://www.openstreetmap.org/copyright"
						target="_blank"
						rel="noopener noreferrer">OpenStreetMap contributors</a
					>.
				{/if}
				Suggested by AI. Check opening times before you go; suggestions can be wrong.
			</p>
		</div>
	{/if}
</section>
