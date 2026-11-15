import { describe, expect, it } from 'vitest';
import { DEFAULT_SHELL } from '#lib/components/pebble/shell.js';
import { SHELL_COLORS } from './pet';
import { SHELL_3D, shell3d } from './shell3d';

const HEX = /^#[0-9a-f]{6}$/i;

describe('shell3d', () => {
	it('has a full palette for every colour a kid can pick', () => {
		for (const c of SHELL_COLORS) {
			const p = SHELL_3D[c.key];
			expect(p, c.key).toBeDefined();
			for (const v of [p.seam, p.plate, p.plateLight, p.rim]) expect(v).toMatch(HEX);
		}
	});

	it('forest is the familiar default green shell', () => {
		expect(shell3d('forest')).toEqual(DEFAULT_SHELL);
	});

	it('falls back to the default for unknown or missing keys', () => {
		expect(shell3d('rainbow')).toEqual(DEFAULT_SHELL);
		expect(shell3d(null)).toEqual(DEFAULT_SHELL);
	});

	it('each colour looks different', () => {
		const plates = new Set(Object.values(SHELL_3D).map((p) => p.plate));
		expect(plates.size).toBe(SHELL_COLORS.length);
	});
});
