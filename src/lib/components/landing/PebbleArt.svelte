<script lang="ts">
	/**
	 * Pebble the turtle: original static SVG for the landing page.
	 * Temporary: swap to Member 2's Pebble.svelte (src/lib/components/kids/)
	 * once it is on main.
	 */
	let {
		class: className = '',
		bob = true,
		label = 'Pebble the turtle, smiling'
	}: { class?: string; bob?: boolean; label?: string } = $props();
</script>

<svg
	viewBox="0 0 220 220"
	class="{className} {bob ? 'pebble-bob' : ''}"
	role="img"
	aria-label={label}
>
	<!-- feet -->
	<ellipse cx="62" cy="182" rx="20" ry="13" fill="#8cc152" />
	<ellipse cx="158" cy="182" rx="20" ry="13" fill="#8cc152" />
	<!-- shell (dark green) with hexagons -->
	<path
		d="M110 92 C 58 92 34 128 34 160 C 34 182 54 192 110 192 C 166 192 186 182 186 160 C 186 128 162 92 110 92 Z"
		fill="#2f6b45"
	/>
	<g fill="#3f8a5c" stroke="#245236" stroke-width="2">
		<polygon points="52,140 62,128 76,128 82,140 76,152 62,152" />
		<polygon points="138,140 144,128 158,128 168,140 158,152 144,152" />
		<polygon points="46,168 54,158 66,158 72,168 66,178 54,178" />
		<polygon points="148,168 154,158 166,158 174,168 166,178 154,178" />
	</g>
	<!-- arms -->
	<ellipse cx="44" cy="142" rx="14" ry="20" fill="#8cc152" transform="rotate(25 44 142)" />
	<ellipse cx="176" cy="142" rx="14" ry="20" fill="#8cc152" transform="rotate(-25 176 142)" />
	<!-- cream belly -->
	<ellipse cx="110" cy="152" rx="44" ry="40" fill="#fff3d6" />
	<path
		d="M80 140 H140 M76 158 H144 M84 176 H136"
		stroke="#ead9b0"
		stroke-width="3"
		stroke-linecap="round"
	/>
	<!-- round lime head -->
	<circle cx="110" cy="74" r="50" fill="#a6d96a" />
	<circle cx="110" cy="74" r="50" fill="none" stroke="#8cc152" stroke-width="3" />
	<!-- blush -->
	<ellipse cx="78" cy="88" rx="10" ry="6" fill="#f7a8a0" opacity="0.85" />
	<ellipse cx="142" cy="88" rx="10" ry="6" fill="#f7a8a0" opacity="0.85" />
	<!-- eyes with highlight -->
	<circle cx="90" cy="70" r="9" fill="#1d2a24" />
	<circle cx="130" cy="70" r="9" fill="#1d2a24" />
	<circle cx="93" cy="66.5" r="3" fill="#ffffff" />
	<circle cx="133" cy="66.5" r="3" fill="#ffffff" />
	<!-- small "u" smile -->
	<path
		d="M101 89 Q110 98 119 89"
		fill="none"
		stroke="#1d2a24"
		stroke-width="3.5"
		stroke-linecap="round"
	/>
</svg>

<style>
	@keyframes pebble-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}
	.pebble-bob {
		animation: pebble-bob 4s ease-in-out infinite;
	}
	@media (prefers-reduced-motion: reduce) {
		.pebble-bob {
			animation: none;
		}
	}
</style>
