/**
 * Browser time zone for greetings only (same `tz` cookie the parent Today page
 * uses; read on the server with safeTimeZone() from #lib/custody/today.js).
 * Weeks for insights and "done today" stay UTC.
 */
export function rememberTimeZone(current: string | null | undefined): void {
	try {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (tz && tz !== current) {
			document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
		}
	} catch {
		// No Intl time zone support: greetings fall back to UTC.
	}
}
