<script lang="ts">
	import '@fontsource-variable/nunito';
	import MarketingFooter from '#lib/components/landing/MarketingFooter.svelte';
	import MarketingHeader from '#lib/components/landing/MarketingHeader.svelte';
	import { homePathFor } from '#lib/types/domain.js';
	import type { LayoutProps } from './$types';

	/**
	 * Public marketing pages (/, /privacy, /terms). Nests inside the root
	 * layout (unchanged). Marketing colours are scoped to `.marketing` here,
	 * on top of the app tokens in src/routes/layout.css.
	 * Brand type: headings, the wordmark and big numbers use Nunito, the same
	 * rounded font as the kids' space; body text stays Geist like the parent app.
	 */
	let { data, children }: LayoutProps = $props();
	const homePath = $derived(homePathFor(data.member));
</script>

<div class="marketing min-h-dvh bg-(--mk-cream) text-(--mk-text)">
	<a
		href="#main"
		class="sr-only z-50 rounded-full bg-(--mk-ink) px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
		>Skip to content</a
	>
	<MarketingHeader signedIn={data.signedIn} {homePath} />
	<main id="main" tabindex="-1" class="focus:outline-none">
		{@render children()}
	</main>
	<MarketingFooter />
</div>

<style>
	/* Marketing palette (AA contrast checked for every text/background pair used). */
	.marketing {
		--mk-cream: #fbf7ef;
		--mk-white: #ffffff;
		--mk-mint: #e7f4ec;
		--mk-mint-strong: #cfe9da;
		--mk-line: #e3ddd0;
		--mk-ink: #0f3a30; /* headings / dark band: 12.6:1 on cream */
		--mk-on-ink: #d6e8e0; /* text on ink: 10:1 */
		--mk-text: #263a33; /* body: 11:1 on cream */
		--mk-muted: #4a5d56; /* secondary: 6.6:1 on cream, 6.2:1 on mint */
		--mk-green: #1c6b5c; /* buttons: white text 6.3:1 */
		--mk-green-hover: #155447;
		--mk-peach: #ffe3d2;
		--mk-peach-strong: #f2b28c;
		--mk-amber-text: #7a3a12; /* on peach: 7.4:1 */
		font-size: 18px;
		line-height: 1.6;
		scroll-behavior: smooth;
	}
	@media (prefers-reduced-motion: reduce) {
		.marketing {
			scroll-behavior: auto;
		}
	}
	.marketing :global(:is(h1, h2, h3, .mk-display)) {
		font-family: 'Nunito Variable', ui-rounded, system-ui, sans-serif;
	}
	.marketing :global(section[id]) {
		scroll-margin-top: 5rem;
	}
	.marketing :global(.mk-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: 2.75rem;
		border-radius: 9999px;
		padding: 0.6rem 1.25rem;
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.2;
		transition:
			background-color 0.2s,
			box-shadow 0.2s,
			transform 0.2s;
	}
	.marketing :global(.mk-btn:focus-visible) {
		outline: 3px solid color-mix(in oklab, var(--mk-green) 45%, transparent);
		outline-offset: 2px;
	}
	.marketing :global(.mk-btn-primary) {
		background: var(--mk-green);
		color: #fff;
		box-shadow: 0 6px 16px -8px rgb(15 58 48 / 0.6);
	}
	.marketing :global(.mk-btn-primary:hover) {
		background: var(--mk-green-hover);
	}
	.marketing :global(.mk-btn-ghost) {
		color: var(--mk-ink);
	}
	.marketing :global(.mk-btn-ghost:hover) {
		background: var(--mk-mint);
	}
	.marketing :global(.mk-btn-outline) {
		color: var(--mk-ink);
		border: 2px solid var(--mk-ink);
		background: transparent;
	}
	.marketing :global(.mk-btn-outline:hover) {
		background: var(--mk-mint);
	}
	.marketing :global(.mk-btn-lg) {
		min-height: 3.25rem;
		padding: 0.8rem 1.6rem;
		font-size: 1.0625rem;
	}
	/* use:reveal */
	.marketing :global([data-reveal]) {
		transition:
			opacity 0.7s ease,
			transform 0.7s ease;
	}
	.marketing :global(.reveal-hidden) {
		opacity: 0;
		transform: translateY(18px);
	}
	@media (prefers-reduced-motion: reduce) {
		.marketing :global(.reveal-hidden) {
			opacity: 1;
			transform: none;
		}
	}
</style>
