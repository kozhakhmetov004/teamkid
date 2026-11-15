<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import {
		damp,
		dragSpin,
		IDLE_AFTER_MS,
		lookAngles,
		moodPose,
		nextSaccade,
		PUPIL,
		pupilOffset,
		pointerTarget,
		shouldDraw,
		SPIN_REST,
		stepLook,
		stepSpin,
		type Look,
		type Mood,
		type Spin
	} from './motion.js';
	import { ARM_REST, buildTurtle } from './shapes.js';
	import { DEFAULT_SHELL, type ShellPalette } from './shell.js';

	let {
		mood,
		follow,
		draggable,
		active,
		onready,
		oninteract,
		shell = DEFAULT_SHELL
	}: {
		mood: Mood;
		follow: boolean;
		draggable: boolean;
		active: boolean;
		onready: () => void;
		/** Called once the first time the visitor drags the turtle. */
		oninteract: () => void;
		/** Shell colours; changing them recolours the turtle in place. */
		shell?: ShellPalette;
	} = $props();

	const { invalidate, dom } = useThrelte();
	// built with the first colours; the effect below keeps them in sync
	// svelte-ignore state_referenced_locally
	const turtle = buildTurtle(shell);
	onDestroy(() => turtle.dispose());

	$effect(() => {
		turtle.setShell(shell);
		invalidate();
	});

	// ---- cursor follow ---------------------------------------------------------------------
	let target: Look = { x: 0, y: 0 };
	let lastPointerAt = -Infinity;

	$effect(() => {
		if (!follow) return;
		const update = (e: PointerEvent) => {
			target = pointerTarget(e.clientX, e.clientY, dom.getBoundingClientRect(), {
				width: window.innerWidth,
				height: window.innerHeight
			});
			lastPointerAt = performance.now();
			invalidate();
		};
		// pointerdown covers taps on touch-capable laptops.
		const leave = () => (lastPointerAt = -Infinity);
		window.addEventListener('pointermove', update, { passive: true });
		window.addEventListener('pointerdown', update, { passive: true });
		document.documentElement.addEventListener('pointerleave', leave);
		window.addEventListener('blur', leave);
		return () => {
			window.removeEventListener('pointermove', update);
			window.removeEventListener('pointerdown', update);
			document.documentElement.removeEventListener('pointerleave', leave);
			window.removeEventListener('blur', leave);
		};
	});

	// ---- drag to spin ----------------------------------------------------------------------
	let spin: Spin = { ...SPIN_REST };
	let dragging = false;
	let interacted = false;
	let last = { x: 0, y: 0, t: 0 };

	$effect(() => {
		if (!draggable) return;
		dom.style.cursor = 'grab';
		// sideways swipes spin Pebble; up/down still scrolls the page on touch screens
		dom.style.touchAction = 'pan-y';

		const down = (e: PointerEvent) => {
			if (e.button !== 0 && e.pointerType === 'mouse') return;
			dragging = true;
			last = { x: e.clientX, y: e.clientY, t: performance.now() };
			dom.setPointerCapture(e.pointerId);
			dom.style.cursor = 'grabbing';
			invalidate();
		};
		const move = (e: PointerEvent) => {
			if (!dragging) return;
			const now = performance.now();
			const dt = Math.max(1, now - last.t) / 1000;
			spin = dragSpin(spin, e.clientX - last.x, e.clientY - last.y, dt);
			last = { x: e.clientX, y: e.clientY, t: now };
			if (!interacted && Math.abs(spin.yaw) > 0.15) {
				interacted = true;
				oninteract();
			}
			invalidate();
		};
		const up = (e: PointerEvent) => {
			if (!dragging) return;
			dragging = false;
			// a flick that ended a moment ago shouldn't keep its old velocity
			if (performance.now() - last.t > 80) spin = { ...spin, velocity: 0 };
			if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
			dom.style.cursor = 'grab';
			invalidate();
		};

		dom.addEventListener('pointerdown', down);
		dom.addEventListener('pointermove', move);
		dom.addEventListener('pointerup', up);
		dom.addEventListener('pointercancel', up);
		return () => {
			dom.removeEventListener('pointerdown', down);
			dom.removeEventListener('pointermove', move);
			dom.removeEventListener('pointerup', up);
			dom.removeEventListener('pointercancel', up);
			dom.style.cursor = '';
			dom.style.touchAction = '';
		};
	});

	// ---- animation loop (renders on demand) ---------------------------------------------
	let look: Look = { x: 0, y: 0 };
	let picked = 0; // 0..1 "picked up" lift while dragging
	let pupilLook: Look = { x: 0, y: 0 }; // eases faster than `look`: the pupil leads
	let glance: Look = { x: 0, y: 0 };
	let glanceIn = 1.2; // seconds until the next tiny dart
	let t = 0;
	let sinceDraw = Infinity;
	let announced = false;

	useTask(
		(dt) => {
			const step = Math.min(dt, 0.1); // avoid jumps after the tab was hidden
			t += step;
			sinceDraw += step;

			// look: follow the pointer unless idle or being dragged
			const following = follow && !dragging && performance.now() - lastPointerAt < IDLE_AFTER_MS;
			const lookStep = stepLook(look, following ? target : { x: 0, y: 0 }, step);
			look = lookStep.look;

			// living eyes: tiny random darts, smaller while following the cursor
			glanceIn -= step;
			if (glanceIn <= 0) {
				const g = nextSaccade();
				glance = g.look;
				glanceIn = g.wait;
			}
			const lookTarget = following ? target : { x: 0, y: 0 };
			const dart = following ? 0.4 : 1;
			pupilLook = stepLook(
				pupilLook,
				{ x: lookTarget.x + glance.x * dart, y: lookTarget.y + glance.y * dart },
				step,
				PUPIL.lambda
			).look;

			// spin: driven by the drag while held, coasting and returning after release
			let spinning = dragging;
			if (!dragging) {
				const s = stepSpin(spin, step);
				spin = s.spin;
				spinning = s.moving;
			}
			const pickedTarget = dragging ? 1 : 0;
			const nextPicked = damp(picked, pickedTarget, 8, step);
			const lifting = Math.abs(nextPicked - pickedTarget) > 0.005;
			picked = lifting ? nextPicked : pickedTarget;

			const a = lookAngles(look);
			const pose = moodPose(mood, t);

			turtle.root.position.y = pose.lift + picked * 0.12;
			turtle.root.rotation.set(spin.pitch, spin.yaw, 0);
			turtle.root.scale.set(1 / Math.sqrt(pose.breath), pose.breath, 1);
			turtle.body.rotation.set(a.bodyPitch, a.bodyYaw, 0);
			turtle.head.rotation.set(a.headPitch, a.headYaw, look.x * 0.06);
			turtle.eyes.position.x = turtle.eyeBase.x + a.eyeX;
			turtle.eyes.position.y = turtle.eyeBase.y + a.eyeY;
			// arms: the right one waves hello; both lift a little when picked up
			const wave = pose.wave * (1 - picked);
			turtle.armR.rotation.z = ARM_REST + picked * 0.6 + wave * (2.2 + Math.sin(t * 11) * 0.28);
			turtle.armL.rotation.z = -ARM_REST - picked * 0.6;
			for (const eye of turtle.eyeballs) eye.scale.y = Math.max(0.08, pose.eyeOpen);
			// the pupil slides inside the iris; the white highlights stay put (they are reflections)
			const p = pupilOffset(pupilLook);
			for (const { mesh, base } of turtle.pupils)
				mesh.position.set(base.x + p.x, base.y + p.y, base.z);
			// shadow shrinks and fades as the turtle lifts
			const height = turtle.root.position.y;
			turtle.shadow.scale.set(1.15 - height * 0.5, 0.55 - height * 0.25, 1);
			(turtle.shadow.material as import('three').MeshBasicMaterial).opacity = Math.max(
				0.05,
				0.14 - height * 0.3
			);
			turtle.setShine(pose.shine); // proud: a soft highlight sweeps round the shell

			if (shouldDraw(sinceDraw, lookStep.moving || spinning || lifting)) {
				sinceDraw = 0;
				invalidate();
				if (!announced) {
					announced = true;
					requestAnimationFrame(() => onready());
				}
			}
		},
		{ autoInvalidate: false, running: () => active }
	);
</script>

<T.PerspectiveCamera
	makeDefault
	fov={28}
	position={[0, 0.15, 7]}
	oncreate={(cam) => cam.lookAt(0, -0.18, 0)}
/>
<T.AmbientLight intensity={1.4} />
<T.DirectionalLight position={[2.5, 4, 5]} intensity={2.2} />
<T.DirectionalLight position={[-3, 1, -4]} intensity={0.6} />
<T is={turtle.stage} />
