/**
 * Colours of Pebble's shell (3D model and the SVG fallback). Pure data, no three.js,
 * so the page chunk can import it without pulling in the 3D code.
 */
export interface ShellPalette {
	/** grooves between the plates */
	seam: string;
	/** the plates */
	plate: string;
	/** plate centres (they catch more light) */
	plateLight: string;
	/** the light lip around the shell's edge */
	rim: string;
}

/** The default green shell (landing page, and the kids' "Forest green"). */
export const DEFAULT_SHELL: ShellPalette = {
	seam: '#335f28',
	plate: '#558f40',
	plateLight: '#6aa851',
	rim: '#8dbb63'
};
