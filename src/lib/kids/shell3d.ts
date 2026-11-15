/**
 * The kids' four shell colours (pet.ts SHELL_COLORS) as full shell palettes for
 * the 3D Pebble and its drawn fallback. Hand-tuned per colour so the plates, the
 * grooves between them and the light rim all read well with the cartoon shading.
 * "Forest" is the default green shell, so a new child sees the familiar Pebble.
 */
import { DEFAULT_SHELL, type ShellPalette } from '#lib/components/pebble/shell.js';
import type { ShellColorKey } from './pet.js';

export const SHELL_3D: Record<ShellColorKey, ShellPalette> = {
	forest: DEFAULT_SHELL,
	ocean: { seam: '#1f4f78', plate: '#3b78a8', plateLight: '#5a97c6', rim: '#9cc6e6' },
	sunset: { seam: '#8a4a14', plate: '#d9823b', plateLight: '#eda05c', rim: '#f5c58f' },
	berry: { seam: '#4f2f6a', plate: '#8a5ba8', plateLight: '#a87cc4', rim: '#cdb1e0' }
};

/** Shell palette for a saved colour key (unknown keys get the default green). */
export function shell3d(key: string | null | undefined): ShellPalette {
	return SHELL_3D[key as ShellColorKey] ?? DEFAULT_SHELL;
}
