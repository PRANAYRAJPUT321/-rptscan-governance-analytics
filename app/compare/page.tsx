"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Radar } from "@/components/charts";
import { IconSearch } from "@/components/icons";
import { Card, PageHeader, SimulatedNotice } from "@/components/ui";
import { riskScore } from "@/lib/analysis";
import { COMPANIES } from "@/lib/companies";
import { crore, pct } from "@/lib/format";
import { percentileRank } from "@/lib/stats";
import type { Company } from "@/lib/types";

const COLORS = ["#60a5fa", "#f59e0b", "#2dd4bf", "#f472b6"];

const AXES: { label: string; get: (c: Company) => number; better: "low" | "high" }[] = [
  { label: "Low RPT / Rev", get: (c) => c.rptToRevenue, better: "low" },
  { label: "Low RPT / NW", get: (c) => c.rptToNetWorth, better: "low" },
  { label: "Disclosure", get: (c) => c.disclosureScore, better: "high" },
  { label: "Board indep.", get: (c) => c.boardIndependence, better: "high" },
  { label: "Low pledge", get: (c) => c.promoterPledge, better: "low" },
  { label: "ROA t+1", get: (c) => c.roaNext, better: "high" },
];

const ROWS: { label: string; fmt: (c: Company) => string; val: (c: Company) => number; better: "low" | "high" }[] = [
  { label: "Sector", fmt: (c) => c.sector, val: () => 0, better: "high" },
  { label: "Revenue", fmt: (c) => crore(c.revenue), val: (c) => c.revenue, better: "high" },
  { label: "Total RPTs", fmt: (c) => crore(c.rptTotal), val: (c) => c.rptTotal, better: "low" },
  { label: "RPT / Revenue", fmt: (c) => pct(c.rptToRevenue), val: (c) => c.rptToRevenue, better: "low" },
  { label: "RPT / Net worth", fmt: (c) => pct(c.rptToNetWorth), val: (c) => c.rptToNetWorth, better: "low" },
  { label: "Disclosure score", fmt: (c) => `${c.disclosureScore}/100`, val: (c) => c.disclosureScore, better: "high" },
  { label: "Board independence", fmt: (c) => `${c.boardIndependence}%`, val: (c) => c.boardIndependence, better: "high" },
  { label: "Promoter holding", fmt: (c) => `${c.promoterHolding}%`, val: () => 0, better: "high" },
  { label: "Promoter pledge", fmt: (c) => `${c.promoterPledge}%`, val: (c) => c.promoterPledge, better: "low" },
  { label: "Audit opinion", fmt: (c) => (c.auditQualified ? "Qualified" : "Unmodified"), val: (c) => (c.auditQualified ? 1 : 0), better: "low" },
  { label: "ROA t → t+1", fmt: (c) => `${c.roa}% → ${c.roaNext}%`, val: (c) => c.roaNext, better: "high" },
  { label: "Total return t+1", fmt: (c) => `${c.tsrNext}%`, val: (c) => c.tsrNext, better: "high" },
  { label: "Governance risk", fmt: (c) => `${riskScore(c)}/100`, val: (c) => riskScore(c), better: "low" },
];

export default function ComparePage() {
  const [picked, setPicked] = useState<string[]>(["ADANIENT", "TCS", "TATASTEEL", "DLF"]);
  const [q, setQ] = useState("");
  const companies = picked.map((s) => COMPANIES.find((c) => c.symbol === s)!).filter(Boolean);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return COMPANIES.filter((c) => !picked.includes(c.symbol) && `${c.name} ${c.symbol} ${c.sector}`.toLowerCase().includes(s)).slice(0, 6);
  }, [q, picked]);

  const series = companies.map((c, i) => ({
    name: c.name,
    color: COLORS[i],
    values: AXES.map((a) => {
      const all = COMPANIES.map(a.get);
      const p = percentileRank(all, a.get(c)) / 100;
      return a.better === "low" ? 1 - p : p;
    }),
  }));

  return (
    <>
      <PageHeader eyebrow="Peer analysis" title="Compare companies">
        Pick up to four companies to compare their related party exposure, disclosure quality and governance outcomes side by side.
      </PageHeader>
      <SimulatedNotice />

      <div className="card card-pad">
        <div className="flex flex-wrap items-center gap-2">
          {companies.map((c, i) => (
            <span key={c.symbol} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-3 pr-1 text-sm text-slate-100">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
              {c.name}
              <button onClick={() => setPicked(picked.filter((s) => s !== c.symbol))} className="grid h-6 w-6 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white" aria-label={`Remove ${c.name}`}>
                ×
              </button>
            </span>
          ))}
          {picked.length < 4 && (
            <div className="relative">
              <div className="flex items-center gap-2 rounded-full border border-dashed border-white/15 px-3 py-1.5">
                <IconSearch className="h-4 w-4 text-slate-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add company…" className="w-40 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none" />
              </div>
              {matches.length > 0 && (
                <div className="animate-pop absolute left-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-2xl">
                  {matches.map((c) => (
                    <button
                      key={c.symbol}
                      onClick={() => {
                        setPicked([...picked, c.symbol]);
                        setQ("");
                      }}
                      className="block w-full px-3 py-2 text-left hover:bg-white/5"
                    >
                      <div className="text-sm text-slate-100">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.symbol} · {c.sector}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {companies.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2" title="Governance profile" subtitle="Percentile across all 100 companies · outer edge = better">
            <Radar axes={AXES.map((a) => a.label)} series={series} />
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-slate-400">
              {series.map((s) => (
                <span key={s.name} className="flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-3" title="Side by side" subtitle="Best value in each row highlighted">
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="th" />
                    {companies.map((c, i) => (
                      <th key={c.symbol} className="th">
                        <Link href={`/companies/${encodeURIComponent(c.symbol)}`} className="flex items-center gap-1.5 normal-case tracking-normal text-slate-200 hover:text-white">
                          <i className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
                          {c.symbol}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => {
                    const vals = companies.map(r.val);
                    const best = r.better === "low" ? Math.min(...vals) : Math.max(...vals);
                    const comparable = new Set(vals).size > 1 && r.label !== "Sector" && r.label !== "Promoter holding";
                    return (
                      <tr key={r.label} className="border-b border-white/5">
                        <td className="td whitespace-nowrap text-slate-400">{r.label}</td>
                        {companies.map((c, i) => (
                          <td key={c.symbol} className={`td num ${comparable && vals[i] === best ? "font-semibold text-emerald-300" : "text-slate-200"}`}>
                            {r.fmt(c)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {companies.length > 0 && (
        <Card className="mt-6" title="Mix of related party flows" subtitle="Share of each company's gross RPTs by nature">
          <div className="space-y-4">
            {companies.map((c, i) => {
              const mix = Object.entries(c.rptMix).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
              const tot = mix.reduce((s, [, v]) => s + (v ?? 0), 0) || 1;
              const hues: Record<string, string> = { purchase: "#3b82f6", sale: "#10b981", services: "#06b6d4", loan: "#f43f5e", guarantee: "#f97316", royalty: "#eab308", investment: "#a855f7", remuneration: "#ec4899" };
              return (
                <div key={c.symbol}>
                  <div className="mb-1.5 flex items-center gap-2 text-sm">
                    <i className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="font-medium text-slate-200">{c.name}</span>
                    <span className="num ml-auto text-xs text-slate-500">{crore(c.rptTotal)}</span>
                  </div>
                  <div className="flex h-6 overflow-hidden rounded-lg">
                    {mix.map(([k, v]) => (
                      <div key={k} title={`${k}: ${(((v ?? 0) / tot) * 100).toFixed(1)}%`} className="grid place-items-center text-[10px] font-semibold text-white/90" style={{ width: `${((v ?? 0) / tot) * 100}%`, background: hues[k] ?? "#64748b" }}>
                        {(v ?? 0) / tot > 0.09 ? k : ""}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}
