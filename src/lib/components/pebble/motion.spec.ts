import { describe, expect, it } from 'vitest';
import {
	blink,
	damp,
	dragSpin,
	LIMITS,
	lookAngles,
	moodPose,
	waveAt,
	pupilOffset,
	nextSaccade,
	stepLook as stepLookFn,
	PUPIL,
	nearestFront,
	pointerTarget,
	shouldDraw,
	SPIN,
	SPIN_REST,
	stepLook,
	stepSpin,
	type Spin
} from './motion.js';

const rect = { left: 400, top: 200, width: 200, height: 200 }; // centre (500, 300)
const viewport = { width: 1000, height: 800 };

describe('pointerTarget', () => {
	it('is 0,0 at the centre of the turtle', () => {
		expect(pointerTarget(500, 300, rect, viewport)).toEqual({ x: 0, y: 0 });
	});
	it('is positive right and up, clamped to -1..1', () => {
		expect(pointerTarget(1000, 300, rect, viewport).x).toBe(1);
		expect(pointerTarget(500, 0, rect, viewport).y).toBeCloseTo(0.75);
		expect(pointerTarget(-5000, 5000, rect, viewport)).toEqual({ x: -1, y: -1 });
	});
});

describe('easing', () => {
	it('damp moves toward the target and is frame-rate independent', () => {
		const oneStep = damp(0, 1, 6, 1 / 30);
		const twoSteps = damp(damp(0, 1, 6, 1 / 60), 1, 6, 1 / 60);
		expect(oneStep).toBeGreaterThan(0);
		expect(oneStep).toBeLessThan(1);
		expect(twoSteps).toBeCloseTo(oneStep, 10);
	});
	it('stepLook settles exactly on the target and reports when it stops moving', () => {
		let look = { x: 0, y: 0 };
		let moving = true;
		for (let i = 0; i < 300 && moving; i++)
			({ look, moving } = stepLook(look, { x: 1, y: -1 }, 1 / 60));
		expect(moving).toBe(false);
		expect(look).toEqual({ x: 1, y: -1 });
	});
});

describe('lookAngles', () => {
	it('keeps the head within ±30°, the body within ±8°, eyes move more than zero', () => {
		const a = lookAngles({ x: 1, y: 1 });
		expect(a.headYaw).toBeCloseTo(LIMITS.headYaw);
		expect(a.headYaw * (180 / Math.PI)).toBeCloseTo(30);
		expect(a.bodyYaw * (180 / Math.PI)).toBeCloseTo(8);
		expect(a.headPitch).toBeLessThan(0); // looking up tilts the head back
		expect(a.eyeX).toBeGreaterThan(0);
	});
});

describe('moods', () => {
	it('blinks briefly, otherwise eyes are open', () => {
		expect(blink(1)).toBe(1);
		expect(blink(0)).toBeCloseTo(1);
		expect(blink(0.08)).toBeLessThan(0.2);
	});
	it('sleepy keeps the eyes closed and breathes', () => {
		const a = moodPose('sleepy', 0.5);
		const b = moodPose('sleepy', 1.6);
		expect(a.eyeOpen).toBeLessThan(0.1);
		expect(a.breath).not.toBe(b.breath);
	});
	it('happy bounces upward only', () => {
		for (let t = 0; t < 2; t += 0.05) expect(moodPose('happy', t).lift).toBeGreaterThanOrEqual(0);
	});
	it('proud lifts and sweeps a shine across the shell', () => {
		const p = moodPose('proud', 1.3);
		expect(p.lift).toBeGreaterThan(0.05);
		expect(p.shine).toBeGreaterThanOrEqual(0);
		expect(p.shine).toBeLessThan(1);
		expect(moodPose('idle', 1).shine).toBe(-1);
	});
	it('idle waves now and then, happy waves all the time, sleepy never', () => {
		expect(waveAt(0.5)).toBe(0); // not before the first greeting
		expect(waveAt(1.9)).toBe(1); // arm fully up mid-wave
		expect(waveAt(5)).toBe(0); // resting between waves
		expect(waveAt(9.9)).toBe(1); // next wave, one period later
		expect(moodPose('happy', 3).wave).toBe(1);
		for (let t = 0; t < 20; t += 0.5) expect(moodPose('sleepy', t).wave).toBe(0);
	});
});

describe('drag to spin', () => {
	it('turns with the drag and clamps the tilt', () => {
		const s = dragSpin(SPIN_REST, 100, 0, 1 / 60);
		expect(s.yaw).toBeCloseTo(100 * SPIN.perPixel);
		expect(s.velocity).toBeGreaterThan(0);
		const tilted = dragSpin(SPIN_REST, 0, 10_000, 1 / 60);
		expect(tilted.pitch).toBeCloseTo(SPIN.pitchLimit);
	});

	it('coasts after release, then returns to face front at the nearest whole turn', () => {
		// a fast flick: 1.3 turns in, should settle on exactly 1 full turn (not unwind)
		let spin: Spin = { yaw: Math.PI * 2.6, pitch: 0.3, velocity: 4 };
		const yawAfterFirst = stepSpin(spin, 1 / 60).spin.yaw;
		expect(yawAfterFirst).toBeGreaterThan(spin.yaw); // still coasting forward
		let moving = true;
		for (let i = 0; i < 2000 && moving; i++) ({ spin, moving } = stepSpin(spin, 1 / 60));
		expect(moving).toBe(false);
		expect(spin.yaw / (2 * Math.PI)).toBeCloseTo(Math.round(spin.yaw / (2 * Math.PI)));
		expect(spin.yaw).toBeGreaterThanOrEqual(Math.PI * 2);
		expect(spin.pitch).toBe(0);
	});

	it('nearestFront picks the closest whole turn', () => {
		expect(nearestFront(0.4)).toBe(0);
		expect(nearestFront(Math.PI * 1.2)).toBeCloseTo(Math.PI * 2);
		expect(nearestFront(-Math.PI * 1.2)).toBeCloseTo(-Math.PI * 2);
	});
});

describe('living eyes', () => {
	it('the pupil reaches the target before the eye does', () => {
		const target = { x: 1, y: 0 };
		const eye = stepLookFn({ x: 0, y: 0 }, target, 0.1);
		const pupil = stepLookFn({ x: 0, y: 0 }, target, 0.1, PUPIL.lambda);
		expect(pupil.look.x).toBeGreaterThan(eye.look.x);
	});
	it('keeps the pupil inside the iris', () => {
		const o = pupilOffset({ x: 3, y: 4 });
		expect(Math.hypot(o.x, o.y)).toBeCloseTo(PUPIL.max);
		expect(pupilOffset({ x: 0.5, y: 0 }).x).toBeCloseTo(PUPIL.max / 2);
	});
	it('darts are small and spaced out', () => {
		const lo = nextSaccade(() => 0);
		const hi = nextSaccade(() => 1);
		expect(Math.abs(lo.look.x)).toBeLessThanOrEqual(PUPIL.saccadeSize);
		expect(hi.look.y).toBeLessThanOrEqual(PUPIL.saccadeSize);
		expect(lo.wait).toBe(PUPIL.saccadeMin);
		expect(hi.wait).toBe(PUPIL.saccadeMax);
	});
});

describe('frame budget', () => {
	it('draws every frame while settling, ~30 fps otherwise', () => {
		expect(shouldDraw(0.001, true)).toBe(true);
		expect(shouldDraw(0.016, false)).toBe(false);
		expect(shouldDraw(0.034, false)).toBe(true);
	});
});
