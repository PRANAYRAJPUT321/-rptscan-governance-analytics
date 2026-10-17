import Link from "next/link";
import { BubbleMap, Columns, Heatmap, HBars, Scatter } from "@/components/charts";
import { IconAlert, IconArrow, IconChat, IconCheck, IconFile, IconLink, IconShield, IconSpark } from "@/components/icons";
import { CountUp, Reveal } from "@/components/motion";
import { Badge, Card, DQS_COLOR, SimulatedNotice } from "@/components/ui";
import { VARIABLES, correlationMatrix, governanceRegression, mainRegression, quintiles, riskScore, sectorSummary } from "@/lib/analysis";
import { COMPANIES, SECTORS } from "@/lib/companies";
import { pct } from "@/lib/format";
import { mean, median } from "@/lib/stats";

function stars(p: number) {
  return p < 0.01 ? "***" : p < 0.05 ? "**" : p < 0.1 ? "*" : "";
}

function corrColor(r: number) {
  const a = Math.min(Math.abs(r), 1);
  return r >= 0 ? `rgba(59,130,246,${0.08 + a * 0.7})` : `rgba(244,63,94,${0.08 + a * 0.7})`;
}

function flagsFor(c: (typeof COMPANIES)[number]) {
  const f: string[] = [];
  if (c.rptToRevenue > 0.3) f.push(`RPT ${pct(c.rptToRevenue, 0)} of revenue`);
  if (c.disclosureScore < 65) f.push(`weak disclosure (${c.disclosureScore})`);
  if (c.promoterPledge > 20) f.push(`${c.promoterPledge.toFixed(0)}% promoter pledge`);
  if (c.auditQualified) f.push("qualified audit opinion");
  if (!c.tieOutPassed) f.push("tie-out failed");
  if (c.boardIndependence < 45) f.push(`board independence ${c.boardIndependence}%`);
  return f;
}

export default function Home() {
  const reg = mainRegression();
  const gov = governanceRegression();
  const q = quintiles();
  const corr = correlationMatrix();
  const sectors = sectorSummary();
  const rptCoef = reg.coef[1];
  const q1 = q[0];
  const q5 = q[4];
  const tied = COMPANIES.filter((c) => c.tieOutPassed).length;
  const medRpt = median(COMPANIES.map((c) => c.rptToRevenue));
  const medDqs = median(COMPANIES.map((c) => c.disclosureScore));
  const scored = COMPANIES.map((c) => ({ ...c, risk: riskScore(c), flags: flagsFor(c) }));
  const redFlags = [...scored].sort((a, b) => b.risk - a.risk).slice(0, 6);
  const highRisk = scored.filter((c) => c.risk >= 50).length;

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-ink-900/60 to-transparent px-5 pb-6 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-300" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-300" />
              </span>
              AI in Finance · Disclosure Quality &amp; Governance Outcomes
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[56px]">
              Do related party transactions <span className="text-gradient">predict weaker governance?</span>
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-slate-400">
              RPTScan reads the SEBI LODR related party note of an annual report with AI, cites every transaction back to its source line, proves the totals tie
              out, scores disclosure quality, and tests whether RPT intensity predicts governance and next-year performance across 100 NSE companies.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/extract" className="btn-primary px-5 py-3 text-[15px]">
                <IconSpark className="h-4 w-4" /> Run live extraction
              </Link>
              <Link href="/ask" className="btn-ghost px-5 py-3 text-[15px]">
                <IconChat className="h-4 w-4" /> Ask the AI analyst
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><IconCheck className="h-3.5 w-3.5 text-emerald-400" /> Every figure cited</span>
              <span className="flex items-center gap-1.5"><IconCheck className="h-3.5 w-3.5 text-emerald-400" /> Totals tie to the note</span>
              <span className="flex items-center gap-1.5"><IconCheck className="h-3.5 w-3.5 text-emerald-400" /> 12-point LODR rubric</span>
            </div>
          </div>

          {/* Product illustration */}
          <div className="relative hidden animate-fade-up [animation-delay:150ms] lg:block">
            <div className="glow-border animate-float rounded-2xl border border-white/10 bg-ink-900/90 p-5 shadow-2xl shadow-brand-900/40 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <IconFile className="h-4 w-4 text-brand-300" /> Note 42 · Related Party Disclosures
                </div>
                <Badge tone="info">✦ Claude</Badge>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  ["Aarav Steel Ltd", "Purchase of goods", "1,426.35", "L20"],
                  ["Aarav Infra Projects", "Corporate guarantee", "600.00", "L25"],
                  ["Aarav Steel Ltd", "Loan given · 8.5% p.a.", "450.00", "L22"],
                  ["Aarav Holdings Pvt", "Royalty / brand fee", "184.20", "L17"],
                ].map(([p, n, a, l], i) => (
                  <div key={l} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 animate-fade-up" style={{ animationDelay: `${300 + i * 120}ms` }}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-slate-100">{p}</div>
                      <div className="truncate text-[11px] text-slate-500">{n}</div>
                    </div>
                    <div className="num text-[13px] font-semibold text-white">{a}</div>
                    <span className="num flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                      <IconLink className="h-3 w-3" />
                      {l}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-inset ring-emerald-500/25">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">Tie-out</div>
                  <div className="mt-0.5 text-sm font-bold text-emerald-300">✓ 3,710.50</div>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">RPT / Rev</div>
                  <div className="num mt-0.5 text-sm font-bold text-white">20.1%</div>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">LODR score</div>
                  <div className="num mt-0.5 text-sm font-bold text-white">100</div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-6 flex items-center gap-2 rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2 text-xs shadow-xl">
              <IconShield className="h-4 w-4 text-teal-300" />
              <span className="text-slate-300">13 / 13 citations verified</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="relative mt-10 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: "Companies", node: <CountUp value={100} />, hint: `${SECTORS.length} NSE sectors` },
            { label: "Median RPT / Revenue", node: <CountUp value={medRpt * 100} decimals={1} suffix="%" />, hint: `RPT / Net worth ${pct(median(COMPANIES.map((c) => c.rptToNetWorth)))}` },
            { label: "Median disclosure score", node: <CountUp value={medDqs} />, hint: "out of 100 · 12 LODR checks" },
            { label: "Tie-out pass rate", node: <CountUp value={tied} suffix="%" />, hint: "lines = disclosed total" },
            { label: "High governance risk", node: <CountUp value={highRisk} />, hint: "risk score ≥ 50" },
          ].map((k, i) => (
            <Reveal key={k.label} delay={i * 70}>
              <div className="card card-hover h-full p-4 sm:p-5">
                <div className="label">{k.label}</div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{k.node}</div>
                <div className="mt-1 text-xs text-slate-500">{k.hint}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <SimulatedNotice />

      {/* ---------- Answer ---------- */}
      <Reveal>
        <div className="grid gap-6 lg:grid-cols-5">
          <Card
            className="lg:col-span-3"
            title="RPT intensity vs next-year ROA"
            subtitle="Each dot is a company, coloured by disclosure quality; dashed line is the OLS fit"
            action={
              <div className="flex shrink-0 gap-2 whitespace-nowrap text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />≥80</span>
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-500" />60–79</span>
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-500" />&lt;60</span>
              </div>
            }
          >
            <Scatter
              points={COMPANIES.map((c) => ({
                id: c.symbol,
                x: c.rptToRevenue * 100,
                y: c.roaNext,
                color: DQS_COLOR(c.disclosureScore),
                label: `${c.name} (${c.symbol})`,
                detail: `${c.sector} · DQS ${c.disclosureScore}`,
              }))}
              xLabel="RPT / Revenue (%)"
              yLabel="ROA t+1 (%)"
              xFormat={{ type: "pct", digits: 0 }}
              yFormat={{ type: "num", digits: 0 }}
            />
          </Card>

          <Card className="glow-border lg:col-span-2" title="The answer, in one line" subtitle="Main specification (sector-demeaned ROA t+1)">
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-brand-500/15 via-indigo-500/5 to-transparent p-4">
              <p className="text-[15px] leading-relaxed text-slate-200">
                A 10 pp rise in RPT / Revenue is associated with a{" "}
                <strong className={rptCoef < 0 ? "text-rose-300" : "text-emerald-300"}>
                  {Math.abs(rptCoef * 10).toFixed(2)} pp {rptCoef < 0 ? "lower" : "higher"}
                </strong>{" "}
                next-year ROA (t = {reg.t[1].toFixed(2)}, p = {reg.p[1].toFixed(3)}), holding disclosure quality, size, ownership and board structure constant.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-emerald-500/[0.06] p-3 ring-1 ring-inset ring-emerald-500/15">
                <div className="label">Lowest RPT quintile</div>
                <div className="num mt-1 text-xl font-bold text-emerald-300">{q1.roaNext.toFixed(1)}%</div>
                <div className="num text-xs text-slate-400">ROA t+1 · {q1.auditQualifiedPct.toFixed(0)}% qualified</div>
              </div>
              <div className="rounded-xl bg-rose-500/[0.06] p-3 ring-1 ring-inset ring-rose-500/15">
                <div className="label">Highest RPT quintile</div>
                <div className="num mt-1 text-xl font-bold text-rose-300">{q5.roaNext.toFixed(1)}%</div>
                <div className="num text-xs text-slate-400">ROA t+1 · {q5.auditQualifiedPct.toFixed(0)}% qualified</div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Consistent with the tunnelling view of RPTs (Jian &amp; Wong 2010; Cheung, Rau &amp; Stouraitis 2006) rather than the efficient-transactions view. On the
              simulated panel this demonstrates the method, not a finding.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/lab" className="btn-ghost text-xs">Open Regression Lab</Link>
              <Link href="/ask" className="btn-ghost text-xs">Ask why →</Link>
            </div>
          </Card>
        </div>
      </Reveal>

      {/* ---------- Risk map + red flags ---------- */}
      <Reveal>
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <Card
            className="lg:col-span-3"
            title="Governance risk map"
            subtitle="RPT intensity vs disclosure quality · bubble size = revenue · colour = risk score · click a bubble to open the company"
          >
            <BubbleMap
              bubbles={scored.map((c) => ({
                id: c.symbol,
                x: c.rptToRevenue * 100,
                y: c.disclosureScore,
                size: c.revenue,
                color: c.risk >= 50 ? "#f43f5e" : c.risk >= 30 ? "#f59e0b" : "#10b981",
                label: c.name,
                detail: `RPT/Rev ${pct(c.rptToRevenue)} · DQS ${c.disclosureScore} · risk ${c.risk}`,
                href: `/companies/${encodeURIComponent(c.symbol)}`,
              }))}
              xLabel="RPT / Revenue (%)"
              yLabel="Disclosure score"
              xSplit={medRpt * 100}
              ySplit={medDqs}
              quadrants={["Low RPT · transparent", "High RPT · transparent", "Low RPT · opaque", "High RPT · opaque — watch"]}
            />
          </Card>
          <Card
            className="lg:col-span-2"
            title={
              <span className="flex items-center gap-2">
                <IconAlert className="h-4 w-4 text-rose-400" /> Red-flag watchlist
              </span>
            }
            subtitle="Highest composite governance risk"
          >
            <div className="space-y-2">
              {redFlags.map((c, i) => (
                <Link
                  key={c.symbol}
                  href={`/companies/${encodeURIComponent(c.symbol)}`}
                  className="card-hover flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-500/15 text-xs font-bold text-rose-300">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-100">{c.name}</span>
                      <span className="num shrink-0 text-sm font-bold text-rose-300">{c.risk}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.flags.slice(0, 3).map((f) => (
                        <span key={f} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </Reveal>

      {/* ---------- Quintiles + regression ---------- */}
      <Reveal>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Outcomes by RPT-intensity quintile" subtitle="Q1 = lowest RPT / Revenue, Q5 = highest (20 companies each)">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="label mb-3">ROA t+1 (%)</div>
                <Columns
                  data={q.map((x) => ({ label: x.label, value: x.roaNext, sub: pct(x.rptToRevenue, 0) }))}
                  colors={["#10b981", "#34d399", "#60a5fa", "#f59e0b", "#f43f5e"]}
                  height={180}
                />
              </div>
              <div>
                <div className="label mb-3">Disclosure score</div>
                <Columns data={q.map((x) => ({ label: x.label, value: x.disclosureScore }))} height={180} format={{ type: "num", digits: 0 }} />
              </div>
            </div>
          </Card>

          <Card title="Regression results" subtitle={`OLS, n = ${reg.n}, R² = ${reg.r2.toFixed(3)}, adj. R² = ${reg.adjR2.toFixed(3)}`} action={<Link href="/lab" className="text-xs font-semibold text-brand-300 hover:text-brand-200">Customise →</Link>}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="th">Dependent: ROA t+1 (sector-demeaned)</th>
                    <th className="th text-right">β</th>
                    <th className="th text-right">t</th>
                    <th className="th text-right">p</th>
                  </tr>
                </thead>
                <tbody>
                  {reg.names.map((n, i) => (
                    <tr key={n} className={`border-b border-white/5 ${i === 1 ? "bg-brand-500/[0.08]" : ""}`}>
                      <td className="td text-slate-300">{n}</td>
                      <td className="td num text-right">
                        {reg.coef[i].toFixed(3)}
                        <span className="text-amber-300">{stars(reg.p[i])}</span>
                      </td>
                      <td className="td num text-right text-slate-400">{reg.t[i].toFixed(2)}</td>
                      <td className="td num text-right text-slate-400">{reg.p[i].toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-xl bg-white/[0.03] p-3 text-sm text-slate-300">
              <span className="label mr-2">Governance channel</span>
              Disclosure score on RPT / Revenue: β = {gov.coef[1].toFixed(3)} (t = {gov.t[1].toFixed(2)}); promoter pledge β = {gov.coef[4].toFixed(3)} (t ={" "}
              {gov.t[4].toFixed(2)}).
            </div>
            <p className="mt-2 text-xs text-slate-500">*** p&lt;0.01, ** p&lt;0.05, * p&lt;0.1</p>
          </Card>
        </div>
      </Reveal>

      {/* ---------- Sector heatmap + bars ---------- */}
      <Reveal>
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3" title="Sector heatmap" subtitle="Green = better governance profile, red = worse, relative within each column">
            <Heatmap
              rows={sectors.map((s) => s.sector)}
              cols={["n", "RPT / Rev", "RPT / NW", "DQS", "ROA t+1"]}
              values={sectors.map((s) => [s.n, s.medianRptRev, s.medianRptNw, s.medianDqs, s.meanRoaNext])}
              format={[{ type: "num", digits: 0 }, { type: "ratio", digits: 1 }, { type: "ratio", digits: 1 }, { type: "num", digits: 0 }, { type: "pct", digits: 1 }]}
              higherIsWorse={[false, true, true, false, false]}
            />
          </Card>
          <Card className="lg:col-span-2" title="Median RPT / Revenue by sector" subtitle="Conglomerates, realty and metals transact most with related parties">
            <HBars rows={sectors.map((s) => ({ label: s.sector, value: s.medianRptRev * 100 }))} format={{ type: "pct", digits: 1 }} />
          </Card>
        </div>
      </Reveal>

      {/* ---------- Correlations ---------- */}
      <Reveal>
        <Card className="mt-6" title="Correlation matrix" subtitle="Pearson r across the 100 companies; bold = significant at 5%">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-1">
              <thead>
                <tr>
                  <th />
                  {VARIABLES.map((v) => (
                    <th key={v.key} className="px-1 text-center text-[11px] font-semibold text-slate-400">
                      {v.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VARIABLES.map((row, i) => (
                  <tr key={row.key}>
                    <td className="whitespace-nowrap pr-2 text-xs font-medium text-slate-300">{row.short}</td>
                    {corr[i].map((cell, j) => (
                      <td
                        key={j}
                        className={`num rounded-md py-2 text-center text-xs ${cell.p < 0.05 && i !== j ? "font-bold text-white" : "text-slate-300"}`}
                        style={{ background: corrColor(cell.r) }}
                        title={`${row.label} × ${VARIABLES[j].label}: r=${cell.r.toFixed(3)}, p=${cell.p.toFixed(3)}`}
                      >
                        {cell.r.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Reveal>

      {/* ---------- Pipeline ---------- */}
      <Reveal>
        <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-ink-900 via-ink-900 to-brand-900/20 p-6 sm:p-8">
          <div className="label text-brand-300">How the pipeline works</div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">From a 300-page annual report to a defensible number</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Locate", "Page relevance scoring finds the Ind AS 24 note inside the annual report PDF.", IconFile],
              ["02", "Extract", "Claude returns every transaction — party, relationship, nature, amount — with a verbatim citation.", IconSpark],
              ["03", "Validate", "Citations are string-matched to the source; lines must sum to the note's disclosed total.", IconShield],
              ["04", "Score & compare", "12 LODR / Ind AS 24 checks give a 0–100 score; intensity is ranked against sector peers.", IconArrow],
            ].map(([n, t, d, Icon], i) => {
              const I = Icon as typeof IconFile;
              return (
                <li key={n as string} className="relative rounded-xl border border-white/[0.06] bg-ink-950/40 p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-teal-400/10 text-brand-200 ring-1 ring-inset ring-brand-400/20">
                      <I className="h-5 w-5" />
                    </span>
                    <span className="num text-3xl font-black text-white/[0.06]">{n as string}</span>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-white">{t as string}</div>
                  <p className="mt-1 text-sm text-slate-400">{d as string}</p>
                  {i < 3 && <span className="absolute -right-3 top-1/2 z-10 hidden h-px w-6 bg-gradient-to-r from-brand-400/60 to-transparent lg:block" />}
                </li>
              );
            })}
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="info">Reuses artifacts A1 · A2 · A6 · A7 · A9</Badge>
            <Badge>Source: RPT notes under SEBI LODR Reg 23 &amp; Sch. V</Badge>
            <Badge>Engine: Claude + deterministic rule fallback</Badge>
            <Badge>Mean DQS {mean(COMPANIES.map((c) => c.disclosureScore)).toFixed(1)}</Badge>
          </div>
        </section>
      </Reveal>
    </>
  );
}
