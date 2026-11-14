<script lang="ts">
	/**
	 * Framed browser-window mockup. Shows the screenshot when `available`
	 * (content.ts → screenshots), otherwise a tasteful labelled placeholder.
	 */
	let {
		src,
		alt,
		available,
		url = 'teamkid.app',
		class: className = ''
	}: { src: string; alt: string; available: boolean; url?: string; class?: string } = $props();
</script>

<figure
	class="overflow-hidden rounded-[24px] border border-(--mk-line) bg-(--mk-white) shadow-[0_24px_60px_-30px_rgb(15_58_48/0.45)] {className}"
>
	<div
		class="flex items-center gap-3 border-b border-(--mk-line) bg-(--mk-cream) px-4 py-2.5"
		aria-hidden="true"
	>
		<span class="flex gap-1.5">
			<span class="size-3 rounded-full bg-[#f08f7f]"></span>
			<span class="size-3 rounded-full bg-[#f4c66b]"></span>
			<span class="size-3 rounded-full bg-[#86c98f]"></span>
		</span>
		<span
			class="flex-1 truncate rounded-full bg-(--mk-white) px-3 py-0.5 text-center text-xs text-(--mk-muted)"
			>{url}</span
		>
	</div>
	{#if available}
		<img
			{src}
			{alt}
			width="1440"
			height="900"
			loading="lazy"
			decoding="async"
			class="block h-auto w-full"
		/>
	{:else}
		<div
			class="flex aspect-[16/10] flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(135deg,var(--mk-mint)_0_14px,var(--mk-cream)_14px_28px)] p-6 text-center"
		>
			<p
				class="rounded-full bg-(--mk-white) px-4 py-1.5 text-sm font-semibold text-(--mk-ink) shadow-sm"
			>
				Screenshot coming soon
			</p>
			<p class="text-sm text-(--mk-muted)">{alt}</p>
		</div>
	{/if}
</figure>
