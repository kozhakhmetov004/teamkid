// Creates .env for LOCAL development from `supabase status -o env`.
// Usage: pnpm env:local   (refuses to overwrite an existing .env unless --force)
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const force = process.argv.includes('--force');
if (existsSync('.env') && !force) {
	console.error('.env already exists. Re-run with --force to overwrite it.');
	process.exit(1);
}

const status = execSync('pnpm exec supabase status -o env', { encoding: 'utf8' });
const vars = Object.fromEntries(
	status
		.split(/\r?\n/)
		.map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
		.filter(Boolean)
		.map((m) => [m[1], m[2]])
);
if (!vars.API_URL || !vars.ANON_KEY || !vars.SERVICE_ROLE_KEY) {
	console.error('Could not read Supabase status. Is `pnpm db:start` running?');
	process.exit(1);
}

const local = {
	PUBLIC_SUPABASE_URL: vars.API_URL,
	PUBLIC_SUPABASE_ANON_KEY: vars.ANON_KEY,
	SUPABASE_SERVICE_ROLE_KEY: vars.SERVICE_ROLE_KEY,
	KID_AUTH_SECRET: randomBytes(32).toString('hex'),
	LLM_PROVIDER: 'anthropic'
};

const template = readFileSync('.env.example', 'utf8');
const out = template
	.split(/\r?\n/)
	.map((line) => {
		const m = line.match(/^([A-Z_]+)=(.*)$/);
		return m && local[m[1]] !== undefined ? `${m[1]}=${local[m[1]]}` : line;
	})
	.join('\n');
writeFileSync('.env', out);
console.log(
	'Wrote .env for local Supabase (' + vars.API_URL + '). Add LLM_API_KEY if you have one.'
);
