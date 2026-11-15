<script lang="ts">
	/**
	 * A one-time burst of confetti and stars when something is finished.
	 * Decorative only (aria-hidden); hidden entirely with prefers-reduced-motion.
	 * Place inside a `relative` container.
	 */
	const COLORS = [
		'var(--k-sun-solid)',
		'var(--k-mint-solid)',
		'var(--k-sky-solid)',
		'var(--k-peach-solid)',
		'var(--k-lilac-solid)',
		'var(--k-rose-solid)'
	];
	// deterministic spread (no Math.random, so server and browser agree)
	const pieces = Array.from({ length: 22 }, (_, i) => {
		const angle = (i / 22) * Math.PI * 2 + (i % 3) * 0.2;
		const dist = 7 + (i % 4) * 2.2;
		return {
			x: Math.cos(angle) * dist,
			y: Math.sin(angle) * dist * 0.7 - 2,
			rot: (i * 47) % 360,
			color: COLORS[i % COLORS.length],
			round: i % 3 === 0,
			delay: (i % 5) * 0.03
		};
	});
</script>

<div class="burst" aria-hidden="true">
	{#each pieces as p, i (i)}
		<span
			class:round={p.round}
			style="--x:{p.x}rem; --y:{p.y}rem; --r:{p.rot}deg; background:{p.color}; animation-delay:{p.delay}s"
		></span>
	{/each}
</div>

<style>
	.burst {
		pointer-events: none;
		position: absolute;
		left: 50%;
		top: 2rem;
		width: 0;
		height: 0;
	}
	span {
		position: absolute;
		width: 0.7rem;
		height: 1rem;
		border-radius: 0.2rem;
		opacity: 0;
		animation: fly 1.4s cubic-bezier(0.15, 0.7, 0.3, 1) forwards;
	}
	span.round {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 999px;
	}
	@keyframes fly {
		0% {
			opacity: 1;
			transform: translate(0, 0) rotate(0deg) scale(0.6);
		}
		70% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(var(--x), calc(var(--y) + 3rem)) rotate(var(--r)) scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.burst {
			display: none;
		}
	}
</style>
