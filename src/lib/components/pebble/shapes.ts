/**
 * Pebble the turtle, built in code (no external models or textures, no network
 * requests). Follows the team's character sheet:
 *
 *  - stands upright like a little kid: big round head, short legs, three-finger hands
 *  - head, torso, belly and shell are SCULPTED surfaces (a dense sphere pushed into
 *    shape by a function), not plain spheres: wide cheeks and a soft muzzle, a pear
 *    shaped tummy, a shield shaped plastron, a domed shell with a flared lip
 *  - shell plates are raised bumps with grooved seams in the shell surface itself
 *  - head spots, cheek blush and belly scute lines are painted into vertex colours,
 *    so they are soft like the illustration instead of stuck-on discs
 *  - friendly round eyes (white rim, brown iris, two highlights), tiny nostrils, a wide smile
 *  - sculpted arms (chubby shoulder, slim wrist, mitten hand) with three stubby fingers
 *  - orange bandana with a white star and a little knot
 *  - toon shading (4-step ramp generated here), dark inverted-hull outline,
 *    soft ground shadow
 *
 * Scene graph:  stage ─┬─ root (spins / lifts) ─┬─ body (shell, torso, belly, legs, bandana)
 *                      │                        │    ├─ armL (shoulder pivot)
 *                      │                        │    └─ armR (shoulder pivot, waves)
 *                      │                        └─ head (neck pivot) ── skull, eyes, nose, smile
 *                      └─ shadow (stays on the ground)
 *
 * Only ever imported via PebbleScene.svelte (lazy chunk).
 */
import {
	BackSide,
	BufferAttribute,
	CapsuleGeometry,
	CircleGeometry,
	Color,
	ConeGeometry,
	DataTexture,
	ExtrudeGeometry,
	Group,
	Mesh,
	MeshBasicMaterial,
	MeshToonMaterial,
	NearestFilter,
	RGBAFormat,
	Shape,
	SphereGeometry,
	TorusGeometry,
	Vector3,
	type BufferGeometry,
	type Material
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const COLORS = {
	skin: '#9fc873',
	skinDark: '#8fbc63', // arms and legs, a touch darker than the body
	spot: '#79a64e',
	shellSeam: '#335f28', // grooves between plates
	shellPlate: '#558f40',
	shellPlateLight: '#6aa851', // plate centres catch more light
	shellRim: '#8dbb63',
	belly: '#f8e9c4',
	bellyLine: '#d6bd86',
	bandana: '#ff6b0f',
	star: '#ffffff',
	sclera: '#fffaf0',
	iris: '#6b4428',
	pupil: '#22160e',
	highlight: '#ffffff',
	nose: '#3d5a2a',
	mouth: '#2b3a22',
	blush: '#f6ad9c',
	claw: '#f4e8c6',
	outline: '#1f3318',
	shadow: '#0f3a30'
} as const;

/** Resting angle of each arm away from the body (radians). */
export const ARM_REST = 0.38;

/** 4-step toon ramp as a tiny in-memory texture. */
function toonRamp(): DataTexture {
	const steps = [110, 175, 225, 255];
	const data = new Uint8Array(steps.length * 4);
	steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
	const tex = new DataTexture(data, steps.length, 1, RGBAFormat);
	tex.minFilter = NearestFilter;
	tex.magFilter = NearestFilter;
	tex.generateMipmaps = false;
	tex.needsUpdate = true;
	return tex;
}

// ---------------------------------------------------------------------------
// Sculpting: a shape is a function from a unit direction to a surface point.
// ---------------------------------------------------------------------------
type ShapeFn = (d: Vector3) => Vector3;
type Rgb = [number, number, number];

const smoothstep = (a: number, b: number, v: number) => {
	const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
	a[0] + (b[0] - a[0]) * t,
	a[1] + (b[1] - a[1]) * t,
	a[2] + (b[2] - a[2]) * t
];
/** Linear RGB (what vertex colours expect), from a hex colour. */
const rgb = (hex: string): Rgb => {
	const c = new Color(hex);
	return [c.r, c.g, c.b];
};
/** Unit direction: theta around Y (0 = facing the camera), phi = latitude, in degrees. */
const dirAt = (thetaDeg: number, phiDeg: number) => {
	const t = (thetaDeg * Math.PI) / 180;
	const p = (phiDeg * Math.PI) / 180;
	return new Vector3(Math.cos(p) * Math.sin(t), Math.sin(p), Math.cos(p) * Math.cos(t));
};
/** Angle between two unit vectors. */
const angle = (a: Vector3, b: Vector3) => Math.acos(Math.min(1, Math.max(-1, a.dot(b))));

/**
 * A dense, seamless sphere pushed into shape by `fn`, with smooth normals.
 * `paint` (optional) gives each vertex a colour from its original direction.
 * The original direction is also kept as the `sculptDir` attribute, so crisp
 * patterns (shell seams, belly lines) can be drawn per pixel in the shader.
 */
function sculpt(fn: ShapeFn, segments: number, paint?: (d: Vector3) => Rgb) {
	const sphere = new SphereGeometry(1, segments, Math.round(segments * 0.75));
	sphere.deleteAttribute('uv');
	sphere.deleteAttribute('normal');
	const geo = mergeVertices(sphere);
	sphere.dispose();
	const pos = geo.getAttribute('position');
	const dirs: Vector3[] = [];
	const colors = paint ? new Float32Array(pos.count * 3) : null;
	const d = new Vector3();
	for (let i = 0; i < pos.count; i++) {
		d.fromBufferAttribute(pos, i).normalize();
		dirs.push(d.clone());
		const p = fn(d);
		pos.setXYZ(i, p.x, p.y, p.z);
		if (colors && paint) colors.set(paint(d), i * 3);
	}
	if (colors) geo.setAttribute('color', new BufferAttribute(colors, 3));
	geo.setAttribute(
		'sculptDir',
		new BufferAttribute(Float32Array.from(dirs.flatMap((v) => [v.x, v.y, v.z])), 3)
	);
	geo.computeVertexNormals();
	return { geo, dirs };
}

/** Point and outward normal on a sculpted surface (normal from finite differences). */
function surfaceAt(fn: ShapeFn, thetaDeg: number, phiDeg: number) {
	const e = 0.15;
	const position = fn(dirAt(thetaDeg, phiDeg));
	const dt = fn(dirAt(thetaDeg + e, phiDeg)).sub(fn(dirAt(thetaDeg - e, phiDeg)));
	const dp = fn(dirAt(thetaDeg, phiDeg + e)).sub(fn(dirAt(thetaDeg, phiDeg - e)));
	const normal = new Vector3().crossVectors(dt, dp).normalize();
	if (normal.dot(position) < 0) normal.negate();
	return { position, normal };
}

// ---- head: a perfectly round ball ----------------------------------------------------
const HEAD_RADIUS = 0.64;
const headShape: ShapeFn = ({ x, y, z }) =>
	new Vector3(x * HEAD_RADIUS, y * HEAD_RADIUS, z * HEAD_RADIUS);
const HEAD_SPOTS = [
	{ dir: dirAt(-16, 62), r: 0.2 },
	{ dir: dirAt(22, 70), r: 0.15 },
	{ dir: dirAt(42, 50), r: 0.1 },
	{ dir: dirAt(-44, 76), r: 0.09 },
	{ dir: dirAt(150, 55), r: 0.16 },
	{ dir: dirAt(-140, 40), r: 0.12 }
];
const CHEEKS = [dirAt(-46, -24), dirAt(46, -24)];

// ---- torso: pear shaped, narrower at the neck (the plastron in front is the tummy) ----
const torsoShape: ShapeFn = ({ x, y, z }) => {
	const pear = (1 - 0.12 * y) * (1 - 0.18 * Math.max(0, y) ** 2);
	return new Vector3(0.56 * x * pear, 0.58 * y, 0.42 * z * pear);
};

// ---- plastron: a big cream shield, wider at the top; scute lines drawn per pixel ------
const BELLY = { center: new Vector3(0, -0.5, 0.17), radii: new Vector3(0.46, 0.52, 0.33) };
const bellyShape: ShapeFn = ({ x, y, z }) => {
	const shield = 1 + 0.12 * y;
	const pz = z > 0 ? z * (1 - 0.08 * z * z) : z;
	return new Vector3(BELLY.radii.x * x * shield, BELLY.radii.y * y, BELLY.radii.z * pz);
};
const BELLY_GLSL = /* glsl */ `
	float lw = 0.0;
	float ay = max(fwidth(d.y), 0.002) * 1.2;
	float ax = max(fwidth(d.x), 0.002) * 1.2;
	lw = max(lw, 1.0 - smoothstep(0.014 - ay, 0.014 + ay, abs(d.y - 0.42)));
	lw = max(lw, 1.0 - smoothstep(0.014 - ay, 0.014 + ay, abs(d.y)));
	lw = max(lw, 1.0 - smoothstep(0.014 - ay, 0.014 + ay, abs(d.y + 0.42)));
	lw = max(lw, (1.0 - smoothstep(0.014 - ax, 0.014 + ax, abs(d.x))) * step(abs(d.y), 0.85));
	lw *= smoothstep(0.1, 0.3, d.z);
	vec3 patternColor = mix(bellyC, lineC, lw);
`;

// ---- shell: dome on the back, flat where it meets the body, flared lip, raised plates --
/** Plate centres, laid out as seen from behind (x, y on the unit disc). */
const SCUTES: Vector3[] = [
	// centre column
	[0, 0.56],
	[0, 0.19],
	[0, -0.19],
	[0, -0.56],
	// side plates
	...[-1, 1].flatMap((s) => [
		[s * 0.46, 0.38],
		[s * 0.52, 0],
		[s * 0.44, -0.38]
	]),
	// small plates around the edge
	...Array.from({ length: 14 }, (_, i) => {
		const a = (i / 14) * Math.PI * 2 + Math.PI / 14;
		return [Math.cos(a) * 0.87, Math.sin(a) * 0.87];
	})
].map(([x, y]) => new Vector3(x, y, -Math.sqrt(Math.max(0, 1 - x * x - y * y))).normalize());

/** Nearest plate and how far from its edge (radians; 0 = on a seam). */
function scuteAt(d: Vector3) {
	let index = -1;
	let a1 = Infinity;
	let a2 = Infinity;
	SCUTES.forEach((c, i) => {
		const a = angle(d, c);
		if (a < a1) {
			a2 = a1;
			a1 = a;
			index = i;
		} else if (a < a2) a2 = a;
	});
	return { index, edge: a2 - a1 };
}
/**
 * Shell colours per pixel: nearest plate centre (Voronoi on the direction), a crisp
 * anti-aliased seam, lighter plate centres, light lip, and the proud shine.
 */
const SHELL_GLSL = /* glsl */ `
	float back = smoothstep(0.18, 0.34, -d.z);
	float a1 = 10.0;
	float a2 = 10.0;
	vec3 best = vec3(0.0, 0.0, -1.0);
	for (int i = 0; i < SCUTE_COUNT; i++) {
		float a = acos(clamp(dot(d, scutes[i]), -1.0, 1.0));
		if (a < a1) { a2 = a1; a1 = a; best = scutes[i]; }
		else if (a < a2) { a2 = a; }
	}
	float edge = a2 - a1;
	float aa = max(fwidth(edge), 0.002);
	float onPlate = smoothstep(0.018 - aa, 0.018 + aa, edge);
	vec3 plate = mix(plateC, plateLightC, smoothstep(0.08, 0.32, edge));
	vec3 patternColor = mix(lipC, mix(seamC, plate, onPlate), back);
	if (shine >= 0.0) {
		float sweep = max(0.0, 1.0 - abs(sin(atan(best.x, best.z) * 0.5 - shine * PI)) * 3.0);
		patternColor += back * onPlate * sweep * vec3(0.3, 0.36, 0.16);
	}
`;

/** 0 on the lip and the side facing the body, 1 on the back where the plates are. */
const shellBack = (z: number) => smoothstep(0.18, 0.34, -z);

const shellShape: ShapeFn = (d) => {
	const { x, y, z } = d;
	const flare = 0.07 * Math.exp(-((z / 0.16) ** 2));
	const back = shellBack(z);
	let k = 1;
	if (back > 0) {
		const { edge } = scuteAt(d);
		k += back * (0.04 * smoothstep(0, 0.22, edge) - 0.014);
	}
	return new Vector3(x * (0.74 + flare) * k, y * (0.72 + flare) * k, (z > 0 ? 0.14 : 0.58) * z * k);
};

export interface Turtle {
	stage: Group;
	root: Group;
	body: Group;
	head: Group;
	eyes: Group;
	/** resting position of the eyes group (look offsets are added to it) */
	eyeBase: { x: number; y: number };
	eyeballs: Mesh[];
	/** pupils (inside each eye, local units) with their resting position; slid by the animation */
	pupils: { mesh: Mesh; base: Vector3 }[];
	/** shoulder pivots; rotation.z = ±ARM_REST at rest, armR waves */
	armL: Group;
	armR: Group;
	shadow: Mesh;
	/** Proud mood: a highlight sweeping round the shell plates (0..1), or -1 for none. */
	setShine: (shine: number) => void;
	dispose: () => void;
}

export function buildTurtle(): Turtle {
	const ramp = toonRamp();
	const geometries: BufferGeometry[] = [];
	const materials: Material[] = [];
	const track = <T extends BufferGeometry>(g: T) => (geometries.push(g), g);
	const toon = (color: string, vertexColors = false) => {
		const m = new MeshToonMaterial({
			color: new Color(vertexColors ? '#ffffff' : color),
			gradientMap: ramp,
			vertexColors
		});
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

	/**
	 * Toon material whose colour comes from GLSL (`patternColor`), computed per pixel
	 * from the sculpted surface's original direction `d`. Keeps lines sharp at any zoom.
	 */
	const patternToon = (
		key: string,
		declarations: string,
		glsl: string,
		uniforms: Record<string, { value: unknown }>
	) => {
		const m = new MeshToonMaterial({ color: new Color('#ffffff'), gradientMap: ramp });
		m.onBeforeCompile = (shader) => {
			Object.assign(shader.uniforms, uniforms);
			shader.vertexShader =
				'attribute vec3 sculptDir;\nvarying vec3 vSculptDir;\n' +
				shader.vertexShader.replace(
					'#include <begin_vertex>',
					'#include <begin_vertex>\nvSculptDir = sculptDir;'
				);
			shader.fragmentShader =
				`varying vec3 vSculptDir;\n${declarations}\n` +
				shader.fragmentShader.replace(
					'#include <color_fragment>',
					`#include <color_fragment>\n{ vec3 d = normalize(vSculptDir);\n${glsl}\ndiffuseColor.rgb *= patternColor; }`
				);
		};
		m.customProgramCacheKey = () => `pebble-${key}`;
		materials.push(m);
		return m;
	};

	/** Inverted-hull outline: a slightly bigger back-faced copy in the outline colour. */
	const withOutline = (mesh: Mesh, thickness = 0.045) => {
		const hull = new Mesh(mesh.geometry, outlineMat);
		hull.scale.setScalar(1 + thickness);
		hull.renderOrder = -1;
		mesh.add(hull);
		return mesh;
	};

	const skin = toon(COLORS.skin);
	const limb = toon(COLORS.skinDark);
	const claw = toon(COLORS.claw);
	const sphere = track(new SphereGeometry(1, 32, 24));
	const nub = track(new SphereGeometry(1, 14, 10));

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
	shadow.position.set(0, -1.35, 0.05);
	shadow.scale.set(1.15, 0.55, 1);
	stage.add(shadow);

	// ---- shell: sculpted dome with raised plates; seams, plates and lip drawn per pixel ---
	const shine = { value: -1 };
	const shellMat = patternToon(
		'shell',
		`#define SCUTE_COUNT ${SCUTES.length}
uniform vec3 scutes[SCUTE_COUNT];
uniform vec3 seamC;
uniform vec3 plateC;
uniform vec3 plateLightC;
uniform vec3 lipC;
uniform float shine;`,
		SHELL_GLSL,
		{
			scutes: { value: SCUTES },
			seamC: { value: new Color(COLORS.shellSeam) },
			plateC: { value: new Color(COLORS.shellPlate) },
			plateLightC: { value: new Color(COLORS.shellPlateLight) },
			lipC: { value: new Color(COLORS.shellRim) },
			shine
		}
	);
	const shell = withOutline(new Mesh(track(sculpt(shellShape, 128).geo), shellMat), 0.025);
	shell.position.set(0, -0.48, -0.2);
	body.add(shell);
	const setShine = (value: number) => {
		shine.value = value;
	};

	// ---- torso and plastron ---------------------------------------------------------------
	const torso = withOutline(new Mesh(track(sculpt(torsoShape, 64).geo), skin), 0.03);
	torso.position.set(0, -0.5, 0);
	body.add(torso);

	const bellyMat = patternToon('belly', 'uniform vec3 bellyC;\nuniform vec3 lineC;', BELLY_GLSL, {
		bellyC: { value: new Color(COLORS.belly) },
		lineC: { value: new Color(COLORS.bellyLine) }
	});
	const belly = withOutline(new Mesh(track(sculpt(bellyShape, 96).geo), bellyMat), 0.03);
	belly.position.copy(BELLY.center);
	body.add(belly);

	// ---- legs and feet with three pale toes -------------------------------------------
	const legGeo = track(new CapsuleGeometry(0.16, 0.12, 6, 16));
	for (const side of [-1, 1]) {
		const leg = withOutline(new Mesh(legGeo, limb), 0.05);
		leg.position.set(side * 0.27, -1.06, 0.02);
		const foot = withOutline(new Mesh(sphere, limb), 0.05);
		foot.scale.set(0.2, 0.11, 0.25);
		foot.position.set(side * 0.29, -1.23, 0.1);
		body.add(leg, foot);
		for (const dx of [-0.09, 0, 0.09]) {
			const toe = new Mesh(nub, claw);
			toe.scale.setScalar(0.045);
			toe.position.set(side * 0.29 + dx, -1.25, 0.33 - Math.abs(dx) * 0.35);
			body.add(toe);
		}
	}

	// ---- arms: one sculpted piece from shoulder to mitten, plus three stubby fingers ---
	// chubby at the shoulder, slimmer wrist, then a wider, flatter mitten-like hand
	const armShape: ShapeFn = ({ x, y, z }) => {
		const s = (1 - y) / 2; // 0 at the shoulder, 1 at the hand
		const girth =
			1 -
			0.2 * Math.exp(-(((s - 0.55) / 0.18) ** 2)) + // wrist
			0.28 * Math.exp(-(((s - 0.85) / 0.14) ** 2)); // hand
		const flatHand = 1 - 0.3 * Math.exp(-(((s - 0.85) / 0.16) ** 2));
		return new Vector3(0.135 * girth * x, 0.27 * y, 0.125 * girth * flatHand * z);
	};
	const armGeo = track(sculpt(armShape, 40).geo);
	const fingerGeo = track(new CapsuleGeometry(0.034, 0.05, 4, 12));
	const makeArm = (side: -1 | 1) => {
		const pivot = new Group();
		pivot.position.set(side * 0.45, -0.22, 0.06);
		pivot.rotation.set(-0.15, 0, side * ARM_REST);
		const arm = withOutline(new Mesh(armGeo, limb), 0.05);
		arm.position.set(0, -0.25, 0); // geometry is centred, so the outline stays even
		pivot.add(arm);
		// three short fingers fanning out from the mitten, each with a pale rounded tip
		for (const [dx, tilt, len] of [
			[-0.065, 0.32, 0.9],
			[0, 0, 1],
			[0.065, -0.32, 0.9]
		]) {
			const finger = withOutline(new Mesh(fingerGeo, limb), 0.08);
			finger.scale.set(1, len, 1);
			finger.rotation.z = tilt;
			finger.position.set(dx, -0.5 - 0.02 * len, 0.03);
			const tip = new Mesh(nub, claw);
			tip.scale.set(0.034, 0.03 / len, 0.03);
			tip.position.set(0, -0.045, 0.01);
			finger.add(tip);
			pivot.add(finger);
		}
		body.add(pivot);
		return pivot;
	};
	const armL = makeArm(-1);
	const armR = makeArm(1);

	// ---- little tail ---------------------------------------------------------------------
	const tail = withOutline(new Mesh(track(new ConeGeometry(0.09, 0.26, 12)), limb), 0.08);
	tail.rotation.x = -Math.PI / 2 - 0.3;
	tail.position.set(0, -1.06, -0.6);
	body.add(tail);

	// ---- orange bandana: collar, triangle with a white star, little knot -------------
	const bandana = toon(COLORS.bandana);
	const collar = withOutline(new Mesh(track(new TorusGeometry(0.27, 0.07, 10, 40)), bandana), 0.06);
	collar.rotation.x = Math.PI / 2 + 0.2; // droops a little at the front
	collar.position.set(0, 0.06, 0.04);
	body.add(collar);

	const scarf = new Group();
	scarf.position.set(0, 0, 0.32);
	scarf.rotation.x = -0.75; // lies on the chest
	body.add(scarf);
	const tri = new Shape();
	tri.moveTo(-0.28, 0.12);
	tri.quadraticCurveTo(0, 0.08, 0.28, 0.12);
	tri.quadraticCurveTo(0.12, -0.04, 0.02, -0.22);
	tri.quadraticCurveTo(0, -0.25, -0.02, -0.22);
	tri.quadraticCurveTo(-0.12, -0.04, -0.28, 0.12);
	const triGeo = track(
		new ExtrudeGeometry(tri, {
			depth: 0.03,
			bevelEnabled: true,
			bevelThickness: 0.012,
			bevelSize: 0.012,
			bevelSegments: 2,
			curveSegments: 10
		})
	);
	triGeo.translate(0, 0, -0.015);
	const triangle = withOutline(new Mesh(triGeo, bandana), 0.05);
	triangle.position.set(0, -0.12, 0);
	scarf.add(triangle);

	const star = new Shape();
	for (let i = 0; i < 10; i++) {
		const r = i % 2 === 0 ? 0.075 : 0.032;
		const a = Math.PI / 2 + (i * Math.PI) / 5;
		if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
		else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
	}
	star.closePath();
	const starMesh = new Mesh(
		track(new ExtrudeGeometry(star, { depth: 0.012, bevelEnabled: false })),
		flat(COLORS.star)
	);
	starMesh.position.set(0, -0.1, 0.03);
	scarf.add(starMesh);

	const knot = withOutline(new Mesh(nub, bandana), 0.1);
	knot.scale.setScalar(0.045);
	knot.position.set(0, -0.35, 0.03);
	scarf.add(knot);
	const tailGeo = track(new ConeGeometry(0.03, 0.11, 8));
	for (const side of [-1, 1]) {
		const end = withOutline(new Mesh(tailGeo, bandana), 0.1);
		end.rotation.z = Math.PI + side * 0.45;
		end.position.set(side * 0.035, -0.41, 0.03);
		scarf.add(end);
	}

	// ---- head: sculpted skull with painted spots and blush --------------------------------
	head.position.set(0, 0.12, 0.04); // neck pivot
	const SKULL = new Vector3(0, 0.54, 0.02);
	const skinRgb = rgb(COLORS.skin);
	const spotRgb = rgb(COLORS.spot);
	const blushRgb = rgb(COLORS.blush);
	const skull = withOutline(
		new Mesh(
			track(
				sculpt(headShape, 112, (d) => {
					let spot = 0;
					for (const s of HEAD_SPOTS)
						spot = Math.max(spot, 1 - smoothstep(s.r * 0.7, s.r, angle(d, s.dir)));
					let c = mix(skinRgb, spotRgb, spot);
					for (const cheek of CHEEKS)
						c = mix(c, blushRgb, Math.exp(-((angle(d, cheek) / 0.26) ** 2)));
					return c;
				}).geo
			),
			toon('', true)
		),
		0.03
	);
	skull.position.copy(SKULL);
	head.add(skull);

	/** Put a face part on the skull surface, facing out along its normal. */
	const onFace = (mesh: Mesh, thetaDeg: number, phiDeg: number, lift: number) => {
		const { position, normal } = surfaceAt(headShape, thetaDeg, phiDeg);
		mesh.position.copy(position.add(SKULL).add(normal.clone().multiplyScalar(lift)));
		mesh.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);
		return normal;
	};

	// friendly round eyes: thin white rim, warm brown iris, dark pupil, a big highlight
	// up and to the right plus a small one down and to the left (blink squashes it all)
	const eyeSpot = surfaceAt(headShape, 27, -8); // low and wide apart: big forehead, baby face
	const eyeBase = { x: 0, y: SKULL.y + eyeSpot.position.y };
	const eyes = new Group();
	eyes.position.set(eyeBase.x, eyeBase.y, SKULL.z + eyeSpot.position.z - 0.03);
	head.add(eyes);
	const scleraMat = flat(COLORS.sclera);
	const irisMat = flat(COLORS.iris);
	const pupilMat = flat(COLORS.pupil);
	const highlightMat = flat(COLORS.highlight);
	const eyeballs: Mesh[] = [];
	const pupils: Turtle['pupils'] = [];
	// real size lives in the geometry: the blink animation sets scale.y (1 = open)
	const E = 1.25; // eye size; cute = big eyes with big pupils and big highlights
	const eyeGeo = track(new SphereGeometry(0.13 * E, 32, 24));
	for (const side of [-1, 1]) {
		const eye = withOutline(new Mesh(eyeGeo, scleraMat), 0.07);
		eye.scale.set(1, 1, 0.42);
		eye.position.set(side * eyeSpot.position.x, 0, 0);
		// turn slightly outward with the curve of the face
		const n = eyeSpot.normal.clone();
		n.x *= side;
		eye.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), n.lerp(new Vector3(0, 0, 1), 0.4));
		// children are in the eye's local units (z is squashed by 0.42)
		const iris = new Mesh(sphere, irisMat);
		iris.scale.set(0.11 * E, 0.11 * E, 0.071 * E);
		iris.position.set(0, -0.004 * E, 0.088 * E);
		const pupil = new Mesh(sphere, pupilMat);
		pupil.scale.set(0.076 * E, 0.076 * E, 0.052 * E);
		pupil.position.set(0, -0.006 * E, 0.12 * E);
		const highlight = new Mesh(sphere, highlightMat);
		highlight.scale.set(0.04 * E, 0.038 * E, 0.02 * E);
		highlight.position.set(0.036 * E, 0.04 * E, 0.175 * E);
		const sparkle = new Mesh(sphere, highlightMat);
		sparkle.scale.set(0.018 * E, 0.018 * E, 0.012 * E);
		sparkle.position.set(-0.042 * E, -0.046 * E, 0.17 * E);
		eye.add(iris, pupil, highlight, sparkle);
		pupils.push({ mesh: pupil, base: pupil.position.clone() });
		eyes.add(eye);
		eyeballs.push(eye);
	}

	// two tiny nostrils on the muzzle
	const noseMat = flat(COLORS.nose);
	for (const side of [-1, 1]) {
		const nostril = new Mesh(nub, noseMat);
		nostril.scale.set(0.013, 0.01, 0.006);
		onFace(nostril, side * 4, -17, 0.002);
		head.add(nostril);
	}

	// small happy smile, tucked close under the eyes (a small, high mouth reads as cute)
	const smile = new Mesh(
		track(new TorusGeometry(0.08, 0.019, 8, 24, Math.PI * 0.8)),
		flat(COLORS.mouth)
	);
	const chin = surfaceAt(headShape, 0, -31).position.add(SKULL);
	smile.rotation.z = Math.PI * 1.1;
	smile.position.set(0, chin.y + 0.08, chin.z + 0.012);
	head.add(smile);

	return {
		stage,
		root,
		body,
		head,
		eyes,
		eyeBase,
		eyeballs,
		pupils,
		armL,
		armR,
		shadow,
		setShine,
		dispose() {
			geometries.forEach((g) => g.dispose());
			materials.forEach((m) => m.dispose());
			ramp.dispose();
		}
	};
}
