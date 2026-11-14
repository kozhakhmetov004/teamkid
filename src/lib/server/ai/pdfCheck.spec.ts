import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { checkPdf, countPdfPages, MAX_PDF_BYTES } from './pdfCheck.js';

const enc = (s: string) => new Uint8Array(Buffer.from(s, 'latin1'));
const SAMPLE = new Uint8Array(readFileSync('static/demo/parenting-plan-carter.pdf'));

/** A minimal PDF body with `n` page objects (structure only; enough for the checks). */
const pdfWithPages = (n: number) =>
	enc(
		'%PDF-1.4\n' +
			Array.from(
				{ length: n },
				(_, i) => `${i + 3} 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n`
			).join('') +
			`2 0 obj\n<< /Type /Pages /Count ${n} >>\nendobj\n%%EOF\n`
	);

describe('countPdfPages', () => {
	it('counts the pages of the sample plan', () => {
		expect(countPdfPages(SAMPLE)).toBe(4);
	});

	it('does not count the /Type /Pages tree node', () => {
		expect(countPdfPages(pdfWithPages(3))).toBe(3);
	});

	it('finds pages inside compressed object streams', () => {
		const objs = '<< /Type /Page /Parent 2 0 R >>\n<< /Type /Page /Parent 2 0 R >>';
		const data = deflateSync(Buffer.from(objs, 'latin1'));
		const head = enc(
			`%PDF-1.5\n5 0 obj\n<< /Type /ObjStm /N 2 /Filter /FlateDecode /Length ${data.length} >>\nstream\n`
		);
		const tail = enc('\nendstream\nendobj\n%%EOF\n');
		const pdf = new Uint8Array([...head, ...data, ...tail]);
		expect(countPdfPages(pdf)).toBe(2);
	});
});

describe('checkPdf', () => {
	it('accepts the sample plan', () => {
		expect(checkPdf(SAMPLE, 'application/pdf')).toEqual({ ok: true, pages: 4 });
	});

	it('rejects a wrong MIME type even with PDF bytes', () => {
		expect(checkPdf(SAMPLE, 'image/png')).toEqual({ ok: false, problem: 'not_pdf' });
		expect(checkPdf(SAMPLE, null)).toEqual({ ok: false, problem: 'not_pdf' });
	});

	it('rejects bytes that are not a PDF even with the PDF MIME type', () => {
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
		expect(checkPdf(png, 'application/pdf')).toEqual({ ok: false, problem: 'not_pdf' });
		expect(checkPdf(enc(' %PDF-1.4'), 'application/pdf')).toEqual({
			ok: false,
			problem: 'not_pdf'
		});
	});

	it('rejects empty and oversized files', () => {
		expect(checkPdf(new Uint8Array(), 'application/pdf')).toEqual({ ok: false, problem: 'empty' });
		const big = new Uint8Array(MAX_PDF_BYTES + 1);
		big.set(enc('%PDF-1.4'));
		expect(checkPdf(big, 'application/pdf')).toEqual({ ok: false, problem: 'too_large' });
	});

	it('rejects more than 30 pages, accepts exactly 30', () => {
		expect(checkPdf(pdfWithPages(30), 'application/pdf')).toEqual({ ok: true, pages: 30 });
		expect(checkPdf(pdfWithPages(31), 'application/pdf')).toEqual({
			ok: false,
			problem: 'too_many_pages'
		});
	});

	it('rejects encrypted and page-less PDFs', () => {
		const encrypted = enc(
			'%PDF-1.4\n3 0 obj\n<< /Type /Page >>\nendobj\ntrailer\n<< /Root 1 0 R /Encrypt 9 0 R >>\n%%EOF'
		);
		expect(checkPdf(encrypted, 'application/pdf')).toEqual({ ok: false, problem: 'encrypted' });
		expect(checkPdf(enc('%PDF-1.4\n%%EOF'), 'application/pdf')).toEqual({
			ok: false,
			problem: 'unreadable'
		});
	});
});
