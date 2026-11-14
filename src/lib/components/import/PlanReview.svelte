<script lang="ts">
	/**
	 * Review screen for an extracted parenting plan. Every field is editable;
	 * nothing reaches the calendar until the parent presses Apply.
	 */
	import { untrack } from 'svelte';
	import type { PlanExtraction } from '#lib/server/ai/planExtract.js';
	import type { Home } from '#lib/types/domain.js';
	import { PATTERN_TEMPLATES, type PatternTemplate } from '#lib/custody/pattern.js';
	import { planNights } from '#lib/custody/planSchedule.js';
	import { TEMPLATE_LABEL } from '#lib/custody/schedule.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import ConfidenceBadge from './ConfidenceBadge.svelte';
	import HolidayList from './HolidayList.svelte';
	import SourceQuote from './SourceQuote.svelte';
	import type { ApplyValues } from './types.js';

	let {
		extraction,
		lowConfidence,
		guessedHome,
		homes,
		myHome,
		today,
		hasSchedule,
		applying,
		applyError,
		onApply,
		onStartOver
	}: {
		extraction: PlanExtraction;
		lowConfidence: boolean;
		guessedHome: Home | null;
		homes: { home: Home; name: string }[];
		myHome: Home | null;
		today: string;
		hasSchedule: boolean;
		applying: boolean;
		applyError: string | null;
		onApply: (values: ApplyValues) => void;
		onStartOver: () => void;
	} = $props();

	// Editable copies of the AI's answer, filled once (the page mounts a new
	// review for every extraction); the props stay the untouched originals.
	const initial = untrack(() => ({
		template: extraction.template as string,
		startDate: extraction.startDate ?? '',
		firstHome: (guessedHome ?? '') as string,
		exchangeTime: extraction.exchangeTime ?? '',
		exchangePlace: extraction.exchangePlace ?? ''
	}));
	let template = $state(initial.template);
	let startDate = $state(initial.startDate);
	let firstHome = $state(initial.firstHome);
	let exchangeTime = $state(initial.exchangeTime);
	let exchangePlace = $state(initial.exchangePlace);

	const supported = $derived((PATTERN_TEMPLATES as readonly string[]).includes(template));
	const complete = $derived(
		supported &&
			/^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
			(firstHome === 'A' || firstHome === 'B') &&
			/^\d{2}:\d{2}$/.test(exchangeTime)
	);
	const nameOf = (home: string) => homes.find((h) => h.home === home)?.name ?? `Home ${home}`;

	/** The next 14 nights from today (or from the plan start, if later). */
	const preview = $derived.by(() => {
		if (!complete) return [];
		try {
			const { nights } = planNights(
				template as PatternTemplate,
				startDate,
				firstHome as Home,
				today,
				14
			);
			const from = startDate > today ? startDate : today;
			return nights.filter((n) => n.date >= from).slice(0, 14);
		} catch {
			return [];
		}
	});
	const dayFmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
		new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(
			new Date(`${date}T12:00:00Z`)
		);
	const time12 = $derived(
		/^\d{2}:\d{2}$/.test(exchangeTime)
			? new Intl.DateTimeFormat('en-US', {
					hour: 'numeric',
					minute: '2-digit',
					timeZone: 'UTC'
				}).format(new Date(`2000-01-01T${exchangeTime}:00Z`))
			: null
	);

	const selectClass =
		'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!complete || applying) return;
		onApply({
			template: template as PatternTemplate,
			startDate,
			firstHome: firstHome as Home,
			exchangeTime,
			exchangePlace: exchangePlace.trim() || null,
			holidays: extraction.holidays.map((h) => ({ name: h.name, rule: h.rule }))
		});
	}
</script>

<form onsubmit={submit} class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" novalidate>
	<div class="space-y-5">
		{#if lowConfidence}
			<div role="alert" class="rounded-lg border border-pebble bg-pebble/20 p-3 text-sm">
				<p class="font-medium">We couldn't read this plan clearly.</p>
				<p>
					Fill in the fields below yourself, or
					<a class="underline" href="/calendar">set up the schedule manually on the Calendar</a>.
				</p>
			</div>
		{/if}
		{#if !supported}
			<div role="alert" class="rounded-lg border border-pebble bg-pebble/20 p-3 text-sm">
				<p class="font-medium">This schedule type can't be set up automatically yet.</p>
				<p>
					Pick the closest template below if one fits, or
					<a class="underline" href="/calendar">set up the schedule manually on the Calendar</a>.
				</p>
			</div>
		{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title>Regular schedule</Card.Title>
				<Card.Description
					>Check each field against your plan and correct anything that's off.</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-5">
				<div class="space-y-1.5">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<Label for="pr-template">Schedule</Label>
						<ConfidenceBadge
							value={extraction.confidence.template}
							found={extraction.template !== 'custom'}
						/>
					</div>
					<select id="pr-template" class={selectClass} bind:value={template}>
						{#each PATTERN_TEMPLATES as t (t)}<option value={t}>{TEMPLATE_LABEL[t]}</option>{/each}
						<option value="custom">Other (set up manually)</option>
					</select>
					<SourceQuote quote={extraction.templateQuote} />
				</div>

				<div class="grid gap-5 md:grid-cols-2">
					<div class="space-y-1.5">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<Label for="pr-start">Start date</Label>
							<ConfidenceBadge
								value={extraction.confidence.startDate}
								found={!!extraction.startDate}
							/>
						</div>
						<Input id="pr-start" type="date" bind:value={startDate} required />
						<SourceQuote quote={extraction.startDateQuote} />
					</div>

					<div class="space-y-1.5">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<Label for="pr-first">Who has the first night</Label>
							<!-- Matching "Mother" to a family member is our guess: always ask to check. -->
							<ConfidenceBadge
								value={guessedHome ? 0.6 : 0.3}
								found={!!extraction.firstParentLabel}
							/>
						</div>
						<select id="pr-first" class={selectClass} bind:value={firstHome} required>
							<option value="" disabled>Choose a parent…</option>
							{#each homes as h (h.home)}<option value={h.home}>{h.name}</option>{/each}
						</select>
						{#if extraction.firstParentLabel}
							<p class="text-xs text-muted-foreground">
								The plan says: “{extraction.firstParentLabel}”{guessedHome
									? ''
									: '. Choose which of you that is.'}
							</p>
						{/if}
						<SourceQuote quote={extraction.firstParentQuote} />
					</div>
				</div>

				<div class="grid gap-5 md:grid-cols-2">
					<div class="space-y-1.5">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<Label for="pr-time">Exchange time</Label>
							<ConfidenceBadge
								value={extraction.confidence.exchange}
								found={!!extraction.exchangeTime}
							/>
						</div>
						<Input id="pr-time" type="time" bind:value={exchangeTime} required />
					</div>
					<div class="space-y-1.5">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<Label for="pr-place">Exchange place</Label>
							<ConfidenceBadge
								value={extraction.confidence.exchange}
								found={!!extraction.exchangePlace}
							/>
						</div>
						<Input id="pr-place" maxlength={120} bind:value={exchangePlace} />
					</div>
				</div>
				<SourceQuote quote={extraction.exchangeQuote} />
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Holidays and special days</Card.Title>
			</Card.Header>
			<Card.Content>
				<HolidayList holidays={extraction.holidays} />
			</Card.Content>
		</Card.Root>

		{#if extraction.warnings.length}
			<Card.Root>
				<Card.Header>
					<Card.Title>Not applied automatically</Card.Title>
					<Card.Description>
						Parts of the plan the calendar can't follow on its own. Keep them in mind.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<ul class="list-disc space-y-1 pl-5 text-sm">
						{#each extraction.warnings as w, i (i)}<li>{w}</li>{/each}
					</ul>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<div class="space-y-5">
		<Card.Root>
			<Card.Header>
				<Card.Title>Next 14 nights</Card.Title>
				<Card.Description>
					{#if time12}Exchanges at {time12}{exchangePlace ? `, ${exchangePlace}` : ''}.{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if preview.length === 0}
					<p class="text-sm text-muted-foreground">
						Fill in the schedule, start date, first parent and exchange time to see a preview.
					</p>
				{:else}
					<ol class="grid grid-cols-2 gap-1.5" aria-label="Preview of the next 14 nights">
						{#each preview as n (n.date)}
							{@const mine = n.home === myHome}
							<li
								class="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs {mine
									? 'border-primary/40 bg-primary/15'
									: 'border-pebble bg-pebble/40 text-pebble-foreground'}"
							>
								<span
									>{dayFmt(n.date, { weekday: 'short' })}
									{dayFmt(n.date, { month: 'short', day: 'numeric' })}</span
								>
								<span class="font-medium">{nameOf(n.home)}</span>
							</li>
						{/each}
					</ol>
				{/if}
			</Card.Content>
		</Card.Root>

		<div class="space-y-3 rounded-lg border bg-card p-4">
			<p class="text-xs text-muted-foreground">
				<strong class="text-foreground">AI can make mistakes.</strong> Check this against your court order.
				This isn't legal advice.
			</p>
			<p class="text-xs text-muted-foreground">
				{hasSchedule
					? 'Applying replaces your custody nights from today on. Past nights stay as they are.'
					: 'Applying adds custody nights for the next 12 months.'}
			</p>
			{#if applyError}<p role="alert" class="text-sm text-destructive">{applyError}</p>{/if}
			<div class="flex flex-wrap gap-2">
				<Button type="submit" disabled={!complete || applying}>
					{applying ? 'Applying…' : 'Apply to calendar'}
				</Button>
				<Button type="button" variant="outline" onclick={onStartOver} disabled={applying}>
					Upload another file
				</Button>
			</div>
		</div>
	</div>
</form>
