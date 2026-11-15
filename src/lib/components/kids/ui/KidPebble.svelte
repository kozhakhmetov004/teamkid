<script lang="ts">
	/**
	 * Pebble on the kids' pages: the 3D turtle (follows the pointer, spins when
	 * dragged or swiped sideways, idle / happy / sleepy / proud moods), also on
	 * tablets, in the child's chosen shell colour. Falls back to the drawn turtle
	 * (same colours) without WebGL or with reduced motion.
	 *
	 * Shell patterns are not shown in 3D yet.
	 */
	import Pebble3D from '#lib/components/pebble/Pebble3D.svelte';
	import type { ShellColorKey } from '#lib/kids/pet.js';
	import { shell3d } from '#lib/kids/shell3d.js';
	import type { PebbleState } from '../Pebble.svelte';

	let {
		state = 'idle',
		name = 'Pebble',
		color = null,
		follow = true,
		hint = '',
		class: className = ''
	}: {
		state?: PebbleState;
		name?: string;
		/** The child's shell colour (pet_state); default green. */
		color?: ShellColorKey | null;
		follow?: boolean;
		/** Caption under the turtle until it is first spun ('' = none). */
		hint?: string;
		class?: string;
	} = $props();

	const stateLabel: Record<PebbleState, string> = {
		idle: 'smiling',
		happy: 'happy and bouncing',
		sleepy: 'sleepy',
		proud: 'proud'
	};
</script>

<Pebble3D
	mood={state}
	{follow}
	touch
	{hint}
	shell={shell3d(color)}
	label="{name} the turtle, {stateLabel[state]}"
	class="{hint ? 'mb-8' : ''} {className}"
/>
