<script lang="ts">
	/**
	 * Pebble the turtle: static SVG for the landing page and the first paint of
	 * Pebble3D. Same character as the 3D model (src/lib/components/pebble/shapes.ts):
	 * standing, orange star bandana, waving.
	 */
	import { DEFAULT_SHELL, type ShellPalette } from '#lib/components/pebble/shell.js';

	let {
		class: className = '',
		bob = true,
		label = 'Pebble the turtle, smiling',
		decorative = false,
		shell = DEFAULT_SHELL
	}: {
		class?: string;
		bob?: boolean;
		label?: string;
		/** Hide from assistive tech (e.g. inside Pebble3D, whose wrapper carries the label). */
		decorative?: boolean;
		/** Shell colours (the kids' chosen shell colour); default green. */
		shell?: ShellPalette;
	} = $props();
</script>

<svg
	viewBox="0 0 220 220"
	class="{className} {bob ? 'pebble-bob' : ''}"
	role={decorative ? undefined : 'img'}
	aria-label={decorative ? undefined : label}
	aria-hidden={decorative ? 'true' : undefined}
>
	<g stroke="#1f3318" stroke-width="2.5" stroke-linejoin="round">
		<!-- ground shadow -->
		<ellipse cx="110" cy="207" rx="52" ry="7" fill="#0f3a30" opacity="0.12" stroke="none" />
		<!-- shell behind the body: light rim, dark seams, plates peeking out -->
		<ellipse cx="110" cy="146" rx="70" ry="60" fill={shell.rim} />
		<ellipse cx="110" cy="146" rx="62" ry="54" fill={shell.seam} stroke="none" />
		<g fill={shell.plate} stroke={shell.seam} stroke-width="2">
			<polygon points="52,128 60,116 72,118 74,132 64,140 54,138" />
			<polygon points="168,128 160,116 148,118 146,132 156,140 166,138" />
			<polygon points="50,160 58,148 68,150 70,164 62,172 52,170" />
			<polygon points="170,160 162,148 152,150 150,164 158,172 168,170" />
		</g>
		<!-- legs and feet with pale toes -->
		<rect x="78" y="172" width="22" height="24" rx="10" fill="#8fbc63" />
		<rect x="120" y="172" width="22" height="24" rx="10" fill="#8fbc63" />
		<ellipse cx="88" cy="198" rx="20" ry="10" fill="#8fbc63" />
		<ellipse cx="132" cy="198" rx="20" ry="10" fill="#8fbc63" />
		<g fill="#f4e8c6" stroke-width="1.5">
			<circle cx="79" cy="203" r="3.5" />
			<circle cx="88" cy="205" r="3.5" />
			<circle cx="97" cy="203" r="3.5" />
			<circle cx="123" cy="203" r="3.5" />
			<circle cx="132" cy="205" r="3.5" />
			<circle cx="141" cy="203" r="3.5" />
		</g>
		<!-- body and cream plastron with scute lines -->
		<ellipse cx="110" cy="146" rx="48" ry="48" fill="#9fc873" />
		<ellipse cx="110" cy="150" rx="37" ry="41" fill="#f8e9c4" />
		<path
			d="M75 136 Q110 144 145 136 M73 154 Q110 162 147 154 M78 172 Q110 180 142 172 M110 110 V190"
			fill="none"
			stroke="#d9c28c"
			stroke-width="2.5"
			stroke-linecap="round"
		/>
		<!-- resting arm (left) -->
		<path d="M68 122 Q52 140 54 158" fill="none" stroke-width="20" stroke-linecap="round" />
		<path
			d="M68 122 Q52 140 54 158"
			fill="none"
			stroke="#8fbc63"
			stroke-width="15"
			stroke-linecap="round"
		/>
		<circle cx="55" cy="162" r="11" fill="#8fbc63" />
		<g fill="#f4e8c6" stroke-width="1.5">
			<circle cx="48" cy="170" r="3.2" />
			<circle cx="55" cy="173" r="3.2" />
			<circle cx="62" cy="170" r="3.2" />
		</g>
		<!-- waving arm (right) -->
		<path d="M152 122 Q172 110 176 90" fill="none" stroke-width="20" stroke-linecap="round" />
		<path
			d="M152 122 Q172 110 176 90"
			fill="none"
			stroke="#8fbc63"
			stroke-width="15"
			stroke-linecap="round"
		/>
		<circle cx="177" cy="84" r="11" fill="#8fbc63" />
		<g fill="#f4e8c6" stroke-width="1.5">
			<circle cx="170" cy="75" r="3.2" />
			<circle cx="178" cy="72" r="3.2" />
			<circle cx="186" cy="77" r="3.2" />
		</g>
		<!-- orange bandana: collar, triangle with a white star, little knot -->
		<path d="M78 108 Q110 124 142 108 L110 152 Z" fill="#ff6b0f" stroke-linecap="round" />
		<ellipse cx="110" cy="108" rx="34" ry="9" fill="#ff6b0f" />
		<polygon
			points="110,118 112.9,124 119.5,124.9 114.7,129.4 115.9,136 110,132.9 104.1,136 105.3,129.4 100.5,124.9 107.1,124"
			fill="#ffffff"
			stroke="none"
		/>
		<circle cx="110" cy="153" r="4.5" fill="#ff6b0f" />
		<path
			d="M107 156 L102 166 M113 156 L118 166"
			stroke="#ff6b0f"
			stroke-width="4"
			stroke-linecap="round"
		/>
		<!-- big round head with spots -->
		<ellipse cx="110" cy="62" rx="58" ry="51" fill="#9fc873" />
		<g fill="#79a64e" stroke="none">
			<ellipse cx="100" cy="22" rx="11" ry="6" />
			<ellipse cx="124" cy="20" rx="7" ry="4.5" />
			<ellipse cx="138" cy="29" rx="4.5" ry="3" />
			<ellipse cx="80" cy="27" rx="4.5" ry="3" />
		</g>
		<!-- cheeks -->
		<ellipse cx="68" cy="80" rx="11" ry="6.5" fill="#f6ad9c" stroke="none" opacity="0.9" />
		<ellipse cx="152" cy="80" rx="11" ry="6.5" fill="#f6ad9c" stroke="none" opacity="0.9" />
		<!-- big brown eyes with highlights -->
		<circle cx="86" cy="60" r="13" fill="#6b4428" stroke="#22160e" stroke-width="2" />
		<circle cx="134" cy="60" r="13" fill="#6b4428" stroke="#22160e" stroke-width="2" />
		<g stroke="none">
			<circle cx="86" cy="61" r="8" fill="#22160e" />
			<circle cx="134" cy="61" r="8" fill="#22160e" />
			<circle cx="90" cy="55" r="4.8" fill="#ffffff" />
			<circle cx="138" cy="55" r="4.8" fill="#ffffff" />
			<circle cx="82" cy="65" r="1.9" fill="#ffffff" />
			<circle cx="130" cy="65" r="1.9" fill="#ffffff" />
			<!-- nostrils -->
			<ellipse cx="105" cy="76" rx="1.8" ry="1.4" fill="#3d5a2a" />
			<ellipse cx="115" cy="76" rx="1.8" ry="1.4" fill="#3d5a2a" />
		</g>
		<!-- wide smile -->
		<path
			d="M95 84 Q110 97 125 84"
			fill="none"
			stroke="#2b3a22"
			stroke-width="3.2"
			stroke-linecap="round"
		/>
	</g>
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
