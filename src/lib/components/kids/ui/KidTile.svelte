<script lang="ts" module>
	export type KidAccent = 'mint' | 'sky' | 'sun' | 'peach' | 'lilac' | 'rose';
</script>

<script lang="ts">
	/**
	 * Big activity tile for the kids' home: an illustrated icon badge in the
	 * activity's colour, a title, a hint, and either "✓ Done" or a go-arrow.
	 * `feature` makes a taller tile with bubbles (used for the game).
	 */

	let {
		href,
		accent,
		icon,
		title,
		hint,
		done = false,
		feature = false,
		badge
	}: {
		href: string;
		accent: KidAccent;
		icon: string;
		title: string;
		hint: string;
		done?: boolean;
		feature?: boolean;
		/** Small corner label, e.g. "3/12". */
		badge?: string;
	} = $props();
</script>

<a {href} class="k-tile k-{accent} {feature ? 'k-tile--feature' : ''} {done ? 'is-done' : ''}">
	{#if feature}
		<span class="k-tile__bubbles" aria-hidden="true">
			<span></span><span></span><span></span>
		</span>
	{/if}
	<span class="k-tile__icon" aria-hidden="true">{icon}</span>
	<span class="k-tile__body">
		<span class="k-tile__title">{title}</span>
		<span class="k-tile__hint">{hint}</span>
	</span>
	{#if done}
		<span class="k-tile__done"><span aria-hidden="true">✓</span> Done</span>
	{:else}
		<span class="k-tile__go" aria-hidden="true">→</span>
	{/if}
	{#if badge}
		<span class="k-tile__badge">{badge}</span>
	{/if}
</a>

<style>
	.k-tile {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		gap: 1.1rem;
		min-height: 7rem;
		padding: 1.1rem 1.25rem;
		border-radius: 2rem;
		border: 2px solid color-mix(in oklch, var(--a-edge) 38%, transparent);
		background: linear-gradient(160deg, var(--kid-surface) 0%, var(--a-soft) 100%);
		color: var(--foreground);
		text-decoration: none;
		box-shadow:
			0 6px 0 color-mix(in oklch, var(--a-edge) 50%, transparent),
			var(--k-shadow);
		transition:
			transform 0.14s ease,
			box-shadow 0.14s ease;
		-webkit-tap-highlight-color: transparent;
	}
	.k-tile:hover {
		transform: translateY(-3px);
	}
	.k-tile:active {
		transform: translateY(4px);
		box-shadow:
			0 2px 0 color-mix(in oklch, var(--a-edge) 50%, transparent),
			var(--k-shadow);
	}
	.k-tile__icon {
		position: relative;
		z-index: 1;
		flex: none;
		display: grid;
		place-items: center;
		width: 4.75rem;
		height: 4.75rem;
		border-radius: 1.6rem;
		background: var(--a-solid);
		font-size: 2.6rem;
		line-height: 1;
		box-shadow:
			inset 0 -5px 0 color-mix(in oklch, var(--a-edge) 70%, transparent),
			inset 0 0 0 3px oklch(1 0 0 / 0.45);
		transform: rotate(-4deg);
		transition: transform 0.25s ease;
	}
	.k-tile:hover .k-tile__icon {
		transform: rotate(4deg) scale(1.06);
	}
	.k-tile__body {
		position: relative;
		z-index: 1;
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}
	.k-tile__title {
		font-size: 1.6rem;
		font-weight: 900;
		line-height: 1.12;
		letter-spacing: -0.01em;
	}
	.k-tile__hint {
		font-size: 1.12rem;
		font-weight: 650;
		color: var(--muted-foreground);
	}
	.k-tile__go {
		position: relative;
		z-index: 1;
		flex: none;
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border-radius: 999px;
		background: var(--a-solid);
		color: var(--a-deep);
		font-size: 1.5rem;
		font-weight: 900;
		box-shadow: 0 3px 0 var(--a-edge);
		transition: transform 0.2s ease;
	}
	.k-tile:hover .k-tile__go {
		transform: translateX(3px);
	}
	.k-tile__done {
		position: relative;
		z-index: 1;
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.9rem;
		border-radius: 999px;
		background: var(--k-mint-solid);
		color: var(--k-mint-deep);
		font-size: 1.1rem;
		font-weight: 900;
		box-shadow: 0 3px 0 var(--k-mint-edge);
	}
	.is-done .k-tile__icon {
		filter: saturate(0.85);
	}
	.k-tile__badge {
		position: absolute;
		top: 0.7rem;
		right: 0.9rem;
		z-index: 1;
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		background: oklch(1 0 0 / 0.8);
		color: var(--a-deep);
		font-size: 0.95rem;
		font-weight: 900;
	}

	/* feature tile: taller, with rising bubbles */
	.k-tile--feature {
		min-height: 9.5rem;
		background:
			radial-gradient(
				18rem 10rem at 100% 100%,
				color-mix(in oklch, var(--a-solid) 45%, transparent),
				transparent 70%
			),
			linear-gradient(160deg, var(--kid-surface) 0%, var(--a-soft) 100%);
	}
	.k-tile--feature .k-tile__icon {
		width: 5.5rem;
		height: 5.5rem;
		font-size: 3.1rem;
	}
	.k-tile--feature .k-tile__title {
		font-size: 1.85rem;
	}
	.k-tile__bubbles span {
		position: absolute;
		bottom: -1.5rem;
		border-radius: 999px;
		border: 2px solid oklch(1 0 0 / 0.7);
		background: oklch(1 0 0 / 0.25);
		animation: bubble 7s ease-in infinite;
	}
	.k-tile__bubbles span:nth-child(1) {
		right: 18%;
		width: 1.1rem;
		height: 1.1rem;
	}
	.k-tile__bubbles span:nth-child(2) {
		right: 30%;
		width: 0.7rem;
		height: 0.7rem;
		animation-delay: 2.4s;
	}
	.k-tile__bubbles span:nth-child(3) {
		right: 9%;
		width: 0.85rem;
		height: 0.85rem;
		animation-delay: 4.6s;
	}
	@keyframes bubble {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		100% {
			transform: translateY(-11rem);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.k-tile,
		.k-tile__icon,
		.k-tile__go {
			transition: none;
		}
		.k-tile:hover,
		.k-tile:active,
		.k-tile:hover .k-tile__icon,
		.k-tile:hover .k-tile__go {
			transform: none;
		}
		.k-tile__icon {
			transform: rotate(-4deg);
		}
		.k-tile__bubbles {
			display: none;
		}
	}
</style>
