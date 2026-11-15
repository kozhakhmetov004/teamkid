<script lang="ts">
	/**
	 * Hero: where the child sleeps tonight, the briefing (top right) and the
	 * full list of today's activities with done markers.
	 * Done = the event has ended, unless the parent ticked/unticked it. Manual
	 * ticks are a per-device convenience (localStorage), never shared data.
	 */
	import Check from '@lucide/svelte/icons/check';
	import { onMount } from 'svelte';

	export interface TodayEvent {
		id: string;
		time: string;
		title: string;
		place: string | null;
		kind: string;
		startsAt: string;
		endsAt: string;
	}

	let {
		childName,
		mine,
		withName,
		custodyLine,
		events,
		briefing,
		source = 'rules'
	}: {
		childName: string;
		/** true = with you tonight, false = with the other parent, null = not set */
		mine: boolean | null;
		withName: string | null;
		custodyLine: string | null;
		events: TodayEvent[];
		briefing: string;
		source?: 'rules' | 'ai';
	} = $props();

	const STORE = 'teamkid:today-done';
	let now = $state(Date.now());
	let ticks = $state<Record<string, boolean>>({});

	onMount(() => {
		try {
			ticks = JSON.parse(localStorage.getItem(STORE) ?? '{}') ?? {};
		} catch {
			ticks = {};
		}
		const timer = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(timer);
	});

	function toggle(id: string, done: boolean) {
		ticks = { ...ticks, [id]: !done };
		try {
			// Keep only today's events so the store never grows.
			const keep = Object.fromEntries(
				Object.entries(ticks).filter(([k]) => events.some((e) => e.id === k))
			);
			localStorage.setItem(STORE, JSON.stringify(keep));
		} catch {
			// private mode / storage blocked: the tick still shows until reload
		}
	}

	const items = $derived(
		events.map((e) => {
			const ended = Date.parse(e.endsAt) <= now;
			const live = !ended && Date.parse(e.startsAt) <= now;
			const done = ticks[e.id] ?? ended;
			return { ...e, done, live: live && !done };
		})
	);
	const doneCount = $derived(items.filter((i) => i.done).length);

	const headline = $derived(
		mine === true
			? `${childName} is with you`
			: mine === false
				? `${childName} is with ${withName ?? 'your co-parent'}`
				: 'Tonight isn’t set yet'
	);
	const kindLabel: Record<string, string> = {
		school: 'School',
		activity: 'Activity',
		medical: 'Medical',
		handover: 'Handover',
		other: 'Other'
	};
</script>

<section
	aria-label="Tonight and today"
	class="flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-gradient-to-br from-primary to-[oklch(0.42_0.08_185)] text-primary-foreground shadow-sm"
>
	<!-- Top: tonight (left) + briefing (top right) -->
	<div class="grid gap-4 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:items-start">
		<div class="flex items-start gap-4">
			<span
				class="grid size-12 shrink-0 place-items-center rounded-2xl bg-pebble text-2xl text-pebble-foreground"
				aria-hidden="true">{mine === null ? '🐢' : '🌙'}</span
			>
			<div class="min-w-0 space-y-1">
				<p class="text-xs font-medium tracking-wide uppercase opacity-90">Tonight</p>
				<p class="text-2xl leading-tight font-bold sm:text-3xl">{headline}</p>
				{#if custodyLine}<p class="text-sm opacity-90">{custodyLine}</p>{/if}
				{#if mine === null}
					<a
						href="/calendar"
						class="inline-block rounded-md text-sm font-medium underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-primary-foreground/60 focus-visible:outline-none"
						>Set up the custody schedule</a
					>
				{/if}
			</div>
		</div>
		<aside aria-label="Today's briefing" class="rounded-xl bg-black/15 p-4">
			<p class="mb-1 text-xs font-medium tracking-wide uppercase opacity-90">
				Today's briefing{#if source === 'ai'}<span> · AI</span>{/if}
			</p>
			<p class="text-sm leading-relaxed">{briefing}</p>
		</aside>
	</div>

	<!-- Today's activities: full width checklist -->
	<div class="flex-1 bg-card text-card-foreground">
		<div class="flex min-h-11 items-center gap-2 border-b px-5 py-2.5 sm:px-6">
			<h2 class="text-base font-semibold">Today's activities</h2>
			{#if items.length}
				<span class="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
					>{doneCount}/{items.length} done</span
				>
			{/if}
			<a
				href="/calendar"
				class="ml-auto rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				>Planner</a
			>
		</div>
		{#if items.length === 0}
			<p class="px-5 py-4 text-sm text-muted-foreground sm:px-6">A quiet day, nothing planned.</p>
		{:else}
			<ul class="divide-y">
				{#each items as item (item.id)}
					<li class="flex items-center gap-3 px-5 py-3 sm:px-6">
						<button
							type="button"
							aria-pressed={item.done}
							aria-label="{item.done ? 'Mark not done' : 'Mark done'}: {item.title}"
							onclick={() => toggle(item.id, item.done)}
							class="grid size-6 shrink-0 place-items-center rounded-full border-2 transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none {item.done
								? 'border-primary bg-primary text-primary-foreground'
								: item.live
									? 'border-primary bg-primary/10'
									: 'border-muted-foreground/40 hover:border-primary'}"
						>
							{#if item.done}<Check
									class="size-3.5"
									strokeWidth={3}
									aria-hidden="true"
								/>{:else if item.live}<span
									class="size-2 rounded-full bg-primary"
									aria-hidden="true"
								></span>{/if}
						</button>
						<span class="w-20 shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums"
							>{item.time}</span
						>
						<span class="min-w-0 flex-1">
							<span
								class="block truncate text-sm font-medium {item.done
									? 'text-muted-foreground line-through'
									: ''}">{item.title}</span
							>
							<span class="block truncate text-xs text-muted-foreground"
								>{kindLabel[item.kind] ?? item.kind}{item.place ? ` · ${item.place}` : ''}</span
							>
						</span>
						{#if item.live}
							<span
								class="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
								>Now</span
							>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>
