/**
 * Pure motion maths for Pebble3D (no three.js; unit-tested in motion.spec.ts).
 * Angles are in radians; time in seconds.
 */

/** Same mood names as Member 2's Pebble.svelte. */
export type Mood = 'idle' | 'happy' | 'sleepy' | 'proud';

const DEG = Math.PI / 180;
export const LIMITS = {
	headYaw: 30 * DEG,
	headPitch: 20 * DEG,
	bodyYaw: 8 * DEG,
	bodyPitch: 3 * DEG,
	/** eye offset in model units (eyes move a bit more than the head) */
	eyeX: 0.045,
	eyeY: 0.035
} as const;

/** After this long without pointer movement Pebble drifts back to centre. */
export const IDLE_AFTER_MS = 1500;

const clamp = (v: number, min = -1, max = 1) => Math.min(max, Math.max(min, v));

/**
 * Pointer position relative to the turtle's centre, normalised to -1..1
 * by half the viewport (so the turtle reacts across the whole page).
 * y is positive when the pointer is ABOVE the turtle.
 */
export function pointerTarget(
	clientX: number,
	clientY: number,
	rect: { left: number; top: number; width: number; height: number },
	viewport: { width: number; height: number }
): { x: number; y: number } {
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;
	return {
		x: clamp((clientX - cx) / Math.max(1, viewport.width / 2)),
		y: clamp((cy - clientY) / Math.max(1, viewport.height / 2))
	};
}

/** Frame-rate independent exponential easing of `current` toward `target`. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
	return target + (current - target) * Math.exp(-lambda * dt);
}

export interface Look {
	x: number;
	y: number;
}

/** One easing step of the look direction; returns the new look and whether it is still moving. */
export function stepLook(
	current: Look,
	target: Look,
	dt: number,
	lambda = 6
): { look: Look; moving: boolean } {
	const look = {
		x: damp(current.x, target.x, lambda, dt),
		y: damp(current.y, target.y, lambda, dt)
	};
	const moving = Math.abs(look.x - target.x) > 0.002 || Math.abs(look.y - target.y) > 0.002;
	return { look: moving ? look : { ...target }, moving };
}

/** Rotations and offsets for a look direction (-1..1 on both axes). */
export function lookAngles(look: Look) {
	return {
		headYaw: look.x * LIMITS.headYaw,
		headPitch: -look.y * LIMITS.headPitch,
		bodyYaw: look.x * LIMITS.bodyYaw,
		bodyPitch: -look.y * LIMITS.bodyPitch,
		eyeX: look.x * LIMITS.eyeX,
		eyeY: look.y * LIMITS.eyeY
	};
}

export interface Pose {
	/** vertical offset of the whole turtle */
	lift: number;
	/** vertical scale (breathing) */
	breath: number;
	/** 1 = eyes open, ~0 = closed */
	eyeOpen: number;
	/** 0..1 position of the shine sweeping across the shell (proud), or -1 for none */
	shine: number;
	/** 0..1 how far the waving arm is raised (0 = resting at the side) */
	wave: number;
}

/** Blink: eyes close briefly once per `period` seconds. */
export function blink(t: number, period = 3.8, duration = 0.16): number {
	const phase = t % period;
	if (phase > duration) return 1;
	return Math.abs(Math.cos((phase / duration) * Math.PI));
}

/**
 * Friendly wave: the arm goes up quickly, waves, and comes back down.
 * First wave `delay` seconds after the scene starts, then once every `period`.
 */
export function waveAt(t: number, period = 8, duration = 1.8, delay = 1): number {
	if (t < delay) return 0;
	const phase = (t - delay) % period;
	if (phase > duration) return 0;
	return Math.min(1, 3 * Math.sin((phase / duration) * Math.PI));
}

/** The animated pose for a mood at time t. Every mood animates continuously. */
export function moodPose(mood: Mood, t: number): Pose {
	switch (mood) {
		case 'happy':
			return {
				lift: Math.abs(Math.sin(t * Math.PI * 1.6)) * 0.14,
				breath: 1,
				eyeOpen: blink(t, 3.2),
				shine: -1,
				wave: 1
			};
		case 'sleepy':
			return {
				lift: Math.sin((t * Math.PI * 2) / 4.5) * 0.02,
				breath: 1 + Math.sin((t * Math.PI * 2) / 4.5) * 0.025,
				eyeOpen: 0.08,
				shine: -1,
				wave: 0
			};
		case 'proud':
			return {
				lift: 0.08 + Math.sin((t * Math.PI * 2) / 3) * 0.02,
				breath: 1.01,
				eyeOpen: blink(t, 4.2),
				shine: (t % 2.6) / 2.6,
				wave: 0
			};
		case 'idle':
		default:
			return {
				lift: Math.sin((t * Math.PI * 2) / 3.5) * 0.04,
				breath: 1,
				eyeOpen: blink(t),
				shine: -1,
				wave: waveAt(t)
			};
	}
}

// ---------------------------------------------------------------------------
// Drag to spin
// ---------------------------------------------------------------------------
export const SPIN = {
	/** radians per CSS pixel of drag */
	perPixel: 0.011,
	pitchLimit: 35 * DEG,
	/** velocity decay per second after release (higher = stops sooner) */
	friction: 3.2,
	/** how strongly the turtle returns to face front once it has slowed down */
	returnLambda: 2.4,
	/** below this speed (rad/s) the return-to-front takes over */
	restSpeed: 0.35
} as const;

export interface Spin {
	yaw: number;
	pitch: number;
	/** yaw velocity in rad/s (set by the last drag movement) */
	velocity: number;
}

export const SPIN_REST: Spin = { yaw: 0, pitch: 0, velocity: 0 };

/** Apply a drag movement (CSS pixels) while the pointer is down. */
export function dragSpin(spin: Spin, dx: number, dy: number, dt: number): Spin {
	const yaw = spin.yaw + dx * SPIN.perPixel;
	const pitch = clamp(spin.pitch + dy * SPIN.perPixel * 0.7, -SPIN.pitchLimit, SPIN.pitchLimit);
	const velocity = dt > 0 ? (dx * SPIN.perPixel) / dt : spin.velocity;
	return { yaw, pitch, velocity };
}

/** Nearest "facing front" angle to `yaw` (a whole number of turns). */
export function nearestFront(yaw: number): number {
	return Math.round(yaw / (2 * Math.PI)) * 2 * Math.PI;
}

/**
 * One frame after release: coast with friction, then ease back to face front
 * (nearest whole turn, so a full spin never unwinds backwards). Returns the
 * new spin and whether it is still moving.
 */
export function stepSpin(spin: Spin, dt: number): { spin: Spin; moving: boolean } {
	let velocity = spin.velocity * Math.exp(-SPIN.friction * dt);
	let yaw = spin.yaw + velocity * dt;
	if (Math.abs(velocity) < SPIN.restSpeed) {
		velocity = 0;
		yaw = damp(yaw, nearestFront(yaw), SPIN.returnLambda, dt);
	}
	const pitch = damp(spin.pitch, 0, SPIN.returnLambda * 1.5, dt);
	const front = nearestFront(yaw);
	const settled = velocity === 0 && Math.abs(yaw - front) < 0.003 && Math.abs(pitch) < 0.003;
	if (settled) return { spin: { yaw: front, pitch: 0, velocity: 0 }, moving: false };
	return { spin: { yaw, pitch, velocity }, moving: true };
}

// ---------------------------------------------------------------------------
// Living eyes: the pupil leads, the eye follows, and it darts now and then
// ---------------------------------------------------------------------------
export const PUPIL = {
	/** easing speed of the pupil; the whole eye/head use 6, so the pupil gets there first */
	lambda: 16,
	/** how far the pupil can slide inside the iris (eye-local units) */
	max: 0.024,
	/** small random glances (saccades): size (look units) and pause between them (s) */
	saccadeSize: 0.35,
	saccadeMin: 0.8,
	saccadeMax: 3
} as const;

/** Pupil offset inside the iris for a look direction, kept within a circle of `max`. */
export function pupilOffset(look: Look, max: number = PUPIL.max): Look {
	const len = Math.hypot(look.x, look.y);
	const k = len > 1 ? 1 / len : 1;
	return { x: look.x * k * max, y: look.y * k * max };
}

/** A new tiny glance and how long to hold it before the next one. */
export function nextSaccade(rand: () => number = Math.random): { look: Look; wait: number } {
	return {
		look: {
			x: (rand() * 2 - 1) * PUPIL.saccadeSize,
			y: (rand() * 2 - 1) * PUPIL.saccadeSize * 0.6
		},
		wait: PUPIL.saccadeMin + rand() * (PUPIL.saccadeMax - PUPIL.saccadeMin)
	};
}

/**
 * Frame budget: full rate while following/settling, a calmer 30 fps for the
 * ambient mood animation (saves battery; the motion is slow anyway).
 */
export function shouldDraw(sinceLastDraw: number, settling: boolean): boolean {
	return settling || sinceLastDraw >= 1 / 30;
}
