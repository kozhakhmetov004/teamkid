<script lang="ts">
	/**
	 * The WebGL part of Pebble3D. Loaded ONLY via dynamic import from
	 * Pebble3D.svelte, so three.js / Threlte live in a separate chunk that the
	 * server never imports and SVG-only visitors never download.
	 */
	import { Canvas } from '@threlte/core';
	import { NoToneMapping, WebGLRenderer } from 'three';
	import type { Mood } from './motion.js';
	import type { ShellPalette } from './shell.js';
	import TurtleModel from './TurtleModel.svelte';

	let {
		mood,
		follow,
		draggable,
		active,
		onready,
		oninteract,
		onerror,
		shell
	}: {
		mood: Mood;
		follow: boolean;
		draggable: boolean;
		active: boolean;
		onready: () => void;
		oninteract: () => void;
		onerror: () => void;
		shell?: ShellPalette;
	} = $props();

	function createRenderer(canvas: HTMLCanvasElement) {
		const renderer = new WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
			powerPreference: 'low-power'
		});
		renderer.setClearColor(0x000000, 0);
		canvas.setAttribute('aria-hidden', 'true');
		canvas.addEventListener('webglcontextlost', (e) => {
			e.preventDefault();
			onerror();
		});
		return renderer;
	}
</script>

<Canvas
	renderMode="on-demand"
	dpr={[1, 2]}
	toneMapping={NoToneMapping}
	shadows={false}
	{createRenderer}
>
	<TurtleModel {mood} {follow} {draggable} {active} {onready} {oninteract} {shell} />
</Canvas>
