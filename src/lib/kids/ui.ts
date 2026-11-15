/**
 * Shared look for the kids' space: Nunito (self-hosted via @fontsource, loaded by
 * KidShell, no external requests), then rounded system fonts.
 * KidShell already applies it; also set `style="font-family: {KID_FONT}"` on
 * portalled dialogs, which render outside the shell. The rest of the design kit
 * lives in src/lib/components/kids/ui/ (kid.css + components).
 */
export const KID_FONT =
	"'Nunito Variable', ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', system-ui, sans-serif";

/** Visible, thick focus ring for big kid buttons. */
export const KID_FOCUS =
	'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-kid-background';
