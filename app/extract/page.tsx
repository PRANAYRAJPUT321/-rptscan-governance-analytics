"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Gauge, HBars, PercentileStrip } from "@/components/charts";
import { IconChat, IconCheck, IconHistory, IconPrint } from "@/components/icons";
import { Badge, Card, PageHeader } from "@/components/ui";
import { positionInSector, riskScore } from "@/lib/analysis";
import { COMPANIES, SECTORS } from "@/lib/companies";
import { extractWithRules } from "@/lib/extract";
import { crore, fmt, ordinal, pct } from "@/lib/format";
import { LODR_CHECKS, materialityThreshold, scoreBand } from "@/lib/lodr";
import { locateNote, readPdf, type PdfPage } from "@/lib/pdf";
import { SAMPLE_COMPANY, SAMPLE_NOTE } from "@/lib/sample";
import type { ExtractionResult } from "@/lib/types";

type Source = "pdf" | "paste";

const HISTORY_KEY = "rptscan.history.v1";

const CAT_COLORS: Record<string, string> = {
  sale: "#10b981", purchase: "#3b82f6", services: "#06b6d4", loan: "#f43f5e", investment: "#a855f7", guarantee: "#f97316",
  royalty: "#eab308", rent: "#84cc16", remuneration: "#ec4899", dividend: "#14b8a6", interest: "#f59e0b", reimbursement: "#64748b", other: "#94a3b8",
};

export default function ExtractPage() {
  const [source, setSource] = useState<Source>("paste");
  const [text, setText] = useState("");
  const [linePages, setLinePages] = useState<number[] | undefined>();
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState(SECTORS[0]);
  const [revenue, setRevenue] = useState("");
  const [netWorth, setNetWorth] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);

  // PDF state
  const [pdfPages, setPdfPages] = useState<PdfPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [fileName, setFileName] = useState("");

  const [history, setHistory] = useState<{ at: number; sector: string; result: ExtractionResult }[]>([]);

  const resultsRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
    } catch {}
    if (new URLSearchParams(window.location.search).get("sample")) loadSample();
    fetch("/api/extract")
      .then((r) => r.json())
      .then((d) => {
        setAiAvailable(Boolean(d.ai));
        setAiProvider(d.provider ?? null);
      })
      .catch(() => setAiAvailable(false));
  }, []);

  function loadSample() {
    setSource("paste");
    setText(SAMPLE_NOTE);
    setLinePages(undefined);
    setCompany(SAMPLE_COMPANY.name);
    setSector(SAMPLE_COMPANY.sector);
    setRevenue(String(SAMPLE_COMPANY.revenue));
    setNetWorth(String(SAMPLE_COMPANY.netWorth));
    setResult(null);
  }

  async function onPdf(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    setProgress([0, 1]);
    try {
      const pages = await readPdf(file, (d, t) => setProgress([d, t]));
      setPdfPages(pages);
      const pick = locateNote(pages);
      setSelectedPages(pick);
      applyPages(pages, pick);
      if (!pick.length) setError("Could not find a related party note automatically — pick the pages manually below.");
      if (!company) setCompany(file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "));
    } catch (e) {
      setError(`Could not read the PDF: ${(e as Error).message}`);
    } finally {
      setProgress(null);
    }
  }

  function applyPages(pages: PdfPage[], pick: number[]) {
    const lines: string[] = [];
    const map: number[] = [];
    for (const p of [...pick].sort((a, b) => a - b)) {
      for (const l of pages[p - 1].lines) {
        lines.push(l);
        map.push(p);
      }
    }
    setText(lines.join("\n"));
    setLinePages(map);
  }

  function togglePage(p: number) {
    const next = selectedPages.includes(p) ? selectedPages.filter((x) => x !== p) : [...selectedPages, p].sort((a, b) => a - b);
    setSelectedPages(next);
    applyPages(pdfPages, next);
  }

  async function run(mode: "auto" | "rules" = "auto") {
    setBusy(true);
    setError(null);
    const payload = {
      text,
      company: company || undefined,
      revenue: revenue ? Number(revenue) : null,
      netWorth: netWorth ? Number(netWorth) : null,
      pages: linePages,
      mode,
    };
    try {
      const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      keep(data);
    } catch (e) {
      // Offline / API unavailable: the rule engine also runs in the browser.
      const local = extractWithRules(text, {
        company: payload.company,
        revenue: payload.revenue,
        netWorth: payload.netWorth,
        pageOfLine: linePages ? (l) => linePages[l - 1] : undefined,
      });
      local.warnings.unshift(`Server extraction unavailable (${(e as Error).message}); ran the rule engine in your browser.`);
      keep(local);
    } finally {
      setBusy(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  /** Show a result and remember it (history + the Ask AI page reads the latest one). */
  function keep(r: ExtractionResult) {
    setResult(r);
    const entry = { at: Date.now(), sector, result: r };
    const next = [entry, ...history.filter((h) => h.result.company !== r.company)].slice(0, 6);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      localStorage.setItem(
        "rptscan.lastExtraction",
        JSON.stringify({
          company: r.company,
          sector,
          fiscalYear: r.fiscalYear,
          unit: r.unit,
          note: r.note,
          revenue: r.revenue,
          netWorth: r.netWorth,
          rptToRevenue: r.rptToRevenue,
          rptToNetWorth: r.rptToNetWorth,
          disclosureScore: r.disclosureScore,
          tieOut: r.tieOut.status,
          unmetChecks: r.lodr.filter((c) => !c.met).map((c) => c.id),
          material: r.materialTransactions,
          transactions: r.transactions.slice(0, 40).map((t) => `${t.party} | ${t.relationship} | ${t.nature} | ${t.amount}`),
        }),
      );
    } catch {}
  }

  const step = !text.trim() ? 0 : !result ? 1 : result.tieOut.status !== "tied" ? 2 : 4;

  function jumpTo(line: number) {
    setActiveLine(line);
    const el = document.getElementById(`src-line-${line}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const sourceLines = useMemo(() => text.split("\n"), [text]);
  const citedLines = useMemo(() => new Set(result?.transactions.map((t) => t.citation.line) ?? []), [result]);

  return (
    <>
      <PageHeader eyebrow="Engine · live demonstration" title="AI Related Party Note Extractor">
        Upload an annual report PDF (or paste the RPT note). The AI locates the related party note, extracts every transaction with a citation to the line it
        came from, ties the total to the note&apos;s disclosed aggregate, scores disclosure against LODR, and places the company against its sector.
      </PageHeader>

      <ol className="no-print mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["Load the RPT note", "Extract with AI", "Validate citations & tie-out", "Score & compare"].map((label, i) => {
          const done = step > i;
          const current = step === i;
          return (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                done ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200" : current ? "border-brand-400/40 bg-brand-500/10 text-white" : "border-white/[0.06] text-slate-500"
              }`}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done ? "bg-emerald-500 text-ink-950" : current ? "bg-brand-500 text-white" : "bg-white/10"}`}>
                {done ? <IconCheck className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="leading-tight">{label}</span>
            </li>
          );
        })}
      </ol>

      {history.length > 0 && (
        <div className="no-print mb-6 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <IconHistory className="h-4 w-4" /> Recent
          </span>
          {history.map((h) => (
            <button
              key={h.at}
              onClick={() => {
                setResult(h.result);
                setSector(h.sector);
                setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
              }}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300 hover:border-brand-400/40 hover:text-white"
            >
              {h.result.company} · <span className="num">{h.result.disclosureScore}</span>
            </button>
          ))}
          <button
            onClick={() => {
              setHistory([]);
              try {
                localStorage.removeItem(HISTORY_KEY);
              } catch {}
            }}
            className="text-xs text-slate-600 hover:text-slate-400"
          >
            clear
          </button>
        </div>
      )}

      <div className="no-print grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="1 · Source document"
          action={
            <div className="flex rounded-lg bg-white/5 p-1 text-xs">
              {(["pdf", "paste"] as Source[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`rounded-md px-3 py-1 font-semibold ${source === s ? "bg-white/10 text-white" : "text-slate-400"}`}
                >
                  {s === "pdf" ? "Annual report PDF" : "Paste note"}
                </button>
              ))}
            </div>
          }
        >
          {source === "pdf" && (
            <div className="mb-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center transition hover:border-brand-500/50 hover:bg-brand-500/[0.04]">
                <span className="text-3xl">📄</span>
                <span className="text-sm font-semibold text-slate-200">{fileName || "Drop or choose an annual report PDF"}</span>
                <span className="text-xs text-slate-500">Parsed in your browser — the file itself is never uploaded; only the selected note pages are sent for extraction.</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onPdf(e.target.files[0])} />
              </label>
              {progress && (
                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-brand-500 transition-all" style={{ width: `${(progress[0] / progress[1]) * 100}%` }} />
                  </div>
                  <div className="num mt-1 text-xs text-slate-400">
                    Reading page {progress[0]} of {progress[1]}…
                  </div>
                </div>
              )}
              {pdfPages.length > 0 && (
                <div className="mt-4">
                  <div className="label mb-2">Pages most likely to be the RPT note (click to include / exclude)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[...pdfPages]
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 14)
                      .sort((a, b) => a.page - b.page)
                      .map((p) => (
                        <button
                          key={p.page}
                          onClick={() => togglePage(p.page)}
                          className={`num rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition ${
                            selectedPages.includes(p.page) ? "bg-brand-500/20 text-brand-200 ring-brand-500/50" : "bg-white/[0.03] text-slate-400 ring-white/10 hover:text-slate-200"
                          }`}
                          title={`relevance score ${p.score}`}
                        >
                          p.{p.page} <span className="opacity-60">· {p.score}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <textarea
            className="input num h-72 resize-y font-mono text-xs leading-relaxed"
            placeholder="Paste the Related Party Disclosures note here (one transaction per line, columns separated by tabs, pipes or 2+ spaces)…"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setLinePages(undefined);
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={loadSample} className="btn-ghost text-xs">
              Load sample note
            </button>
            <span className="num text-xs text-slate-500">
              {sourceLines.filter(Boolean).length} lines · {text.length.toLocaleString()} chars
            </span>
          </div>
        </Card>

        <Card title="2 · Company & scaling">
          <div className="space-y-3">
            <div>
              <label className="label">Company</label>
              <input className="input mt-1" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Tata Steel Limited" />
            </div>
            <div>
              <label className="label">Sector (for peer comparison)</label>
              <select className="input mt-1" value={sector} onChange={(e) => setSector(e.target.value)}>
                {SECTORS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Revenue (₹ cr)</label>
                <input className="input num mt-1" inputMode="decimal" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="auto" />
              </div>
              <div>
                <label className="label">Net worth (₹ cr)</label>
                <input className="input num mt-1" inputMode="decimal" value={netWorth} onChange={(e) => setNetWorth(e.target.value)} placeholder="auto" />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Revenue from operations and total equity from the same annual report. Left blank, the engine looks for them in the text.
            </p>
          </div>
          <div className="mt-5 space-y-2">
            <button className="btn-primary w-full" disabled={busy || !text.trim()} onClick={() => run("auto")}>
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Extracting…
                </>
              ) : (
                <>✦ Extract with {aiAvailable ? "Claude AI" : "engine"}</>
              )}
            </button>
            <button className="btn-ghost w-full text-xs" disabled={busy || !text.trim()} onClick={() => run("rules")}>
              Run deterministic rule engine only
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <span className={`h-2 w-2 rounded-full ${aiAvailable ? "bg-emerald-400" : aiAvailable === false ? "bg-amber-400" : "bg-slate-500"}`} />
            {aiAvailable === null ? "Checking AI…" : aiAvailable ? `Claude connected · ${aiProvider}` : "AI key not set — rule engine active"}
          </div>
          {error && <div className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}
        </Card>
      </div>

      {result && (
        <div ref={resultsRef} className="scroll-mt-20">
          <Results result={result} sector={sector} onJump={jumpTo} />

          <Card className="no-print mt-6" title="Source note with citations" subtitle="Highlighted lines are cited by an extracted transaction; click a citation in the table to jump here">
            <div ref={sourceRef} className="max-h-[28rem] overflow-auto rounded-xl bg-ink-950/70 p-3 font-mono text-xs leading-6">
              {sourceLines.map((l, i) => {
                const n = i + 1;
                const cited = citedLines.has(n);
                const agg = result.tieOut.aggregateCitation?.line === n;
                return (
                  <div
                    key={n}
                    id={`src-line-${n}`}
                    className={`flex gap-3 rounded px-2 ${activeLine === n ? "bg-amber-400/25 ring-1 ring-amber-400/60" : agg ? "bg-emerald-500/15" : cited ? "bg-brand-500/10" : ""}`}
                  >
                    <span className="num w-10 shrink-0 select-none text-right text-slate-600">L{n}</span>
                    {linePages && <span className="num w-10 shrink-0 select-none text-slate-600">p.{linePages[i]}</span>}
                    <span className={cited || agg ? "text-slate-100" : "text-slate-500"}>{l || " "}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function Results({ result, sector, onJump }: { result: ExtractionResult; sector: string; onJump: (line: number) => void }) {
  const [insight, setInsight] = useState<{ mode: string; text: string } | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const t = result.tieOut;
  const verified = result.transactions.filter((x) => x.citation.verified).length;
  const band = scoreBand(result.disclosureScore);
  const positions = positionInSector(sector, result);
  const threshold = materialityThreshold(result.revenue);
  const peers = COMPANIES.filter((c) => c.sector === sector);
  const peerRows = [
    ...peers.map((c) => ({ label: c.name, value: c.rptToRevenue * 100 })),
    ...(result.rptToRevenue !== null ? [{ label: `★ ${result.company}`, value: result.rptToRevenue * 100 }] : []),
  ].sort((a, b) => b.value - a.value);
  const byCat = Object.entries(
    result.transactions.reduce<Record<string, number>>((m, x) => ({ ...m, [x.category]: (m[x.category] ?? 0) + Math.abs(x.amount) }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const gross = byCat.reduce((s, [, v]) => s + v, 0);

  const facts = [
    `Fiscal year ${result.fiscalYear}; ${result.transactions.length} related party transactions extracted from ${result.note}, gross ${fmt(gross)} (${result.unit}).`,
    `RPT / Revenue ${pct(result.rptToRevenue)}; RPT / Net worth ${pct(result.rptToNetWorth)}.`,
    ...positions.map((p) => `${p.metric}: company ${p.format === "pct" ? pct(p.value) : p.value.toFixed(0)} vs ${sector} median ${p.format === "pct" ? pct(p.sectorMedian) : p.sectorMedian.toFixed(0)} (${ordinal(p.percentile)} percentile).`),
    `Disclosure score ${result.disclosureScore}/100; unmet checks: ${result.lodr.filter((c) => !c.met).map((c) => LODR_CHECKS.find((r) => r.id === c.id)?.title).join(", ") || "none"}.`,
    `Tie-out: ${t.status}${t.disclosedAggregate !== null ? ` (extracted ${fmt(t.extractedTotal)} vs disclosed ${fmt(t.disclosedAggregate)})` : ""}.`,
    `Largest categories: ${byCat.slice(0, 3).map(([k, v]) => `${k} ${((v / gross) * 100).toFixed(0)}%`).join(", ")}.`,
    `Reg 23 materiality threshold ₹${fmt(threshold, 0)} cr; ${result.materialTransactions.length} transaction(s) above it.`,
  ];
  const fallback = [
    positions[0] ? `RPT intensity of ${pct(positions[0].value)} of revenue sits at the ${ordinal(positions[0].percentile)} percentile of ${sector} peers (median ${pct(positions[0].sectorMedian)}) — ${positions[0].value > positions[0].sectorMedian ? "above" : "below"} the sector norm.` : `Provide revenue to scale RPTs against sector peers.`,
    `Disclosure quality is ${band.label.toLowerCase()} at ${result.disclosureScore}/100; ${result.lodr.filter((c) => !c.met).length} of ${result.lodr.length} LODR / Ind AS 24 checks are not evidenced in the note.`,
    `${byCat[0] ? `${byCat[0][0][0].toUpperCase()}${byCat[0][0].slice(1)} dominates related party flows (${((byCat[0][1] / gross) * 100).toFixed(0)}% of gross RPTs).` : ""} ${result.materialTransactions.length ? `${result.materialTransactions.length} transaction(s) exceed the Reg 23 materiality threshold and require prior shareholder approval.` : "No single transaction crosses the Reg 23 materiality threshold."}`,
    t.status === "tied" ? `Extraction is validated: line items tie to the disclosed aggregate within tolerance, and ${verified}/${result.transactions.length} citations are verified against the source.` : `Validation flag: the tie-out ${t.status === "mismatch" ? `is off by ${fmt(t.difference)}` : "could not be performed"} — review before relying on these figures.`,
  ];

  async function getInsight() {
    setLoadingInsight(true);
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: result.company, sector, facts, fallback }),
      });
      setInsight(await res.json());
    } catch {
      setInsight({ mode: "rules", text: fallback.map((f) => `- ${f}`).join("\n") });
    } finally {
      setLoadingInsight(false);
    }
  }

  const risk =
    result.rptToRevenue !== null
      ? riskScore({ rptToRevenue: result.rptToRevenue, disclosureScore: result.disclosureScore, promoterPledge: 0, auditQualified: false, boardIndependence: 50 })
      : null;

  function download(kind: "json" | "csv") {
    const blob =
      kind === "json"
        ? new Blob([JSON.stringify({ ...result, sector }, null, 2)], { type: "application/json" })
        : new Blob(
            [
              ["id,party,relationship,nature,category,amount,previous_amount,note,line,page,verified,quote"]
                .concat(
                  result.transactions.map((x) =>
                    [x.id, x.party, x.relationship, x.nature, x.category, x.amount, x.previousAmount ?? "", x.citation.note, x.citation.line, x.citation.page ?? "", x.citation.verified, x.citation.quote]
                      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                      .join(","),
                  ),
                )
                .join("\n"),
            ],
            { type: "text/csv" },
          );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rptscan-${result.company.replace(/\W+/g, "-").toLowerCase()}.${kind}`;
    a.click();
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-white">{result.company}</h2>
        <Badge tone={result.mode === "ai" ? "info" : "default"}>{result.mode === "ai" ? `✦ Claude · ${result.model}` : "Rule engine"}</Badge>
        <Badge>{result.note}</Badge>
        <Badge>{result.fiscalYear}</Badge>
        <Badge>{result.unit}</Badge>
        <div className="no-print ml-auto flex flex-wrap gap-2">
          <Link href="/ask" className="btn-ghost py-1.5 text-xs">
            <IconChat className="h-3.5 w-3.5" /> Ask AI about this
          </Link>
          <button onClick={() => window.print()} className="btn-ghost py-1.5 text-xs">
            <IconPrint className="h-3.5 w-3.5" /> Print report
          </button>
          <button onClick={() => download("csv")} className="btn-ghost py-1.5 text-xs">
            ⬇ CSV
          </button>
          <button onClick={() => download("json")} className="btn-ghost py-1.5 text-xs">
            ⬇ JSON
          </button>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 text-xs text-amber-200/90">
          {result.warnings.map((w) => (
            <div key={w}>⚠ {w}</div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card card-pad">
          <div className="label">Transactions</div>
          <div className="num mt-2 text-3xl font-bold text-white">{result.transactions.length}</div>
          <div className="mt-1 text-xs text-slate-400">gross {fmt(gross)} ({result.unit})</div>
        </div>
        <div className="card card-pad">
          <div className="label">RPT / Revenue</div>
          <div className="num mt-2 text-3xl font-bold text-white">{pct(result.rptToRevenue)}</div>
          <div className="mt-1 text-xs text-slate-400">revenue {crore(result.revenue)}</div>
        </div>
        <div className="card card-pad">
          <div className="label">RPT / Net worth</div>
          <div className="num mt-2 text-3xl font-bold text-white">{pct(result.rptToNetWorth)}</div>
          <div className="mt-1 text-xs text-slate-400">net worth {crore(result.netWorth)}</div>
        </div>
        <div className="card card-pad flex items-center justify-center">
          <Gauge value={result.disclosureScore} label={`Disclosure · ${band.label}`} />
        </div>
        <div className="card card-pad">
          <div className="label">Validation</div>
          <div className={`mt-2 text-2xl font-bold ${t.status === "tied" ? "text-emerald-400" : t.status === "mismatch" ? "text-rose-400" : "text-amber-300"}`}>
            {t.status === "tied" ? "✓ Ties out" : t.status === "mismatch" ? "✗ Mismatch" : "No total"}
          </div>
          <div className="num mt-1 text-xs text-slate-400">
            {verified}/{result.transactions.length} citations verified
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Extracted transactions" subtitle="Every figure cites the note and line it was read from">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="th">#</th>
                  <th className="th">Related party</th>
                  <th className="th">Nature</th>
                  <th className="th text-right">Current</th>
                  <th className="th text-right">Previous</th>
                  <th className="th">Citation</th>
                </tr>
              </thead>
              <tbody>
                {result.transactions.map((x) => {
                  const material = Math.abs(x.amount) > threshold;
                  return (
                    <tr key={x.id} className="border-b border-white/5 align-top hover:bg-white/[0.02]">
                      <td className="td num text-slate-500">{x.id}</td>
                      <td className="td">
                        <div className="font-medium text-slate-100">{x.party}</div>
                        <div className="text-xs text-slate-500">{x.relationship}</div>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CAT_COLORS[x.category] }} />
                          <span className="text-slate-300">{x.nature}</span>
                        </div>
                        {material && <Badge tone="warn">Material · Reg 23(4)</Badge>}
                      </td>
                      <td className="td num text-right font-semibold text-white">{fmt(x.amount)}</td>
                      <td className="td num text-right text-slate-500">{fmt(x.previousAmount)}</td>
                      <td className="td">
                        <button
                          onClick={() => onJump(x.citation.line)}
                          className={`num whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                            x.citation.verified ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30" : "bg-rose-500/10 text-rose-300 ring-rose-500/30"
                          }`}
                          title={x.citation.quote}
                        >
                          {x.citation.verified ? "✓" : "?"} {x.citation.note} · L{x.citation.line}
                          {x.citation.page ? ` · p.${x.citation.page}` : ""}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/15">
                  <td className="td" />
                  <td className="td font-semibold text-slate-200" colSpan={2}>
                    Sum of extracted lines
                  </td>
                  <td className="td num text-right font-bold text-white">{fmt(t.extractedTotal)}</td>
                  <td className="td" colSpan={2} />
                </tr>
                <tr>
                  <td className="td" />
                  <td className="td text-slate-400" colSpan={2}>
                    Disclosed aggregate in note
                  </td>
                  <td className="td num text-right text-slate-300">{fmt(t.disclosedAggregate)}</td>
                  <td className="td" />
                  <td className="td">
                    {t.aggregateCitation && (
                      <button onClick={() => onJump(t.aggregateCitation!.line)} className="num rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300 ring-1 ring-inset ring-white/10">
                        {t.aggregateCitation.note} · L{t.aggregateCitation.line}
                      </button>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="td" />
                  <td className="td text-slate-400" colSpan={2}>
                    Difference
                  </td>
                  <td className={`td num text-right font-semibold ${t.status === "tied" ? "text-emerald-400" : "text-rose-400"}`}>
                    {t.difference === null ? "—" : `${fmt(t.difference)}${t.differencePct !== null ? ` (${t.differencePct.toFixed(2)}%)` : ""}`}
                  </td>
                  <td className="td" colSpan={2}>
                    <span className="text-xs text-slate-500">tolerance ±0.5%</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card title="Mix of related party flows" subtitle="Share of gross RPTs by nature">
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {byCat.map(([k, v]) => (
              <div key={k} style={{ width: `${(v / gross) * 100}%`, background: CAT_COLORS[k] }} title={k} />
            ))}
          </div>
          <div className="space-y-2">
            {byCat.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CAT_COLORS[k] }} />
                <span className="capitalize text-slate-300">{k}</span>
                <span className="num ml-auto text-slate-400">{((v / gross) * 100).toFixed(1)}%</span>
                <span className="num w-20 text-right text-slate-500">{fmt(v, 0)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-white/[0.03] p-3 text-xs text-slate-400">
            Reg 23 materiality threshold for this company: <span className="num font-semibold text-slate-200">₹{fmt(threshold, 0)} cr</span> (lower of ₹1,000 cr or 10% of
            turnover). {result.materialTransactions.length} transaction(s) above it.
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="LODR disclosure scorecard" subtitle={`Score ${result.disclosureScore}/100 — weighted share of requirements evidenced in the note`}>
          <div className="divide-y divide-white/5">
            {LODR_CHECKS.map((req) => {
              const c = result.lodr.find((x) => x.id === req.id);
              return (
                <div key={req.id} className="flex gap-3 py-2.5">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${c?.met ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                    {c?.met ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium text-slate-100">{req.title}</span>
                      <span className="text-[11px] text-slate-500">{req.source}</span>
                    </div>
                    {c?.evidence ? <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">“{c.evidence}”</div> : <div className="mt-0.5 text-[11px] text-slate-600">{req.description}</div>}
                  </div>
                  <span className="num text-xs text-slate-500">{req.weight} pts</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-2" title={`Against the ${sector} sector`} subtitle={`${peers.length} peers in the study panel · band = P25–P75`}>
          <div className="space-y-6">
            {positions.map((p) => (
              <div key={p.metric}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-200">{p.metric}</span>
                  <span className="num text-sm font-semibold text-white">
                    {p.format === "pct" ? pct(p.value) : p.value.toFixed(0)} <span className="text-xs font-normal text-slate-400">· {ordinal(p.percentile)} pct.</span>
                  </span>
                </div>
                <PercentileStrip
                  min={Math.min(...peers.map((c) => (p.metric === "RPT / Revenue" ? c.rptToRevenue : p.metric === "RPT / Net worth" ? c.rptToNetWorth : c.disclosureScore)))}
                  max={Math.max(...peers.map((c) => (p.metric === "RPT / Revenue" ? c.rptToRevenue : p.metric === "RPT / Net worth" ? c.rptToNetWorth : c.disclosureScore)))}
                  p25={p.sectorP25}
                  p75={p.sectorP75}
                  median={p.sectorMedian}
                  value={p.value}
                  higherIsWorse={p.higherIsWorse}
                  format={(v) => (p.format === "pct" ? pct(v, 0) : v.toFixed(0))}
                />
              </div>
            ))}
            {!positions.some((p) => p.format === "pct") && <p className="text-xs text-slate-400">Enter revenue and net worth to scale RPTs and rank them against peers.</p>}
            {risk !== null && (
              <div className="mt-8 flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                <span className="text-sm text-slate-300">Governance risk flag (RPT × disclosure)</span>
                <span className={`num text-lg font-bold ${risk >= 50 ? "text-rose-400" : risk >= 30 ? "text-amber-300" : "text-emerald-400"}`}>{risk}/100</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="RPT / Revenue — sector league table" subtitle="★ = the company you just extracted">
          <HBars rows={peerRows} highlight={`★ ${result.company}`} format={(v) => `${v.toFixed(1)}%`} />
        </Card>
        <Card
          title="AI analyst note"
          subtitle="Interpretation of the extracted figures against the sector"
          action={
            <button onClick={getInsight} disabled={loadingInsight} className="btn-primary py-1.5 text-xs">
              {loadingInsight ? "Writing…" : insight ? "Regenerate" : "✦ Generate"}
            </button>
          }
        >
          {insight ? (
            <>
              <ul className="space-y-2.5 text-sm leading-relaxed text-slate-300">
                {insight.text
                  .split("\n")
                  .filter((l) => l.trim().startsWith("-"))
                  .map((l, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-brand-400">▸</span>
                      <span dangerouslySetInnerHTML={{ __html: l.replace(/^\s*-\s*/, "").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<strong class='text-white'>$1</strong>") }} />
                    </li>
                  ))}
              </ul>
              <div className="mt-4">
                <Badge tone={insight.mode === "ai" ? "info" : "default"}>{insight.mode === "ai" ? "✦ Written by Claude" : "Template (AI key not set)"}</Badge>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Generate a short, data-grounded commentary on this company&apos;s related party exposure and disclosure quality.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
