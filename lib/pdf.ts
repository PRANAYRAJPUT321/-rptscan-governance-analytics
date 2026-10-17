"use client";

export interface PdfPage {
  page: number;
  lines: string[];
  score: number;
}

/**
 * Reads a PDF in the browser and rebuilds text lines from positioned glyph runs,
 * inserting " | " where a horizontal gap suggests a new table column so the
 * engine can split cells the same way it does for pasted tables.
 */
export async function readPdf(file: File, onProgress?: (done: number, total: number) => void): Promise<PdfPage[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: PdfPage[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    type Run = { x: number; y: number; w: number; s: string };
    const runs: Run[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      runs.push({ x: item.transform[4], y: item.transform[5], w: item.width, s: item.str });
    }
    runs.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: Run[][] = [];
    for (const r of runs) {
      const row = rows.find((rw) => Math.abs(rw[0].y - r.y) < 3);
      if (row) row.push(r);
      else rows.push([r]);
    }
    const lines = rows.map((row) => {
      row.sort((a, b) => a.x - b.x);
      let out = "";
      let end = -Infinity;
      for (const r of row) {
        const gap = r.x - end;
        out += out ? (gap > 14 ? " | " : gap > 1.5 ? " " : "") : "";
        out += r.s.trim();
        end = r.x + r.w;
      }
      return out;
    });
    pages.push({ page: p, lines, score: scorePage(lines.join("\n")) });
    onProgress?.(p, doc.numPages);
    page.cleanup();
  }
  return pages;
}

/** How likely a page is to belong to the RPT note. */
export function scorePage(text: string): number {
  const t = text.toLowerCase();
  let s = 0;
  s += (t.match(/related part(y|ies)/g)?.length ?? 0) * 3;
  if (/ind as 24/.test(t)) s += 8;
  if (/related party (disclosures|transactions)/.test(t)) s += 6;
  if (/key managerial personnel|\bkmp\b/.test(t)) s += 3;
  s += Math.min(t.match(/subsidiar|joint venture|associate/g)?.length ?? 0, 10);
  s += Math.min(t.match(/sale of|purchase of|loan|royalt|remuneration|guarantee/g)?.length ?? 0, 10);
  // Boilerplate pages (board report, CG report) mention RPTs but lack figures.
  const numbers = t.match(/\d[\d,]*\.\d{2}/g)?.length ?? 0;
  if (numbers < 5) s *= 0.4;
  return Math.round(s);
}

/** Best contiguous block of pages for the note: the top page plus strong neighbours. */
export function locateNote(pages: PdfPage[], maxPages = 4): number[] {
  if (!pages.length) return [];
  const best = pages.reduce((a, b) => (b.score > a.score ? b : a));
  if (best.score < 10) return [];
  const pick = [best.page];
  const threshold = Math.max(8, best.score * 0.35);
  for (let p = best.page + 1; p <= pages.length && pick.length < maxPages; p++) {
    if (pages[p - 1].score >= threshold) pick.push(p);
    else break;
  }
  for (let p = best.page - 1; p >= 1 && pick.length < maxPages; p--) {
    if (pages[p - 1].score >= threshold) pick.unshift(p);
    else break;
  }
  return pick;
}
