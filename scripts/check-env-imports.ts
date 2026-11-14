/**
 * Fails (exit 1) if private environment variables are imported outside the
 * allowed server-only locations. SvelteKit already blocks private env from the
 * browser bundle; this keeps the rule stricter and explicit for the team:
 *
 *   `$app/env/private` (and the deprecated `$env/static/private`, `$env/dynamic/private`)
 *   may only be imported in:
 *     - src/lib/server/**
 *     - src/hooks.server.ts
 *     - any +server.ts / +page.server.ts / +layout.server.ts
 *
 * Run: pnpm check:env-imports (also part of pnpm lint)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const PRIVATE_IMPORT =
	/['"](\$app\/env\/private|\$env\/static\/private|\$env\/dynamic\/private)['"]/;
const DEPRECATED_IMPORT = /['"]\$env\/(static|dynamic)\/(private|public)['"]/;

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = join(dir, name);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

function isAllowed(file: string): boolean {
	const rel = relative(ROOT, file).split(sep).join('/');
	return (
		rel.startsWith('src/lib/server/') ||
		rel === 'src/hooks.server.ts' ||
		/\/\+(server|page\.server|layout\.server)\.ts$/.test(rel)
	);
}

const problems: string[] = [];
for (const file of walk(SRC)) {
	if (!/\.(ts|js|svelte)$/.test(file)) continue;
	const rel = relative(ROOT, file).split(sep).join('/');
	const text = readFileSync(file, 'utf8');
	if (PRIVATE_IMPORT.test(text) && !isAllowed(file)) {
		problems.push(`${rel}: imports private env outside a server-only file`);
	}
	if (DEPRECATED_IMPORT.test(text)) {
		problems.push(
			`${rel}: uses deprecated $env/* (SvelteKit 3): import from $app/env/public or #lib/server/env.js`
		);
	}
}

if (problems.length > 0) {
	console.error('Private env import check failed:\n  ' + problems.join('\n  '));
	process.exit(1);
}
console.log('Private env import check passed.');
