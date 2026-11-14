<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import ToneCheckDialog from './ToneCheckDialog.svelte';
	import { checkTone } from './toneCheck.js';

	/**
	 * Message composer with a tone check before sending.
	 * Without JavaScript the form posts straight to ?/send (no tone check).
	 * With JavaScript: Send -> POST /api/ai/rewrite (8 s max) -> send as is, or
	 * offer the calmer version. AI failures never block sending.
	 */
	let { threadId }: { threadId: string } = $props();

	let formEl: HTMLFormElement;
	let body = $state('');
	let aiRewritten = $state(false);
	let phase = $state<'idle' | 'checking' | 'sending'>('idle');
	let note = $state<string | null>(null);
	let dialogOpen = $state(false);
	let draft = $state('');
	let suggestion = $state('');
	let suggestionNotes = $state<string[]>([]);
	let skipCheck = false;

	async function send(text: string, rewritten: boolean) {
		body = text;
		aiRewritten = rewritten;
		skipCheck = true;
		await tick();
		formEl.requestSubmit();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			if (phase === 'idle' && body.trim()) formEl.requestSubmit();
		}
	}
</script>

<form
	bind:this={formEl}
	method="POST"
	action="?/send"
	class="space-y-2"
	use:enhance={({ formData, cancel }) => {
		if (!skipCheck) {
			cancel();
			const text = String(formData.get('body') ?? '').trim();
			if (!text || phase !== 'idle') return;
			phase = 'checking';
			note = null;
			void checkTone(text, { threadId }).then((result) => {
				phase = 'idle';
				if (result.status === 'unavailable') {
					note =
						result.reason === 'rate_limited'
							? 'Tone check is busy right now, so your message was sent as written.'
							: "Couldn't check tone right now, so your message was sent as written.";
					void send(text, false);
				} else if (!result.changed) {
					void send(text, false);
				} else {
					draft = text;
					suggestion = result.rewritten;
					suggestionNotes = result.notes;
					dialogOpen = true;
				}
			});
			return;
		}
		skipCheck = false;
		phase = 'sending';
		return async ({ result, update }) => {
			phase = 'idle';
			if (result.type === 'success') {
				body = '';
				aiRewritten = false;
				await update({ reset: false });
			} else if (result.type === 'failure') {
				toast.error(String(result.data?.message ?? 'Could not send the message.'));
			} else {
				await update({ reset: false });
			}
		};
	}}
>
	<input type="hidden" name="aiRewritten" value={aiRewritten ? 'true' : 'false'} />
	<label for="composer" class="sr-only">Message</label>
	<textarea
		id="composer"
		name="body"
		bind:value={body}
		onkeydown={onKeydown}
		rows="3"
		maxlength="4000"
		required
		placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
		class="w-full resize-y rounded-xl border border-input bg-background p-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
	></textarea>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<p class="text-xs text-muted-foreground" role="status" aria-live="polite">
			{#if phase === 'checking'}Checking tone…{:else if phase === 'sending'}Sending…{:else if note}{note}{:else}Messages
				can't be edited or deleted after sending.{/if}
		</p>
		<Button type="submit" disabled={phase !== 'idle' || body.trim() === ''}>
			{phase === 'checking' ? 'Checking tone…' : phase === 'sending' ? 'Sending…' : 'Send'}
		</Button>
	</div>
</form>

<ToneCheckDialog
	bind:open={dialogOpen}
	{draft}
	{suggestion}
	notes={suggestionNotes}
	onSendCalm={(text) => {
		dialogOpen = false;
		void send(text, true);
	}}
	onSendMine={() => {
		dialogOpen = false;
		void send(draft, false);
	}}
	onEdit={() => {
		dialogOpen = false;
		body = draft;
		tick().then(() => document.getElementById('composer')?.focus());
	}}
/>
