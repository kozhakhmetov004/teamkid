/**
 * When may we load the 3D turtle? Only in the browser, with a fine pointer
 * (mouse/trackpad), without reduced motion, and with WebGL available.
 * Everyone else keeps the SVG and never downloads three.js.
 */
export function canUse3D(): boolean {
	if (typeof window === 'undefined' || typeof document === 'undefined') return false;
	if (!window.matchMedia?.('(pointer: fine)').matches) return false;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
		if (!gl) return false;
		gl.getExtension('WEBGL_lose_context')?.loseContext();
		return true;
	} catch {
		return false;
	}
}

/** Runs `fn` when the browser is idle (or after a short delay). Returns a cancel function. */
export function whenIdle(fn: () => void, timeoutMs = 2500): () => void {
	if (typeof window.requestIdleCallback === 'function') {
		const id = window.requestIdleCallback(fn, { timeout: timeoutMs });
		return () => window.cancelIdleCallback(id);
	}
	const t = window.setTimeout(fn, 800);
	return () => window.clearTimeout(t);
}
