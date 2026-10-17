"use client";

import { useMemo, useState } from "react";
import { Scatter } from "@/components/charts";
import { Badge, Card, PageHeader, SimulatedNotice } from "@/components/ui";
import { COMPANIES, SECTORS } from "@/lib/companies";
import { mean, ols } from "@/lib/stats";
import type { Company } from "@/lib/types";

type Var = { key: string; label: string; get: (c: Company) => number };

const DEPENDENTS: Var[] = [
  { key: "roaNext", label: "ROA t+1 (%)", get: (c) => c.roaNext },
  { key: "tsrNext", label: "Total return t+1 (%)", get: (c) => c.tsrNext },
  { key: "dqs", label: "Disclosure score", get: (c) => c.disclosureScore },
  { key: "audit", label: "Audit qualified (0/1, LPM)", get: (c) => (c.auditQualified ? 1 : 0) },
];

const REGRESSORS: Var[] = [
  { key: "rptRev", label: "RPT / Revenue (pp)", get: (c) => c.rptToRevenue * 100 },
  { key: "rptNw", label: "RPT / Net worth (pp)", get: (c) => c.rptToNetWorth * 100 },
  { key: "dqs", label: "Disclosure score", get: (c) => c.disclosureScore },
  { key: "size", label: "ln(Revenue)", get: (c) => Math.log(c.revenue) },
  { key: "promoter", label: "Promoter holding %", get: (c) => c.promoterHolding },
  { key: "indep", label: "Board independence %", get: (c) => c.boardIndependence },
  { key: "pledge", label: "Promoter pledge %", get: (c) => c.promoterPledge },
  { key: "ac", label: "Audit committee meetings", get: (c) => c.acMeetings },
  { key: "roa", label: "ROA t (%)", get: (c) => c.roa },
];

const PRESETS: { name: string; dep: string; x: string[]; fe: boolean; excl: string[] }[] = [
  { name: "Main spec", dep: "roaNext", x: ["rptRev", "dqs", "size", "promoter", "indep", "pledge"], fe: true, excl: [] },
  { name: "Net-worth scaling", dep: "roaNext", x: ["rptNw", "dqs", "size", "promoter", "indep", "pledge"], fe: true, excl: [] },
  { name: "Ex-financials", dep: "roaNext", x: ["rptRev", "dqs", "size", "promoter", "indep", "pledge"], fe: true, excl: ["Financial Services"] },
  { name: "Market returns", dep: "tsrNext", x: ["rptRev", "dqs", "size", "promoter", "indep", "pledge"], fe: true, excl: [] },
  { name: "Governance channel", dep: "dqs", x: ["rptRev", "promoter", "indep", "pledge", "size"], fe: false, excl: [] },
  { name: "Audit outcome", dep: "audit", x: ["rptRev", "dqs", "size", "pledge"], fe: false, excl: [] },
];

const stars = (p: number) => (p < 0.01 ? "***" : p < 0.05 ? "**" : p < 0.1 ? "*" : "");

/** Within-sector transformation: subtract each sector's mean (sector fixed effects). */
function demean(values: number[], groups: string[]) {
  const m = new Map<string, number>();
  for (const g of new Set(groups)) m.set(g, mean(values.filter((_, i) => groups[i] === g)));
  return values.map((v, i) => v - (m.get(groups[i]) ?? 0));
}

export default function LabPage() {
  const [dep, setDep] = useState("roaNext");
  const [xs, setXs] = useState<string[]>(PRESETS[0].x);
  const [fe, setFe] = useState(true);
  const [excl, setExcl] = useState<string[]>([]);

  const result = useMemo(() => {
    const sample = COMPANIES.filter((c) => !excl.includes(c.sector));
    const d = DEPENDENTS.find((v) => v.key === dep)!;
    const vars = REGRESSORS.filter((r) => xs.includes(r.key) && !(dep === "dqs" && r.key === "dqs"));
    if (!vars.length || sample.length <= vars.length + 2) return null;
    const groups = sample.map((c) => c.sector);
    let y = sample.map(d.get);
    let cols = vars.map((v) => sample.map(v.get));
    if (fe) {
      y = demean(y, groups);
      cols = cols.map((col) => demean(col, groups));
    }
    const X = sample.map((_, i) => cols.map((col) => col[i]));
    try {
      const r = ols(y, X, vars.map((v) => v.label));
      if (r.coef.some((c) => !Number.isFinite(c))) return null;
      return { r, d, vars, n: sample.length, sample, y, cols };
    } catch {
      return null;
    }
  }, [dep, xs, fe, excl]);

  const apply = (p: (typeof PRESETS)[number]) => {
    setDep(p.dep);
    setXs(p.x);
    setFe(p.fe);
    setExcl(p.excl);
  };

  const focus = result?.vars.findIndex((v) => v.key === "rptRev" || v.key === "rptNw") ?? -1;
  const fi = focus >= 0 ? focus + 1 : -1;

  return (
    <>
      <PageHeader eyebrow="Defend the result" title="Regression Lab">
        Re-run the study&apos;s OLS live in your browser: change the outcome, add or drop controls, switch sector fixed effects on or off, or drop a sector — and
        watch whether the RPT coefficient survives.
      </PageHeader>
      <SimulatedNotice />

      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.name} onClick={() => apply(p)} className="btn-ghost py-1.5 text-xs">
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card title="Specification">
          <label className="label">Dependent variable</label>
          <div className="mt-2 grid gap-1.5">
            {DEPENDENTS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDep(d.key)}
                className={`rounded-lg px-3 py-2 text-left text-sm ring-1 ring-inset transition ${dep === d.key ? "bg-brand-500/15 text-white ring-brand-500/40" : "text-slate-400 ring-white/10 hover:text-slate-200"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <label className="label mt-5 block">Regressors</label>
          <div className="mt-2 space-y-1">
            {REGRESSORS.map((r) => (
              <label key={r.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-white/[0.03]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-500"
                  checked={xs.includes(r.key)}
                  onChange={(e) => setXs(e.target.checked ? [...xs, r.key] : xs.filter((k) => k !== r.key))}
                />
                {r.label}
              </label>
            ))}
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200">
            Sector fixed effects
            <button
              type="button"
              onClick={() => setFe(!fe)}
              className={`relative h-6 w-11 rounded-full transition ${fe ? "bg-brand-500" : "bg-white/15"}`}
              aria-pressed={fe}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${fe ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </label>
          <label className="label mt-5 block">Exclude sectors</label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SECTORS.map((s) => (
              <button
                key={s}
                onClick={() => setExcl(excl.includes(s) ? excl.filter((x) => x !== s) : [...excl, s])}
                className={`rounded-md px-2 py-1 text-[11px] ring-1 ring-inset ${excl.includes(s) ? "bg-rose-500/15 text-rose-300 ring-rose-500/40 line-through" : "text-slate-400 ring-white/10"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          {!result ? (
            <Card title="Not estimable">
              <p className="text-sm text-slate-400">Pick at least one regressor (and keep enough companies in the sample).</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["n", String(result.n)],
                  ["R²", result.r.r2.toFixed(3)],
                  ["Adj. R²", result.r.adjR2.toFixed(3)],
                  ["Fixed effects", fe ? "Sector" : "None"],
                ].map(([k, v]) => (
                  <div key={k} className="card p-4">
                    <div className="label">{k}</div>
                    <div className="num mt-1 text-xl font-bold text-white">{v}</div>
                  </div>
                ))}
              </div>

              {fi > 0 && (
                <div className={`glow-border rounded-2xl border p-5 ${result.r.p[fi] < 0.05 ? "border-emerald-500/20 bg-emerald-500/[0.05]" : "border-amber-500/20 bg-amber-500/[0.05]"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={result.r.p[fi] < 0.05 ? "good" : "warn"}>{result.r.p[fi] < 0.05 ? "Significant at 5%" : "Not significant at 5%"}</Badge>
                    <span className="text-xs text-slate-400">{result.r.names[fi]}</span>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-200">
                    A 10 pp increase in {result.r.names[fi].replace(" (pp)", "")} is associated with a{" "}
                    <strong className="text-white">
                      {(result.r.coef[fi] * 10).toFixed(dep === "audit" ? 3 : 2)}
                      {dep === "roaNext" || dep === "tsrNext" ? " pp" : dep === "dqs" ? " points" : ""}
                    </strong>{" "}
                    change in {result.d.label} (t = {result.r.t[fi].toFixed(2)}, p = {result.r.p[fi].toFixed(3)}).
                  </p>
                </div>
              )}

              <Card title="Coefficient plot" subtitle="Point estimate ± 95% confidence interval (excluding intercept), standardised per 1 SD of the regressor">
                <CoefPlot names={result.r.names.slice(1)} coef={result.r.coef.slice(1).map((c, i) => c * sd(result.cols[i]))} se={result.r.se.slice(1).map((s, i) => s * sd(result.cols[i]))} />
              </Card>

              <Card title="Estimates">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="th">Dependent: {result.d.label}</th>
                        <th className="th text-right">β</th>
                        <th className="th text-right">SE</th>
                        <th className="th text-right">t</th>
                        <th className="th text-right">p</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.r.names.map((n, i) => (
                        <tr key={n} className={`border-b border-white/5 ${i === fi ? "bg-brand-500/[0.08]" : ""}`}>
                          <td className="td text-slate-300">{n}</td>
                          <td className="td num text-right">
                            {result.r.coef[i].toFixed(4)}
                            <span className="text-amber-300">{stars(result.r.p[i])}</span>
                          </td>
                          <td className="td num text-right text-slate-400">{result.r.se[i].toFixed(4)}</td>
                          <td className="td num text-right text-slate-400">{result.r.t[i].toFixed(2)}</td>
                          <td className="td num text-right text-slate-400">{result.r.p[i].toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">*** p&lt;0.01, ** p&lt;0.05, * p&lt;0.1 · classical OLS standard errors</p>
              </Card>

              {fi > 0 && (
                <Card title="Added-variable plot" subtitle={`${result.d.label} vs ${result.r.names[fi]}, both residualised on the other controls (Frisch–Waugh)`}>
                  <AddedVariable y={result.y} cols={result.cols} focus={focus} labels={result.sample.map((c) => c.name)} xLabel={result.r.names[fi]} yLabel={result.d.label} />
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function sd(xs: number[]) {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function residualise(target: number[], others: number[][]) {
  if (!others.length) {
    const m = mean(target);
    return target.map((v) => v - m);
  }
  const X = target.map((_, i) => others.map((col) => col[i]));
  const r = ols(target, X, others.map((_, k) => `x${k}`));
  return target.map((v, i) => v - (r.coef[0] + others.reduce((s, col, k) => s + col[i] * r.coef[k + 1], 0)));
}

function AddedVariable({ y, cols, focus, labels, xLabel, yLabel }: { y: number[]; cols: number[][]; focus: number; labels: string[]; xLabel: string; yLabel: string }) {
  const others = cols.filter((_, k) => k !== focus);
  const ry = residualise(y, others);
  const rx = residualise(cols[focus], others);
  return (
    <Scatter
      points={rx.map((x, i) => ({ id: String(i), x: x - Math.min(...rx), y: ry[i], color: "#60a5fa", label: labels[i] }))}
      xLabel={`${xLabel} (residual, shifted)`}
      yLabel={`${yLabel} (residual)`}
      xFormat={{ type: "num", digits: 0 }}
      yFormat={{ type: "num", digits: 0 }}
      height={280}
    />
  );
}

function CoefPlot({ names, coef, se }: { names: string[]; coef: number[]; se: number[] }) {
  const lo = coef.map((c, i) => c - 1.96 * se[i]);
  const hi = coef.map((c, i) => c + 1.96 * se[i]);
  const ext = Math.max(...lo.map(Math.abs), ...hi.map(Math.abs)) * 1.1 || 1;
  const pos = (v: number) => `${50 + (v / ext) * 50}%`;
  return (
    <div className="space-y-2.5">
      {names.map((n, i) => {
        const sig = lo[i] > 0 || hi[i] < 0;
        const col = !sig ? "#94a3b8" : coef[i] < 0 ? "#f43f5e" : "#10b981";
        return (
          <div key={n} className="grid grid-cols-[minmax(0,11rem)_1fr_4rem] items-center gap-3 text-sm">
            <span className="truncate text-slate-300" title={n}>
              {n}
            </span>
            <div className="relative h-6">
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
              <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ left: pos(lo[i]), width: `calc(${pos(hi[i])} - ${pos(lo[i])})`, background: col, opacity: 0.45 }} />
              <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-950" style={{ left: pos(coef[i]), background: col }} />
            </div>
            <span className="num text-right text-xs" style={{ color: col }}>
              {coef[i].toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
