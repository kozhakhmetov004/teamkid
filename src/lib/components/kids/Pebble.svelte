<script lang="ts" module>
	export type PebbleState = 'idle' | 'happy' | 'sleepy' | 'proud';
</script>

<script lang="ts">
	/**
	 * Pebble the turtle: an original inline SVG (no external images).
	 * States: idle (gentle bob), happy (bounce + sparkles), sleepy (eyes closed + "z"),
	 * proud (happy eyes + shine). All motion is CSS and stops with prefers-reduced-motion.
	 */
	import { SHELL_COLORS, type ShellColor, type ShellPatternKey } from '#lib/kids/pet.js';

	let {
		state = 'idle',
		name = 'Pebble',
		color = SHELL_COLORS[0],
		pattern = null,
		class: className = ''
	}: {
		state?: PebbleState;
		name?: string;
		color?: ShellColor;
		pattern?: ShellPatternKey | null;
		class?: string;
	} = $props();

	const uid = $props.id();
	const clipId = `pebble-shell-${uid}`;

	const stateLabel: Record<PebbleState, string> = {
		idle: 'smiling',
		happy: 'happy and bouncing',
		sleepy: 'sleepy',
		proud: 'proud'
	};

	// Flat-top hexagon grid over the shell (clipped to the dome).
	const R = 19;
	const hexPoints = (cx: number, cy: number, r = R - 2) =>
		Array.from({ length: 6 }, (_, i) => {
			const a = (Math.PI / 3) * i;
			return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
		}).join(' ');
	const hexes: [number, number][] = [];
	for (let col = 0; col < 6; col++) {
		const x = 38 + col * R * 1.5;
		const offset = col % 2 ? (R * Math.sqrt(3)) / 2 : 0;
		for (let row = 0; row < 4; row++) hexes.push([x, 40 + offset + row * R * Math.sqrt(3)]);
	}

	// Where pattern decorations sit (inside the dome).
	const spots: [number, number][] = [
		[81, 75],
		[110, 62],
		[139, 75],
		[95, 104],
		[125, 104]
	];
	const star = (cx: number, cy: number, r: number) =>
		Array.from({ length: 10 }, (_, i) => {
			const a = (Math.PI / 5) * i - Math.PI / 2;
			const rr = i % 2 ? r * 0.45 : r;
			return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
		}).join(' ');
	const heart = (cx: number, cy: number, s: number) =>
		`M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.6} ${cy - s * 1.3} ${cx} ${cy - s * 0.4} C${cx + s * 0.6} ${cy - s * 1.3} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s * 0.9} Z`;
</script>

<svg
	viewBox="0 0 260 190"
	role="img"
	aria-label="{name} the turtle, {stateLabel[state]}"
	class="pebble pebble--{state} {className}"
>
	<defs>
		<clipPath id={clipId}>
			<path d="M28 132 C28 68 66 34 110 34 C154 34 192 68 192 132 Z" />
		</clipPath>
	</defs>

	<!-- soft ground shadow -->
	<ellipse class="pebble__shadow" cx="122" cy="176" rx="96" ry="8" fill="#000" opacity="0.08" />

	<g class="pebble__body">
		<!-- tail -->
		<path d="M30 128 L12 136 L32 140 Z" fill="#A6D15A" stroke="#6E9B33" stroke-width="2" />
		<!-- legs -->
		<rect
			x="46"
			y="128"
			width="26"
			height="30"
			rx="12"
			fill="#A6D15A"
			stroke="#6E9B33"
			stroke-width="2"
		/>
		<rect
			x="146"
			y="128"
			width="26"
			height="30"
			rx="12"
			fill="#A6D15A"
			stroke="#6E9B33"
			stroke-width="2"
		/>
		<!-- belly -->
		<ellipse cx="110" cy="134" rx="88" ry="16" fill="#F6EBC8" stroke="#D9C894" stroke-width="2" />

		<!-- shell -->
		<path
			d="M28 132 C28 68 66 34 110 34 C154 34 192 68 192 132 Z"
			fill={color.hex}
			stroke={color.dark}
			stroke-width="3"
		/>
		<g clip-path="url(#{clipId})">
			{#each hexes as [cx, cy] (`${cx}-${cy}`)}
				<polygon
					points={hexPoints(cx, cy)}
					fill={color.dark}
					fill-opacity="0.35"
					stroke={color.dark}
					stroke-width="2"
					stroke-linejoin="round"
				/>
			{/each}

			{#if pattern === 'dots'}
				{#each spots as [x, y] (`${x}-${y}`)}<circle cx={x} cy={y} r="6" fill="#FFE27A" />{/each}
			{:else if pattern === 'stars'}
				{#each spots as [x, y] (`${x}-${y}`)}<polygon
						points={star(x, y, 9)}
						fill="#FFE27A"
					/>{/each}
			{:else if pattern === 'hearts'}
				{#each spots as [x, y] (`${x}-${y}`)}<path d={heart(x, y, 6)} fill="#FF9EB5" />{/each}
			{:else if pattern === 'stripes'}
				{#each [58, 82, 106] as y (y)}
					<path
						d="M20 {y} Q65 {y - 10} 110 {y} T200 {y}"
						fill="none"
						stroke="#FFF4C9"
						stroke-width="5"
						stroke-linecap="round"
						opacity="0.85"
					/>
				{/each}
			{:else if pattern === 'flowers'}
				{#each spots as [x, y] (`${x}-${y}`)}
					<g>
						{#each [0, 72, 144, 216, 288] as deg (deg)}
							<circle
								cx={x + 5 * Math.cos((deg * Math.PI) / 180)}
								cy={y + 5 * Math.sin((deg * Math.PI) / 180)}
								r="3.6"
								fill="#FFFFFF"
							/>
						{/each}
						<circle cx={x} cy={y} r="3" fill="#FFC93C" />
					</g>
				{/each}
			{/if}
		</g>
		<!-- shell rim -->
		<path d="M24 132 H196" stroke={color.dark} stroke-width="5" stroke-linecap="round" />

		<!-- head -->
		<g class="pebble__head">
			<rect x="178" y="104" width="22" height="30" rx="10" fill="#A6D15A" />
			<circle cx="206" cy="92" r="34" fill="#A6D15A" stroke="#6E9B33" stroke-width="2.5" />

			<!-- blush -->
			<ellipse cx="190" cy="104" rx="6" ry="3.5" fill="#F4A6A6" opacity="0.75" />
			<ellipse cx="224" cy="104" rx="6" ry="3.5" fill="#F4A6A6" opacity="0.75" />

			<!-- eyes -->
			{#if state === 'sleepy'}
				<path
					d="M190 90 Q196 95 202 90"
					fill="none"
					stroke="#2B2B2B"
					stroke-width="3"
					stroke-linecap="round"
				/>
				<path
					d="M212 90 Q218 95 224 90"
					fill="none"
					stroke="#2B2B2B"
					stroke-width="3"
					stroke-linecap="round"
				/>
			{:else if state === 'proud'}
				<path
					d="M190 92 Q196 84 202 92"
					fill="none"
					stroke="#2B2B2B"
					stroke-width="3"
					stroke-linecap="round"
				/>
				<path
					d="M212 92 Q218 84 224 92"
					fill="none"
					stroke="#2B2B2B"
					stroke-width="3"
					stroke-linecap="round"
				/>
			{:else}
				<g class="pebble__eyes">
					<circle cx="196" cy="89" r="6" fill="#2B2B2B" />
					<circle cx="218" cy="89" r="6" fill="#2B2B2B" />
					<circle cx="194" cy="87" r="2.2" fill="#FFFFFF" />
					<circle cx="216" cy="87" r="2.2" fill="#FFFFFF" />
				</g>
			{/if}

			<!-- small "u" smile -->
			<path
				d={state === 'happy' || state === 'proud'
					? 'M199 101 Q207 112 215 101'
					: 'M201 102 Q207 108 213 102'}
				fill="none"
				stroke="#2B2B2B"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
		</g>
	</g>

	{#if state === 'happy' || state === 'proud'}
		<g class="pebble__sparkles" fill="#FFC93C">
			<polygon class="spark spark--1" points={star(176, 30, 9)} />
			<polygon class="spark spark--2" points={star(236, 40, 7)} />
			<polygon class="spark spark--3" points={star(60, 30, 6)} />
		</g>
	{/if}

	{#if state === 'sleepy'}
		<g
			class="pebble__z"
			fill="#3B5A6E"
			font-family="ui-rounded, system-ui, sans-serif"
			font-weight="800"
		>
			<text class="z z--1" x="232" y="54" font-size="16">z</text>
			<text class="z z--2" x="242" y="36" font-size="22">Z</text>
		</g>
	{/if}
</svg>

<style>
	.pebble {
		display: block;
		overflow: visible;
	}
	.pebble__body {
		transform-box: fill-box;
		transform-origin: 50% 100%;
	}
	.pebble__head {
		transform-box: fill-box;
		transform-origin: 20% 80%;
	}

	.pebble--idle .pebble__body {
		animation: pebble-bob 3.2s ease-in-out infinite;
	}
	.pebble--idle .pebble__eyes {
		transform-box: fill-box;
		transform-origin: center;
		animation: pebble-blink 5s infinite;
	}
	.pebble--happy .pebble__body {
		animation: pebble-bounce 0.9s ease-in-out infinite;
	}
	.pebble--sleepy .pebble__body {
		animation: pebble-breathe 4s ease-in-out infinite;
	}
	.pebble--proud .pebble__head {
		transform: rotate(-6deg);
	}
	.pebble--proud .pebble__body {
		animation: pebble-bob 2.4s ease-in-out infinite;
	}

	.spark {
		transform-box: fill-box;
		transform-origin: center;
		animation: pebble-twinkle 1.6s ease-in-out infinite;
	}
	.spark--2 {
		animation-delay: 0.4s;
	}
	.spark--3 {
		animation-delay: 0.8s;
	}
	.z {
		animation: pebble-float 3s ease-in-out infinite;
	}
	.z--2 {
		animation-delay: 1.2s;
	}

	@keyframes pebble-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}
	@keyframes pebble-bounce {
		0%,
		100% {
			transform: translateY(0) scale(1, 1);
		}
		40% {
			transform: translateY(-16px) scale(0.98, 1.03);
		}
		70% {
			transform: translateY(0) scale(1.03, 0.97);
		}
	}
	@keyframes pebble-breathe {
		0%,
		100% {
			transform: scale(1, 1);
		}
		50% {
			transform: scale(1.01, 0.98);
		}
	}
	@keyframes pebble-blink {
		0%,
		92%,
		100% {
			transform: scaleY(1);
		}
		95% {
			transform: scaleY(0.1);
		}
	}
	@keyframes pebble-twinkle {
		0%,
		100% {
			transform: scale(0.6);
			opacity: 0.4;
		}
		50% {
			transform: scale(1.15);
			opacity: 1;
		}
	}
	@keyframes pebble-float {
		0% {
			transform: translate(0, 6px);
			opacity: 0;
		}
		40% {
			opacity: 1;
		}
		100% {
			transform: translate(6px, -10px);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pebble *,
		.pebble__body,
		.pebble__head {
			animation: none !important;
		}
		.z,
		.spark {
			opacity: 1;
		}
	}
</style>
