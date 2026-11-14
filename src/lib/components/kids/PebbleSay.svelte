<script lang="ts">
	/**
	 * Pebble's speech bubble. Optional "Read to me" uses the browser's own
	 * speechSynthesis (no network); the button is hidden when unsupported.
	 */
	import { onMount } from 'svelte';

	let { text, class: className = '' }: { text: string; class?: string } = $props();

	let canSpeak = $state(false);
	let speaking = $state(false);

	onMount(() => {
		canSpeak = 'speechSynthesis' in window;
		return () => {
			if (canSpeak) window.speechSynthesis.cancel();
		};
	});

	function readAloud() {
		if (!canSpeak) return;
		const synth = window.speechSynthesis;
		synth.cancel();
		const u = new SpeechSynthesisUtterance(text);
		u.rate = 0.9;
		u.pitch = 1.15;
		u.onend = () => (speaking = false);
		u.onerror = () => (speaking = false);
		speaking = true;
		synth.speak(u);
	}

	function stop() {
		if (canSpeak) window.speechSynthesis.cancel();
		speaking = false;
	}
</script>

<div class="relative {className}">
	<div
		class="relative rounded-[2rem] border-2 border-primary/20 bg-kid-surface px-7 py-6 text-2xl leading-snug font-semibold shadow-sm"
	>
		<p aria-live="polite">{text}</p>
		{#if canSpeak}
			<button
				type="button"
				onclick={speaking ? stop : readAloud}
				class="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-secondary px-5 text-lg font-semibold text-secondary-foreground transition hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
			>
				<span aria-hidden="true">{speaking ? '⏹️' : '🔊'}</span>
				{speaking ? 'Stop' : 'Read to me'}
			</button>
		{/if}
		<!-- tail pointing down toward Pebble -->
		<span
			aria-hidden="true"
			class="absolute -bottom-3 left-16 size-6 rotate-45 border-r-2 border-b-2 border-primary/20 bg-kid-surface"
		></span>
	</div>
</div>
