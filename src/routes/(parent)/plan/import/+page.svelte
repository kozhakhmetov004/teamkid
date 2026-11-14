<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { PlanExtraction } from '#lib/server/ai/planExtract.js';
	import { guessHome } from '#lib/components/import/guessHome.js';
	import PlanReview from '#lib/components/import/PlanReview.svelte';
	import type { ApplyValues } from '#lib/components/import/types.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { getSupabaseBrowserClient } from '#lib/supabase.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Step =
		| { kind: 'pick' }
		| { kind: 'uploading' }
		| { kind: 'reading'; documentId: string }
		| { kind: 'read_error'; documentId: string; message: string }
		| { kind: 'review'; documentId: string; extraction: PlanExtraction; lowConfidence: boolean };

	let step = $state<Step>({ kind: 'pick' });
	let fileError = $state<string | null>(null);
	let applying = $state(false);
	let applyError = $state<string | null>(null);
	let seconds = $state(0);
	let fileInput = $state<HTMLInputElement | null>(null);

	const MAX_BYTES = 10 * 1024 * 1024;

	// Apply uses the browser's time zone (cookie), like /calendar and /dashboard.
	onMount(() => {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (tz && tz !== data.tz) {
			document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
			void invalidate('app:plan-import');
		}
	});

	// Elapsed time while the AI reads the plan.
	$effect(() => {
		if (step.kind !== 'reading') return;
		seconds = 0;
		const timer = setInterval(() => (seconds += 1), 1000);
		return () => clearInterval(timer);
	});

	/** Fast checks before uploading; the server checks again (and counts pages). */
	async function precheck(file: File): Promise<string | null> {
		if (!(file.type === 'application/pdf' || /\.pdf$/i.test(file.name))) {
			return 'Choose a PDF file. Photos and Word files can’t be imported.';
		}
		if (file.size === 0) return 'This file is empty.';
		if (file.size > MAX_BYTES) return 'This file is larger than 10 MB.';
		const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
		if (String.fromCharCode(...head) !== '%PDF-') {
			return 'This file isn’t a valid PDF. Try exporting it again as a PDF.';
		}
		return null;
	}

	async function postJson(path: string, body: unknown, timeoutMs = 20_000) {
		const res = await fetch(path, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(timeoutMs)
		});
		return { status: res.status, body: await res.json().catch(() => ({})) };
	}

	async function onFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		fileError = await precheck(file);
		if (fileError) return;

		step = { kind: 'uploading' };
		try {
			// Straight to Storage: a server function can't take a 10 MB body on Vercel.
			const path = `${data.familyId}/${crypto.randomUUID()}.pdf`;
			const { error } = await getSupabaseBrowserClient()
				.storage.from('documents')
				.upload(path, file, { contentType: 'application/pdf', upsert: false });
			if (error) throw new Error('upload');

			const reg = await postJson('/api/documents/register-plan', { path, fileName: file.name });
			if (reg.status !== 200) {
				fileError =
					reg.body?.message ??
					(reg.status === 429
						? 'Too many uploads in the last hour. Please try again later.'
						: 'We couldn’t save this file. Please try again.');
				step = { kind: 'pick' };
				return;
			}
			await read(reg.body.documentId);
		} catch {
			fileError = 'The upload didn’t go through. Check your connection and try again.';
			step = { kind: 'pick' };
		}
	}

	async function read(documentId: string) {
		step = { kind: 'reading', documentId };
		try {
			// The server gives the AI 45 s and the function 60 s.
			const res = await postJson('/api/documents/parse-plan', { documentId }, 70_000);
			if (res.status === 200) {
				step = {
					kind: 'review',
					documentId,
					extraction: res.body.extraction,
					lowConfidence: res.body.lowConfidence
				};
				return;
			}
			step = {
				kind: 'read_error',
				documentId,
				message:
					res.status === 429
						? 'You’ve read several plans in the last hour. Try again later, or set up the schedule manually.'
						: 'The AI couldn’t read your plan right now.'
			};
		} catch {
			step = { kind: 'read_error', documentId, message: 'Reading the plan took too long.' };
		}
	}

	const APPLY_ERROR: Record<string, string> = {
		manual_setup: 'This schedule type has to be set up manually on the Calendar.',
		start_out_of_range: 'The start date must be no more than a year from today.',
		not_parsed: 'Please read the plan again before applying it.',
		rate_limited: 'Too many changes in the last hour. Please try again later.',
		invalid_body: 'Please check the highlighted fields.'
	};

	async function apply(values: ApplyValues) {
		if (step.kind !== 'review') return;
		applying = true;
		applyError = null;
		try {
			const res = await postJson('/api/documents/apply-plan', {
				documentId: step.documentId,
				...values
			});
			if (res.status === 200) {
				await goto('/calendar');
				toast.success('Calendar updated from your parenting plan');
				return;
			}
			applyError =
				APPLY_ERROR[res.body?.error] ?? 'We couldn’t update the calendar. Please try again.';
		} catch {
			applyError = 'We couldn’t update the calendar. Please try again.';
		} finally {
			applying = false;
		}
	}

	function startOver() {
		step = { kind: 'pick' };
		fileError = null;
		applyError = null;
	}
</script>

<svelte:head><title>Import your parenting plan · TeamKid</title></svelte:head>

<div class="space-y-5">
	<div>
		<a href="/plan" class="text-sm text-muted-foreground hover:underline">← Plan</a>
		<h1 class="text-2xl font-bold">Import your parenting plan</h1>
		<p class="text-muted-foreground">
			Upload your plan, check what we found, then add the custody schedule to your calendar.
		</p>
	</div>

	{#if step.kind === 'pick' || step.kind === 'uploading'}
		<Card.Root class="max-w-2xl">
			<Card.Header>
				<Card.Title>1. Upload the plan</Card.Title>
				<Card.Description>
					A PDF up to 10 MB and 30 pages. It's stored privately for your family; nothing changes on
					your calendar until you review it and press Apply.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				<input
					bind:this={fileInput}
					id="plan-file"
					type="file"
					accept="application/pdf,.pdf"
					class="sr-only"
					onchange={onFile}
					disabled={step.kind === 'uploading'}
				/>
				<Button onclick={() => fileInput?.click()} disabled={step.kind === 'uploading'}>
					{step.kind === 'uploading' ? 'Uploading…' : 'Choose PDF'}
				</Button>
				{#if fileError}<p role="alert" class="text-sm text-destructive">{fileError}</p>{/if}
				<p class="text-xs text-muted-foreground">
					No plan at hand? <a class="underline" href="/demo/parenting-plan-carter.pdf" download
						>Download the sample plan</a
					> (fictional).
				</p>
			</Card.Content>
		</Card.Root>
	{:else if step.kind === 'reading'}
		<Card.Root class="max-w-2xl">
			<Card.Content class="py-8 text-center" aria-live="polite">
				<p class="text-lg font-medium">Reading your plan…</p>
				<p class="text-sm text-muted-foreground">
					This usually takes 10 to 30 seconds. <span class="tabular-nums">({seconds} s)</span>
				</p>
			</Card.Content>
		</Card.Root>
	{:else if step.kind === 'read_error'}
		<Card.Root class="max-w-2xl" role="alert">
			<Card.Header>
				<Card.Title>We couldn't read the plan</Card.Title>
				<Card.Description>
					{step.message} Your file is saved; you can try again or set the schedule up yourself.
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				<Button onclick={() => step.kind === 'read_error' && read(step.documentId)}
					>Try again</Button
				>
				<Button variant="outline" href="/calendar">Set up manually</Button>
				<Button variant="ghost" onclick={startOver}>Upload another file</Button>
			</Card.Content>
		</Card.Root>
	{:else if step.kind === 'review'}
		{#key step.documentId}
			<PlanReview
				extraction={step.extraction}
				lowConfidence={step.lowConfidence}
				guessedHome={guessHome(step.extraction.firstParentLabel, data.parentsForGuess)}
				homes={data.homes}
				myHome={data.myHome}
				today={data.today}
				hasSchedule={data.hasSchedule}
				{applying}
				{applyError}
				onApply={apply}
				onStartOver={startOver}
			/>
		{/key}
	{/if}
</div>
