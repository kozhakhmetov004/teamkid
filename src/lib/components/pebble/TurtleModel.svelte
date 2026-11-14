<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import {
		damp,
		dragSpin,
		IDLE_AFTER_MS,
		lookAngles,
		moodPose,
		pointerTarget,
		shouldDraw,
		SPIN_REST,
		stepLook,
		stepSpin,
		type Look,
		type Mood,
		type Spin
	} from './motion.js';
	import { buildTurtle } from './shapes.js';

	let {
		mood,
		follow,
		draggable,
		active,
		onready,
		oninteract
	}: {
		mood: Mood;
		follow: boolean;
		draggable: boolean;
		active: boolean;
		onready: () => void;
		/** Called once the first time the visitor drags the turtle. */
		oninteract: () => void;
	} = $props();

	const { invalidate, dom } = useThrelte();
	const turtle = buildTurtle();
	onDestroy(() => turtle.dispose());

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
		dom.style.touchAction = 'none';

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
			turtle.eyes.position.x = a.eyeX;
			turtle.eyes.position.y = 0.46 + a.eyeY;
			for (const eye of turtle.eyeballs) eye.scale.y = Math.max(0.08, pose.eyeOpen);
			// shadow shrinks and fades as the turtle lifts
			const height = turtle.root.position.y;
			turtle.shadow.scale.set(1.15 - height * 0.5, 0.55 - height * 0.25, 1);
			(turtle.shadow.material as import('three').MeshBasicMaterial).opacity = Math.max(
				0.05,
				0.14 - height * 0.3
			);
			for (const p of turtle.plates) {
				// proud: a soft highlight sweeps around the shell
				const sweep =
					pose.shine < 0
						? 0
						: Math.max(0, 1 - Math.abs(Math.sin(p.angle / 2 - pose.shine * Math.PI)) * 3);
				p.material.emissive.setRGB(sweep * 0.35, sweep * 0.42, sweep * 0.2);
			}

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
