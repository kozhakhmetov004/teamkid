/**
 * End-to-end smoke test over HTTP (no browser): drives the running app like a
 * user with JavaScript disabled (plain form posts + cookies), and reads
 * magic-link emails from the local Supabase mail catcher (Mailpit).
 *
 *   pnpm db:start && pnpm db:seed
 *   pnpm dev                      # in another terminal (http://localhost:5173)
 *   pnpm test:smoke
 *
 * Env: SMOKE_BASE_URL (default http://localhost:5173), SMOKE_MAIL_URL (default http://127.0.0.1:54324)
 */
import { DEMO } from './lib/demo.js';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:5173';
const MAIL = process.env.SMOKE_MAIL_URL ?? 'http://127.0.0.1:54324';

let passed = 0;
const failures: string[] = [];
function check(ok: boolean, label: string, detail = '') {
	if (ok) {
		passed++;
		console.log(`  ✔ ${label}`);
	} else {
		failures.push(`${label} ${detail}`.trim());
		console.log(`  ✘ ${label} ${detail}`);
	}
}

/** A tiny browser: a cookie jar + fetch with manual redirects. */
class Browser {
	private jar = new Map<string, string>();

	private store(res: Response) {
		for (const raw of res.headers.getSetCookie()) {
			const [pair, ...attrs] = raw.split(';');
			const eq = pair.indexOf('=');
			const name = pair.slice(0, eq).trim();
			const value = pair.slice(eq + 1).trim();
			const expired = attrs.some((a) => /max-age=0\b/i.test(a.trim())) || value === '';
			if (expired) this.jar.delete(name);
			else this.jar.set(name, value);
		}
	}

	private cookieHeader() {
		return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
	}

	async request(url: string, init: RequestInit = {}): Promise<Response> {
		const target = new URL(url, BASE);
		const sameApp = target.origin === new URL(BASE).origin;
		const headers = new Headers(init.headers);
		// Like a real browser: without this SvelteKit answers form posts with a JSON ActionResult.
		headers.set('accept', 'text/html,application/xhtml+xml');
		if (sameApp && this.jar.size) headers.set('cookie', this.cookieHeader());
		if (sameApp && init.method === 'POST') headers.set('origin', new URL(BASE).origin);
		const res = await fetch(target, { ...init, headers, redirect: 'manual' });
		if (sameApp) this.store(res);
		return res;
	}

	get(url: string) {
		return this.request(url);
	}

	post(url: string, fields: Record<string, string>) {
		return this.request(url, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams(fields).toString()
		});
	}

	/** Follow redirects (across origins, e.g. Supabase Auth -> app) and return the final response. */
	async follow(res: Response, max = 10): Promise<{ res: Response; url: string }> {
		let current = res;
		let url = res.url;
		for (let i = 0; i < max && current.status >= 300 && current.status < 400; i++) {
			url = new URL(current.headers.get('location')!, url || BASE).toString();
			current = await this.request(url);
		}
		return { res: current, url };
	}
}

const location = (res: Response) => res.headers.get('location') ?? '';

// ---------------------------------------------------------------------------
// Mailpit helpers
// ---------------------------------------------------------------------------
async function latestMagicLink(email: string, after: number): Promise<string> {
	for (let i = 0; i < 40; i++) {
		const list = await fetch(
			`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`
		).then((r) => r.json());
		const msg = (list.messages ?? []).find(
			(m: { Created: string }) => new Date(m.Created).getTime() >= after - 2000
		);
		if (msg) {
			const full = await fetch(`${MAIL}/api/v1/message/${msg.ID}`).then((r) => r.json());
			const body: string = `${full.HTML ?? ''} ${full.Text ?? ''}`;
			const link = body.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/)?.[0];
			if (link) return link.replaceAll('&amp;', '&');
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error(`no magic link email for ${email}`);
}

async function magicLogin(
	browser: Browser,
	email: string,
	next?: string
): Promise<{ res: Response; url: string }> {
	const started = Date.now();
	const res = await browser.post('/login?/magic', { email, next: next ?? '' });
	if (res.status !== 200) throw new Error(`magic link request failed: ${res.status}`);
	const link = await latestMagicLink(email, started);
	return browser.follow(await browser.get(link));
}

// ---------------------------------------------------------------------------
// Parent core (Member 1): messages, read receipts, AI rewrite endpoint,
// calendar, events, swaps. Swaps are reversed at the end so repeated runs
// leave the custody calendar as seeded.
// ---------------------------------------------------------------------------
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const utcDate = (offsetDays: number) =>
	new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

async function passwordLogin(email: string, password: string): Promise<Browser> {
	const b = new Browser();
	const res = await b.post('/login?/password', { email, password });
	if (res.status !== 303) throw new Error(`login ${email} failed: ${res.status}`);
	return b;
}

/** First pending swap id shown to this parent (from the Accept form on Today). */
async function firstSwapId(b: Browser): Promise<string | null> {
	const html = await (await b.get('/dashboard')).text();
	return html.match(new RegExp(`name="swapId" value="(${UUID})"`))?.[1] ?? null;
}

/** Requests a one-night swap of the first future night that is `who`'s own. */
async function giveFirstOwnNight(b: Browser): Promise<string | null> {
	for (let d = 1; d <= 13; d++) {
		const date = utcDate(d);
		const res = await b.post('/calendar/swap?/create', {
			originalDate: date,
			proposedDate: '',
			note: ''
		});
		if (res.status === 200 && (await res.text()).includes('Swap request sent')) return date;
	}
	return null;
}

async function parentCoreFlows() {
	console.log('\nParent core: messages, AI, calendar, swaps');
	const stamp = Date.now().toString(36);
	const dad = await passwordLogin(DEMO.dad.email, DEMO.dad.password);
	const mom = await passwordLogin(DEMO.mom.email, DEMO.mom.password);

	// Messages
	const list = await (await dad.get('/messages')).text();
	const threadId = list.match(new RegExp(`href="/messages/(${UUID})"`))?.[1];
	check(!!threadId && list.includes('Pickup times'), 'thread list shows the seeded topic');
	const text = `Smoke test ${stamp}: can we move pickup to 6?`;
	const sent = await dad.post(`/messages/${threadId}?/send`, { body: text, aiRewritten: 'false' });
	check(
		sent.status === 200 && (await sent.text()).includes(text),
		'Dad sends a message (no-JS form)'
	);
	const momToday = await (await mom.get('/dashboard')).text();
	check(/\d+ unread/.test(momToday), "Mom's Today shows unread messages");
	const momThread = await (await mom.get(`/messages/${threadId}`)).text();
	check(momThread.includes(text), 'Mom sees the message in the thread');
	const read = await mom.request(`/messages/${threadId}/read`, { method: 'POST' });
	const readBody = (await read.json()) as { marked?: number };
	check(read.status === 200 && (readBody.marked ?? 0) >= 1, 'opening the thread marks it read');
	const dadThread = await (await dad.get(`/messages/${threadId}`)).text();
	check(/Read (today|yesterday|\w+day)/.test(dadThread), 'Dad sees the read receipt');
	const tooLong = await dad.post(`/messages/${threadId}?/send`, { body: 'x'.repeat(4001) });
	check(tooLong.status === 400, 'messages over 4,000 characters are rejected');

	// AI rewrite endpoint (Member 3): reachable; 503 means AI unavailable, which the composer handles.
	const ai = await dad.request('/api/ai/rewrite', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ draft: "You're late AGAIN. This is ridiculous." })
	});
	const aiBody = (await ai.json().catch(() => ({}))) as { rewritten?: string };
	check(
		(ai.status === 200 && typeof aiBody.rewritten === 'string') || ai.status === 503,
		`/api/ai/rewrite answers (${ai.status})`
	);

	// Calendar + events
	const week = await mom.get('/calendar');
	const weekHtml = await week.text();
	check(
		week.status === 200 && weekHtml.includes('With you'),
		'calendar week view shows custody nights'
	);
	const month = await mom.get('/calendar?view=month');
	check(
		month.status === 200 && (await month.text()).includes('Week'),
		'calendar month view renders'
	);
	const eventDate = utcDate(2);
	const title = `Smoke dentist ${stamp}`;
	const created = await mom.post('/calendar?/createEvent', {
		title,
		date: eventDate,
		start: '10:00',
		end: '11:00',
		kind: 'medical',
		place: 'Smile Clinic',
		childId: '',
		notes: ''
	});
	check(created.status === 200, 'Mom adds an event', String(created.status));
	const dadWeek = await (await dad.get(`/calendar?date=${eventDate}`)).text();
	check(dadWeek.includes(title) && dadWeek.includes('Smile Clinic'), 'Dad sees the new event');
	const badEvent = await mom.post('/calendar?/createEvent', {
		title: 'Backwards',
		date: eventDate,
		start: '11:00',
		end: '10:00',
		kind: 'medical'
	});
	check(badEvent.status === 400, 'an event ending before it starts is rejected');

	// Swaps: Dad gives a night -> can't accept own -> Mom accepts -> reverse it.
	const given = await giveFirstOwnNight(dad);
	check(!!given, `Dad requests a swap for his night of ${given}`);
	const dadSwap = await firstSwapId(mom);
	check(!!dadSwap, 'Mom sees the request with Accept / Decline');
	const self = await dad.post('/calendar/swap?/respond', {
		swapId: dadSwap ?? '',
		action: 'accept'
	});
	check(self.status === 409, 'Dad cannot accept his own request', String(self.status));
	const accepted = await mom.post('/calendar/swap?/respond', {
		swapId: dadSwap ?? '',
		action: 'accept'
	});
	check(
		accepted.status === 200 && (await accepted.text()).includes('Swap accepted'),
		'Mom accepts the swap'
	);
	const twice = await mom.post('/calendar/swap?/respond', {
		swapId: dadSwap ?? '',
		action: 'accept'
	});
	check(twice.status === 409, 'a second accept is refused');

	// The night is Mom's now: she can give it back, and Dad accepts (restores the seed).
	const back = await mom.post('/calendar/swap?/create', {
		originalDate: given ?? '',
		proposedDate: '',
		note: ''
	});
	check(
		back.status === 200 && (await back.text()).includes('Swap request sent'),
		'the night moved to Mom (she can give it back)'
	);
	const momSwap = await firstSwapId(dad);
	const restored = await dad.post('/calendar/swap?/respond', {
		swapId: momSwap ?? '',
		action: 'accept'
	});
	check(restored.status === 200, 'Dad accepts the swap back (calendar restored)');
	const schedule = await (await mom.get('/messages')).text();
	check(schedule.includes('Schedule'), 'swaps are recorded in the Schedule thread');
}

// ---------------------------------------------------------------------------
async function main() {
	console.log(`Smoke test against ${BASE}\n`);

	console.log('Health');
	const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
	check(health.ok === true && health.db === true, '/api/health reports ok + db');

	console.log('\nGuards when signed out');
	const anon = new Browser();
	const anonDash = await anon.get('/dashboard');
	check(
		anonDash.status === 303 && location(anonDash).startsWith('/login?next='),
		'signed-out /dashboard -> /login',
		location(anonDash)
	);
	const anonPebble = await anon.get('/pebble');
	check(
		anonPebble.status === 303 && location(anonPebble).startsWith('/kid-login'),
		'signed-out /pebble -> /kid-login',
		location(anonPebble)
	);

	console.log('\nParent password login');
	const mom = new Browser();
	const momLogin = await mom.post('/login?/password', {
		email: DEMO.mom.email,
		password: DEMO.mom.password
	});
	check(
		momLogin.status === 303 && location(momLogin) === '/dashboard',
		'Mom password login -> /dashboard',
		`${momLogin.status} ${location(momLogin)}`
	);
	const momDash = await mom.get('/dashboard');
	const momHtml = await momDash.text();
	check(
		momDash.status === 200 && /Good (morning|afternoon|evening), Mom/.test(momHtml),
		'Mom sees her Today page'
	);
	check(
		momHtml.includes("Today's briefing") &&
			momHtml.includes('This week') &&
			momHtml.includes('data-slot="insights"'),
		'Today shows briefing, week strip and the insights slot'
	);
	check(!momHtml.includes('Biscuit'), "Today never shows the child's unshared wishes");
	check(
		momHtml.includes('Spending') && momHtml.includes('My time with Lily'),
		'dashboard shows spending + private time cards'
	);
	const momPebble = await mom.get('/pebble');
	check(
		momPebble.status === 303 && location(momPebble) === '/dashboard',
		'parent opening /pebble -> /dashboard',
		location(momPebble)
	);
	const wrongPw = await new Browser().post('/login?/password', {
		email: DEMO.mom.email,
		password: 'nope-nope'
	});
	check(wrongPw.status === 400, 'wrong password is rejected', String(wrongPw.status));

	console.log('\nMagic link (local Mailpit)');
	const dadMagic = new Browser();
	const dadFinal = await magicLogin(dadMagic, DEMO.dad.email);
	check(
		new URL(dadFinal.url).pathname === '/dashboard' && dadFinal.res.status === 200,
		'Dad magic link -> /dashboard',
		dadFinal.url
	);

	console.log('\nKid login');
	const lily = new Browser();
	const kidLogin = await lily.post('/kid-login', { familyCode: 'turtle-1234', pin: DEMO.lily.pin });
	check(
		kidLogin.status === 303 && location(kidLogin) === '/pebble',
		'Lily (TURTLE-1234 + 1234) -> /pebble',
		`${kidLogin.status} ${location(kidLogin)}`
	);
	const pebble = await lily.get('/pebble');
	check(
		pebble.status === 200 && /I(&#39;|')m Pebble/.test(await pebble.text()),
		'Lily sees Pebble'
	);
	const kidDash = await lily.get('/dashboard');
	check(
		kidDash.status === 303 && location(kidDash) === '/pebble',
		'child opening /dashboard -> /pebble',
		location(kidDash)
	);
	const kidFamily = await lily.get('/family');
	check(
		kidFamily.status === 303 && location(kidFamily) === '/pebble',
		'child opening /family -> /pebble',
		location(kidFamily)
	);
	const badPin = await new Browser().post('/kid-login', { familyCode: 'TURTLE-1234', pin: '0000' });
	check(badPin.status === 400, 'wrong PIN gets a generic error', String(badPin.status));

	console.log('\nLogout');
	const out = await mom.post('/logout', {});
	const afterOut = await mom.get('/dashboard');
	check(
		out.status === 303 && afterOut.status === 303 && location(afterOut).startsWith('/login'),
		'logout clears the session'
	);

	await parentCoreFlows();

	console.log(
		'\nFull onboarding: new parent -> family -> invite -> co-parent -> child -> consents -> kid login'
	);
	const stamp = Date.now().toString(36);
	const aliceEmail = `alice.${stamp}@example.com`;
	const bobEmail = `bob.${stamp}@example.com`;

	const alice = new Browser();
	const aliceFinal = await magicLogin(alice, aliceEmail);
	check(
		new URL(aliceFinal.url).pathname === '/onboarding',
		'new parent lands on /onboarding',
		aliceFinal.url
	);
	const created = await alice.post('/onboarding?/createFamily', {
		familyName: `Smoke ${stamp}`,
		displayName: 'Alice'
	});
	check(created.status === 303, 'create family', String(created.status));

	const invited = await alice.post('/onboarding?/invite', { email: bobEmail });
	const inviteHtml = await invited.text();
	const invitePath = inviteHtml.match(/\/invite\/[A-Za-z0-9_-]{40,}/)?.[0];
	check(invited.status === 200 && !!invitePath, 'invite link created', String(invited.status));

	const added = await alice.post('/onboarding?/addChild', {
		firstName: 'Max',
		birthYear: '2018',
		pin: '5678',
		pinConfirm: '5678'
	});
	check(added.status === 200, 'add child', String(added.status));

	const aliceFamily = await (await alice.get('/family')).text();
	const familyCode = aliceFamily.match(/\b[A-Z]{3,10}-\d{4}\b/)?.[0] ?? '';
	check(
		!!familyCode && aliceFamily.includes('Waiting for your co-parent'),
		`family page shows code (${familyCode}) and why Max is pending`
	);

	const maxEarly = await new Browser().post('/kid-login', { familyCode, pin: '5678' });
	check(
		maxEarly.status === 403 && (await maxEarly.text()).includes('Ask both grown-ups'),
		'child cannot log in before both consents',
		String(maxEarly.status)
	);

	const bob = new Browser();
	const bobFinal = await magicLogin(bob, bobEmail, invitePath);
	check(
		new URL(bobFinal.url).pathname === invitePath,
		'co-parent magic link returns to the invite',
		bobFinal.url
	);
	const accepted = await bob.post(invitePath!, { displayName: 'Bob' });
	check(
		accepted.status === 303 && location(accepted) === '/family',
		'co-parent accepts invite -> /family',
		`${accepted.status} ${location(accepted)}`
	);

	const bobFamily = await (await bob.get('/family')).text();
	const childId = bobFamily.match(/name="childId" value="([0-9a-f-]{36})"/)?.[1];
	check(!!childId && bobFamily.includes('Approve Max'), 'co-parent sees "Approve Max\'s account"');
	const consent = await bob.post('/family?/consent', { childId: childId ?? '' });
	check(
		consent.status === 200 && (await consent.text()).length > 0,
		'co-parent approves',
		String(consent.status)
	);

	const maxLogin = await new Browser().post('/kid-login', { familyCode, pin: '5678' });
	check(
		maxLogin.status === 303 && location(maxLogin) === '/pebble',
		'child logs in after both consents',
		`${maxLogin.status} ${location(maxLogin)}`
	);

	console.log(`\n${passed} passed, ${failures.length} failed`);
	if (failures.length) {
		console.log('\nFailures:\n  - ' + failures.join('\n  - '));
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Smoke test crashed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
