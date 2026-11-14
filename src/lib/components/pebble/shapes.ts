/**
 * Pebble the turtle, built in code from simple shapes (original design, no
 * external models or textures, no network requests).
 *
 * Look: round lime head, dark green hexagon-plate shell with lighter seams
 * and a lighter rim, cream belly, dark eyes with two highlights, small "u"
 * smile, blush, a little tail, toon shading (4-step ramp generated here), a
 * dark inverted-hull outline and a soft ground shadow.
 *
 * Scene graph:  stage ─┬─ root (spins / lifts) ─┬─ body (shell, belly, limbs, tail)
 *                      │                        └─ head (neck pivot) ── eyes, smile, blush
 *                      └─ shadow (stays on the ground)
 *
 * Only ever imported via PebbleScene.svelte (lazy chunk).
 */
import {
	BackSide,
	BoxGeometry,
	CapsuleGeometry,
	CircleGeometry,
	Color,
	ConeGeometry,
	CylinderGeometry,
	DataTexture,
	Group,
	Mesh,
	MeshBasicMaterial,
	MeshToonMaterial,
	NearestFilter,
	RGBAFormat,
	SphereGeometry,
	TorusGeometry,
	Vector3,
	type BufferGeometry,
	type Material
} from 'three';

export const COLORS = {
	lime: '#a6d96a',
	limeDark: '#8cc152',
	shellSeam: '#5a8a44', // lighter seams between plates
	shellRim: '#7fb35a', // the lip where the shell meets the belly
	shellPlate: '#2e4a1e', // dark green plates
	belly: '#fff3d6',
	bellyLine: '#e8d6aa',
	eye: '#1d2a24',
	highlight: '#ffffff',
	blush: '#f7a8a0',
	outline: '#14231c',
	shadow: '#0f3a30'
} as const;

/** 4-step toon ramp as a tiny in-memory texture. */
function toonRamp(): DataTexture {
	const steps = [95, 165, 220, 255];
	const data = new Uint8Array(steps.length * 4);
	steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
	const tex = new DataTexture(data, steps.length, 1, RGBAFormat);
	tex.minFilter = NearestFilter;
	tex.magFilter = NearestFilter;
	tex.generateMipmaps = false;
	tex.needsUpdate = true;
	return tex;
}

export interface Turtle {
	stage: Group;
	root: Group;
	body: Group;
	head: Group;
	eyes: Group;
	eyeballs: Mesh[];
	shadow: Mesh;
	plates: { mesh: Mesh; material: MeshToonMaterial; angle: number }[];
	dispose: () => void;
}

export function buildTurtle(): Turtle {
	const ramp = toonRamp();
	const geometries: BufferGeometry[] = [];
	const materials: Material[] = [];
	const track = <T extends BufferGeometry>(g: T) => (geometries.push(g), g);
	const toon = (color: string) => {
		const m = new MeshToonMaterial({ color: new Color(color), gradientMap: ramp });
		materials.push(m);
		return m;
	};
	const flat = (color: string, opts: Partial<{ transparent: boolean; opacity: number }> = {}) => {
		const m = new MeshBasicMaterial({ color: new Color(color), ...opts });
		materials.push(m);
		return m;
	};
	const outlineMat = new MeshBasicMaterial({ color: new Color(COLORS.outline), side: BackSide });
	materials.push(outlineMat);

	/** Inverted-hull outline: a slightly bigger back-faced copy in the outline colour. */
	const withOutline = (mesh: Mesh, thickness = 0.045) => {
		const hull = new Mesh(mesh.geometry, outlineMat);
		hull.scale.setScalar(1 + thickness);
		hull.renderOrder = -1;
		mesh.add(hull);
		return mesh;
	};

	const stage = new Group();
	const root = new Group();
	const body = new Group();
	const head = new Group();
	root.add(body, head);
	stage.add(root);

	// ---- soft ground shadow (stays put while the turtle lifts or spins) -------------------
	const shadow = new Mesh(
		track(new CircleGeometry(0.8, 40)),
		flat(COLORS.shadow, { transparent: true, opacity: 0.14 })
	);
	shadow.rotation.x = -Math.PI / 2;
	shadow.position.set(0, -1.32, 0.1);
	shadow.scale.set(1.15, 0.55, 1);
	stage.add(shadow);

	// ---- shell: lighter base (the seams) + dark hexagon plates + rim ---------------------
	const SHELL = new Vector3(0.95, 0.88, 0.72); // ellipsoid radii
	const shell = withOutline(
		new Mesh(track(new SphereGeometry(1, 48, 32)), toon(COLORS.shellSeam)),
		0.035
	);
	shell.scale.copy(SHELL);
	shell.position.set(0, -0.42, -0.05);
	body.add(shell);

	const plateGeo = track(new CylinderGeometry(0.2, 0.2, 0.05, 6));
	const plates: Turtle['plates'] = [];
	const ring = (phiDeg: number, thetas: number[], radius = 1) =>
		thetas.forEach((thetaDeg) => {
			const theta = (thetaDeg * Math.PI) / 180;
			const phi = (phiDeg * Math.PI) / 180;
			// point on the ellipsoid (theta around Y, 0 = facing the camera)
			const p = new Vector3(
				SHELL.x * Math.cos(phi) * Math.sin(theta),
				SHELL.y * Math.sin(phi),
				SHELL.z * Math.cos(phi) * Math.cos(theta)
			);
			const normal = new Vector3(
				p.x / SHELL.x ** 2,
				p.y / SHELL.y ** 2,
				p.z / SHELL.z ** 2
			).normalize();
			const material = toon(COLORS.shellPlate);
			const plate = new Mesh(plateGeo, material);
			plate.scale.set(radius, 1, radius);
			plate.position.copy(p.add(normal.clone().multiplyScalar(0.012))).add(shell.position);
			plate.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), normal);
			body.add(plate);
			plates.push({ mesh: plate, material, angle: theta });
		});
	// three rings of plates all the way round, so the back looks finished when spun
	ring(-12, [-62, -92, -122, -152, 180, 152, 122, 92, 62]);
	ring(24, [-55, -88, -125, 160, 125, 88, 55, -160]);
	ring(58, [-60, 0, 60, 120, 180, -120], 1.1);
	ring(84, [0], 0.9); // crown plate on top

	// rim: a flattened lighter ring around the shell's lower edge
	const rim = withOutline(
		new Mesh(track(new TorusGeometry(0.9, 0.075, 10, 48)), toon(COLORS.shellRim)),
		0.08
	);
	rim.rotation.x = Math.PI / 2;
	rim.scale.set(1, 0.8, 1);
	rim.position.set(0, -0.86, -0.02);
	body.add(rim);

	// ---- cream belly with soft plate lines --------------------------------------------
	const belly = withOutline(
		new Mesh(track(new SphereGeometry(1, 40, 28)), toon(COLORS.belly)),
		0.03
	);
	belly.scale.set(0.62, 0.7, 0.32);
	belly.position.set(0, -0.44, 0.48);
	body.add(belly);
	const lineGeo = track(new BoxGeometry(1, 0.03, 0.02));
	const lineMat = flat(COLORS.bellyLine);
	[
		[-0.2, 0.62],
		[-0.44, 0.76],
		[-0.68, 0.58]
	].forEach(([y, w]) => {
		const line = new Mesh(lineGeo, lineMat);
		line.scale.x = w;
		line.position.set(0, y, 0.79);
		body.add(line);
	});

	// ---- arms, feet and tail -------------------------------------------------------------
	const limbGeo = track(new CapsuleGeometry(0.15, 0.26, 6, 16));
	const limbMat = toon(COLORS.limeDark);
	for (const side of [-1, 1]) {
		const arm = withOutline(new Mesh(limbGeo, limbMat), 0.06);
		arm.position.set(side * 0.86, -0.32, 0.22);
		arm.rotation.z = side * 0.75;
		const foot = withOutline(new Mesh(limbGeo, limbMat), 0.06);
		foot.position.set(side * 0.48, -1.2, 0.2);
		foot.rotation.set(Math.PI / 2, 0, side * 0.25);
		foot.scale.set(1.2, 0.8, 0.7);
		body.add(arm, foot);
	}
	const tail = withOutline(new Mesh(track(new ConeGeometry(0.11, 0.34, 12)), limbMat), 0.08);
	tail.rotation.x = Math.PI / 2 + 0.35;
	tail.position.set(0, -1.02, -0.72);
	body.add(tail);

	// ---- head ----------------------------------------------------------------------------
	head.position.set(0, 0.22, 0.12); // neck pivot
	const skull = withOutline(
		new Mesh(track(new SphereGeometry(0.66, 48, 32)), toon(COLORS.lime)),
		0.035
	);
	skull.scale.set(1, 0.96, 0.92);
	skull.position.set(0, 0.42, 0);
	head.add(skull);

	const eyes = new Group();
	eyes.position.set(0, 0.46, 0.5);
	head.add(eyes);
	const eyeGeo = track(new SphereGeometry(0.12, 24, 16));
	const highlightGeo = track(new SphereGeometry(0.042, 12, 8));
	const sparkleGeo = track(new SphereGeometry(0.02, 8, 6));
	const eyeMat = flat(COLORS.eye);
	const highlightMat = flat(COLORS.highlight);
	const eyeballs: Mesh[] = [];
	for (const side of [-1, 1]) {
		const eye = new Mesh(eyeGeo, eyeMat);
		eye.position.set(side * 0.26, 0, 0.01);
		eye.scale.z = 0.55;
		const highlight = new Mesh(highlightGeo, highlightMat);
		highlight.position.set(0.04, 0.045, 0.1);
		const sparkle = new Mesh(sparkleGeo, highlightMat);
		sparkle.position.set(-0.045, -0.05, 0.1);
		eye.add(highlight, sparkle);
		eyes.add(eye);
		eyeballs.push(eye);
	}

	// small "u" smile: half a thin torus, opening upward
	const smile = new Mesh(track(new TorusGeometry(0.085, 0.02, 8, 24, Math.PI)), flat(COLORS.eye));
	smile.rotation.z = Math.PI;
	smile.position.set(0, 0.26, 0.585);
	head.add(smile);

	// blush cheeks
	const blushGeo = track(new CircleGeometry(0.085, 24));
	const blushMat = flat(COLORS.blush, { transparent: true, opacity: 0.85 });
	for (const side of [-1, 1]) {
		const blush = new Mesh(blushGeo, blushMat);
		blush.position.set(side * 0.37, 0.3, 0.5);
		blush.rotation.y = side * 0.55;
		blush.scale.x = 1.45;
		head.add(blush);
	}

	return {
		stage,
		root,
		body,
		head,
		eyes,
		eyeballs,
		shadow,
		plates,
		dispose() {
			geometries.forEach((g) => g.dispose());
			materials.forEach((m) => m.dispose());
			ramp.dispose();
		}
	};
}
