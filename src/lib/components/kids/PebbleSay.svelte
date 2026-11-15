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
		class="relative rounded-[1.75rem] border-[3px] border-white bg-[var(--kid-surface)] px-6 py-5 text-[1.45rem] leading-snug font-bold shadow-[0_5px_0_oklch(0.86_0.035_205),var(--k-shadow)]"
	>
		{#key text}
			<p aria-live="polite" class="k-rise">{text}</p>
		{/key}
		{#if canSpeak}
			<button
				type="button"
				onclick={speaking ? stop : readAloud}
				aria-pressed={speaking}
				class="k-btn k-btn--sm k-sky mt-4"
			>
				<span aria-hidden="true">{speaking ? '⏹️' : '🔊'}</span>
				{speaking ? 'Stop' : 'Read to me'}
			</button>
		{/if}
		<!-- tail pointing down toward Pebble -->
		<span
			aria-hidden="true"
			class="absolute -bottom-[13px] left-14 size-6 rotate-45 rounded-br-md border-r-[3px] border-b-[3px] border-white bg-[var(--kid-surface)] shadow-[4px_4px_0_oklch(0.86_0.035_205)]"
		></span>
	</div>
</div>
