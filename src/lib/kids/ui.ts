/**
 * Shared look for the kids' space (no new packages, no external fonts):
 * a rounded system font where available (macOS/iOS `ui-rounded`), else the app's Geist.
 * Apply with `style="font-family: {KID_FONT}"` on a page root (and on portalled dialogs).
 */
export const KID_FONT =
	"ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', 'Geist Variable', system-ui, sans-serif";

/** Visible, thick focus ring for big kid buttons. */
export const KID_FOCUS =
	'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-kid-background';
