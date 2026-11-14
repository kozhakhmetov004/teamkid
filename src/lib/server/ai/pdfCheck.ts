/**
 * Checks an uploaded file before it is stored as a parenting plan or sent to
 * the LLM: PDF MIME type, %PDF magic bytes, size, not encrypted, page count.
 * No PDF library: pages are counted from `/Type /Page` objects, including
 * those inside compressed object streams (inflated with a size cap).
 */
import { inflateSync } from 'node:zlib';

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 30;

export type PdfProblem =
	'empty' | 'too_large' | 'not_pdf' | 'encrypted' | 'unreadable' | 'too_many_pages';

export type PdfCheck = { ok: true; pages: number } | { ok: false; problem: PdfProblem };

/** Plain-language reason for the UI. */
export const PDF_PROBLEM_MESSAGE: Record<PdfProblem, string> = {
	empty: 'The file is empty.',
	too_large: 'The file is larger than 10 MB.',
	not_pdf: 'Only PDF files can be imported.',
	encrypted: 'This PDF is password-protected. Upload a copy without a password.',
	unreadable: "We couldn't read this PDF. Try exporting it again as a PDF.",
	too_many_pages: `The plan has more than ${MAX_PDF_PAGES} pages.`
};

/** Total inflated bytes we are willing to look at (guards against zip bombs). */
const MAX_INFLATED_BYTES = 20 * 1024 * 1024;
const PAGE_RE = /\/Type\s*\/Page(?![a-zA-Z])/g;

const latin1 = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

/** Number of page objects, or 0 if none can be found. */
export function countPdfPages(bytes: Uint8Array): number {
	const text = latin1(bytes);
	let pages = text.match(PAGE_RE)?.length ?? 0;

	// Object streams (PDF 1.5+) hide page objects inside Flate-compressed data.
	let budget = MAX_INFLATED_BYTES;
	const streamRe = /<<((?:(?!>>)[\s\S]){0,4000})>>\s*stream\r?\n/g;
	for (let m = streamRe.exec(text); m && budget > 0; m = streamRe.exec(text)) {
		const dict = m[1];
		if (!/\/ObjStm/.test(dict) || !/\/FlateDecode/.test(dict)) continue;
		const start = m.index + m[0].length;
		const end = text.indexOf('endstream', start);
		if (end < 0) break;
		try {
			const inflated = inflateSync(bytes.subarray(start, end), { maxOutputLength: budget });
			budget -= inflated.length;
			pages += inflated.toString('latin1').match(PAGE_RE)?.length ?? 0;
		} catch {
			// Damaged or over-budget stream: skip it; the page count may come out 0.
		}
	}
	return pages;
}

export function checkPdf(bytes: Uint8Array, mime: string | null | undefined): PdfCheck {
	if (bytes.length === 0) return { ok: false, problem: 'empty' };
	if (bytes.length > MAX_PDF_BYTES) return { ok: false, problem: 'too_large' };
	const magic = latin1(bytes.subarray(0, 5));
	if (mime !== 'application/pdf' || magic !== '%PDF-') return { ok: false, problem: 'not_pdf' };
	// An encrypted PDF's trailer (or xref stream) points to an /Encrypt dictionary;
	// the model can't read those.
	if (/\/Encrypt\s+\d+\s+\d+\s+R/.test(latin1(bytes))) return { ok: false, problem: 'encrypted' };
	const pages = countPdfPages(bytes);
	if (pages === 0) return { ok: false, problem: 'unreadable' };
	if (pages > MAX_PDF_PAGES) return { ok: false, problem: 'too_many_pages' };
	return { ok: true, pages };
}
