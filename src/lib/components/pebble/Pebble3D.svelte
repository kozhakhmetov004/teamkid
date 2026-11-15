<script lang="ts">
	/**
	 * Pebble the turtle in 3D, with progressive enhancement:
	 *  1. Server render / first paint: the SVG turtle in a fixed square box.
	 *  2. In the browser, only with a fine pointer, no reduced motion and
	 *     WebGL available: when idle, lazy-load the 3D scene (separate chunk)
	 *     into the same box and cross-fade. Any failure keeps the SVG.
	 *  3. The scene pauses when off-screen or when the tab is hidden.
	 *
	 * Usage: <Pebble3D follow mood="idle" label="Pebble the turtle, waving" />
	 * Moods match Member 2's Pebble.svelte: idle | happy | sleepy | proud.
	 * `draggable` (default on) lets visitors spin the turtle by dragging it.
	 */
	import { onMount, type Component } from 'svelte';
	import PebbleArt from '#lib/components/landing/PebbleArt.svelte';
	import { canUse3D, whenIdle } from './capabilities.js';
	import type { Mood } from './motion.js';
	import type { ShellPalette } from './shell.js';

	let {
		mood = 'idle',
		follow = false,
		draggable = true,
		size = '100%',
		label = 'Pebble the turtle, smiling',
		hint = 'Drag to spin',
		touch = false,
		shell,
		class: className = ''
	}: {
		mood?: Mood;
		follow?: boolean;
		draggable?: boolean;
		/** CSS width of the square box (height follows), e.g. '11rem' or '100%'. */
		size?: string;
		label?: string;
		/** Small caption shown under the 3D turtle until the visitor drags it. '' hides it. */
		hint?: string;
		/** Also load the 3D turtle on touch devices (kids' pages). */
		touch?: boolean;
		/** Shell colours (default: the green shell). Used by the 3D turtle and the drawn fallback. */
		shell?: ShellPalette;
		class?: string;
	} = $props();

	type SceneProps = {
		mood: Mood;
		follow: boolean;
		draggable: boolean;
		active: boolean;
		onready: () => void;
		oninteract: () => void;
		onerror: () => void;
		shell?: ShellPalette;
	};

	let box: HTMLDivElement;
	let Scene = $state<Component<SceneProps> | null>(null);
	let ready = $state(false);
	let failed = $state(false);
	let interacted = $state(false);
	let inView = $state(false);
	let pageVisible = $state(true);

	const showHint = $derived(ready && draggable && !interacted && hint !== '');

	onMount(() => {
		if (!canUse3D({ touch })) return;
		let cancelled = false;
		const cancelIdle = whenIdle(() => {
			import('./PebbleScene.svelte')
				.then((m) => {
					if (!cancelled) Scene = m.default as Component<SceneProps>;
				})
				.catch(() => (failed = true));
		});
		const io = new IntersectionObserver(([entry]) => (inView = entry.isIntersecting), {
			rootMargin: '120px'
		});
		io.observe(box);
		const onVisibility = () => (pageVisible = document.visibilityState === 'visible');
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			cancelled = true;
			cancelIdle();
			io.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});
</script>

<div
	bind:this={box}
	role="img"
	aria-label={ready && draggable ? `${label}. Drag to spin.` : label}
	class="relative aspect-square select-none {className}"
	style:width={size}
>
	<div
		class="absolute inset-0 transition-opacity duration-300 {ready ? 'opacity-0' : 'opacity-100'}"
	>
		<PebbleArt decorative class="h-full w-full" bob={!ready} {shell} />
	</div>
	{#if Scene && !failed}
		<div
			class="absolute inset-0 transition-opacity duration-300 {ready ? 'opacity-100' : 'opacity-0'}"
			aria-hidden="true"
		>
			<Scene
				{mood}
				{follow}
				{draggable}
				active={inView && pageVisible}
				{shell}
				onready={() => (ready = true)}
				oninteract={() => (interacted = true)}
				onerror={() => {
					failed = true;
					ready = false;
				}}
			/>
		</div>
	{/if}
	{#if showHint}
		<p
			class="pointer-events-none absolute right-0 -bottom-7 left-0 text-center text-xs font-medium text-(--mk-muted,#4a5d56) transition-opacity"
			aria-hidden="true"
		>
			↻ {hint}
		</p>
	{/if}
</div>
