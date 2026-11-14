/**
 * Writes the FICTIONAL sample parenting plan used in the demo:
 * static/demo/parenting-plan-carter.pdf
 *
 *   pnpm exec tsx scripts/make-sample-plan.ts
 *
 * No dependencies: a small hand-written PDF 1.4 (text objects, standard
 * Helvetica fonts), so the text is real and extractable. Output is
 * deterministic (no dates or ids), so re-running gives the same bytes.
 *
 * The schedule matches the seed (scripts/seed.ts): 2-2-3 starting Monday
 * 2026-11-09 with Mother (= Mom, home A) first, exchanges at 5:00 pm. The seed
 * starts on the Monday of the week it runs, so if the local or cloud DB is
 * seeded from scratch in a week whose Monday is not 2026-11-09 plus a multiple
 * of 14 days, change START below and re-run this script.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const START = 'Monday, November 9, 2026';
const OUT = join(
	dirname(fileURLToPath(import.meta.url)),
	'../static/demo/parenting-plan-carter.pdf'
);

const SAMPLE = 'SAMPLE - not a real court document. All names and addresses are fictional.';

type Block =
	| { kind: 'title' | 'heading' | 'para' | 'small'; text: string }
	| { kind: 'bullets'; items: string[] }
	| { kind: 'space' };

const PAGES: Block[][] = [
	[
		{ kind: 'title', text: 'Parenting Plan: Carter family' },
		{ kind: 'small', text: SAMPLE },
		{ kind: 'space' },
		{ kind: 'heading', text: '1. Parties' },
		{
			kind: 'para',
			text: 'This parenting plan is made between Megan Carter ("Mother"), of 412 Birch Lane, Riverton, and Alex Carter ("Father"), of 88 Harbor View Road, Riverton.'
		},
		{ kind: 'heading', text: '2. Child' },
		{ kind: 'para', text: "This plan concerns the parties' child, Lily Carter, born in 2018." },
		{ kind: 'heading', text: '3. Regular parenting schedule' },
		{
			kind: 'para',
			text: `The parents follow a 2-2-3 rotating schedule starting ${START}. Mother has Lily first. The schedule repeats every two weeks:`
		},
		{
			kind: 'bullets',
			items: [
				'Week 1: Mother has Lily on Monday and Tuesday nights, Father on Wednesday and Thursday nights, and Mother on Friday, Saturday and Sunday nights.',
				'Week 2: Father has Lily on Monday and Tuesday nights, Mother on Wednesday and Thursday nights, and Father on Friday, Saturday and Sunday nights.',
				'The two-week cycle then repeats without interruption, except as stated in section 6 (Holidays).'
			]
		},
		{
			kind: 'para',
			text: "Each parent is responsible for Lily's daily care, meals, homework and bedtime routine during their parenting time."
		}
	],
	[
		{ kind: 'heading', text: '4. Exchanges' },
		{
			kind: 'para',
			text: 'All exchanges take place at 5:00 pm on the day the schedule changes from one parent to the other.'
		},
		{
			kind: 'bullets',
			items: [
				'When school is in session, the receiving parent picks Lily up at Oakwood Elementary School, 1180 Elm Street, Riverton.',
				"On days without school, exchanges take place at the Mother's residence, 412 Birch Lane, Riverton.",
				'A parent who will be more than 15 minutes late must tell the other parent as soon as possible.'
			]
		},
		{ kind: 'heading', text: '5. Transportation' },
		{
			kind: 'para',
			text: 'The parent starting their parenting time provides transportation for the exchange, unless the parents agree otherwise in writing. Lily rides in an age-appropriate car seat at all times.'
		},
		{
			kind: 'para',
			text: "Lily's school bag, medicine and comfort items travel with her at every exchange."
		}
	],
	[
		{ kind: 'heading', text: '6. Holidays and special days' },
		{
			kind: 'para',
			text: 'Holiday time replaces the regular schedule. After a holiday, the regular schedule resumes as if it had not been interrupted.'
		},
		{
			kind: 'bullets',
			items: [
				'Thanksgiving: Mother has Lily in odd-numbered years and Father in even-numbered years, from Wednesday at 5:00 pm until Friday at 5:00 pm.',
				'Christmas Eve and Christmas Day are split. In even-numbered years Mother has Christmas Eve (December 24 at 10:00 am to December 25 at 2:00 pm) and Father has Christmas Day (December 25 at 2:00 pm to December 26 at 10:00 am). In odd-numbered years the parents switch.',
				"Lily's birthday is shared: the parent who does not have Lily that day may spend three hours with her, from 3:00 pm to 6:00 pm.",
				'Summer: each parent may take two consecutive weeks of uninterrupted parenting time. Each parent gives written notice of their chosen weeks by April 1. Otherwise the regular schedule applies.'
			]
		}
	],
	[
		{ kind: 'heading', text: '7. Right of first refusal' },
		{
			kind: 'para',
			text: 'If a parent cannot personally care for Lily for more than 4 hours during their parenting time, that parent must first offer the time to the other parent before arranging other childcare.'
		},
		{ kind: 'heading', text: '8. Communication' },
		{
			kind: 'para',
			text: "The parents communicate about Lily in writing through a co-parenting app, except in emergencies. Messages stay brief, informative and respectful. Neither parent discusses the plan or the other parent's conduct with Lily."
		},
		{ kind: 'heading', text: '9. Changes to this plan' },
		{
			kind: 'para',
			text: 'Temporary changes require written agreement of both parents. Permanent changes require a written agreement signed by both parents.'
		},
		{ kind: 'space' },
		{ kind: 'para', text: 'Signed: Megan Carter (Mother)    Signed: Alex Carter (Father)' },
		{ kind: 'small', text: '(SAMPLE - not signed, not filed, not legal advice.)' }
	]
];

// ---------------------------------------------------------------------------
// Layout (US Letter, 1 inch margins). Width is estimated per character; good
// enough for wrapping plain text in Helvetica.
// ---------------------------------------------------------------------------
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 72;
const STYLE = {
	title: { font: 'F2', size: 18, gap: 26 },
	heading: { font: 'F2', size: 12.5, gap: 22 },
	para: { font: 'F1', size: 11, gap: 15 },
	small: { font: 'F1', size: 8.5, gap: 12 }
} as const;

function wrap(text: string, size: number, width: number): string[] {
	const maxChars = Math.floor(width / (size * 0.5));
	const lines: string[] = [];
	let line = '';
	for (const word of text.split(' ')) {
		if (line && (line + ' ' + word).length > maxChars) {
			lines.push(line);
			line = word;
		} else line = line ? `${line} ${word}` : word;
	}
	if (line) lines.push(line);
	return lines;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const text = (font: string, size: number, x: number, y: number, s: string) =>
	`BT /${font} ${size} Tf ${x} ${y.toFixed(1)} Td (${esc(s)}) Tj ET`;

function pageContent(blocks: Block[], index: number, total: number): string {
	const ops: string[] = [
		text('F1', 8, MARGIN, PAGE_H - 40, SAMPLE),
		text('F1', 8, MARGIN, 40, `Carter family parenting plan (SAMPLE)`),
		text('F1', 8, PAGE_W - MARGIN - 52, 40, `Page ${index + 1} of ${total}`)
	];
	let y = PAGE_H - MARGIN - 10;
	for (const block of blocks) {
		if (block.kind === 'space') {
			y -= 12;
		} else if (block.kind === 'bullets') {
			const s = STYLE.para;
			for (const item of block.items) {
				wrap(item, s.size, PAGE_W - 2 * MARGIN - 16).forEach((line, i) => {
					if (i === 0) ops.push(text(s.font, s.size, MARGIN + 4, y, '-'));
					ops.push(text(s.font, s.size, MARGIN + 16, y, line));
					y -= s.gap;
				});
				y -= 4;
			}
		} else {
			const s = STYLE[block.kind];
			if (block.kind === 'heading') y -= 8;
			for (const line of wrap(block.text, s.size, PAGE_W - 2 * MARGIN)) {
				ops.push(text(s.font, s.size, MARGIN, y, line));
				y -= s.gap;
			}
			if (block.kind === 'para') y -= 5;
		}
		if (y < 70) throw new Error(`Page ${index + 1} overflows; move text to another page`);
	}
	return ops.join('\n');
}

// ---------------------------------------------------------------------------
// PDF objects: 1 catalog, 2 pages, 3-4 fonts, 5 info, then (page, content) pairs.
// ---------------------------------------------------------------------------
function buildPdf(): Buffer {
	const objects: string[] = [];
	const pageIds = PAGES.map((_, i) => 6 + i * 2);
	objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
	objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${PAGES.length} >>`;
	objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
	objects[4] =
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
	objects[5] = `<< /Title (${esc('Parenting Plan: Carter family (SAMPLE)')}) /Producer (TeamKid make-sample-plan) >>`;
	PAGES.forEach((blocks, i) => {
		const content = pageContent(blocks, i, PAGES.length);
		objects[pageIds[i]] =
			`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
			`/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`;
		objects[pageIds[i] + 1] =
			`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`;
	});

	let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
	const offsets: number[] = [];
	for (let id = 1; id < objects.length; id++) {
		offsets[id] = Buffer.byteLength(pdf, 'latin1');
		pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
	}
	const xref = Buffer.byteLength(pdf, 'latin1');
	pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
	for (let id = 1; id < objects.length; id++) {
		pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
	}
	pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
	return Buffer.from(pdf, 'latin1');
}

mkdirSync(dirname(OUT), { recursive: true });
const bytes = buildPdf();
writeFileSync(OUT, bytes);
console.log(`Wrote ${OUT} (${PAGES.length} pages, ${bytes.length} bytes)`);
