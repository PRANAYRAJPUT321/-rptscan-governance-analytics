import Link from "next/link";
import { Columns, HBars, Scatter } from "@/components/charts";
import { Badge, Card, DQS_COLOR, PageHeader, SimulatedNotice, Stat } from "@/components/ui";
import { VARIABLES, correlationMatrix, governanceRegression, mainRegression, quintiles, sectorSummary } from "@/lib/analysis";
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

export default function Home() {
  const reg = mainRegression();
  const gov = governanceRegression();
  const q = quintiles();
  const corr = correlationMatrix();
  const sectors = sectorSummary();
  const rptCoef = reg.coef[1];
  const rptP = reg.p[1];
  const q1 = q[0];
  const q5 = q[4];
  const tied = COMPANIES.filter((c) => c.tieOutPassed).length;

  return (
    <>
      <PageHeader eyebrow="Research question" title={<>Does related party transaction intensity relate to governance outcomes and subsequent performance?</>}>
        RPTScan extracts every related party transaction from the SEBI LODR / Ind AS 24 note of 100 NSE companies, scales it to revenue and net worth, scores
        disclosure quality against the LODR requirements, and tests whether RPT intensity predicts weaker governance and next-year performance.
      </PageHeader>

      <SimulatedNotice />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Companies" value="100" hint={`NSE large & mid caps, ${SECTORS.length} sectors`} />
        <Stat label="Median RPT / Revenue" value={pct(median(COMPANIES.map((c) => c.rptToRevenue)))} hint={`RPT / Net worth ${pct(median(COMPANIES.map((c) => c.rptToNetWorth)))}`} />
        <Stat label="Mean disclosure score" value={mean(COMPANIES.map((c) => c.disclosureScore)).toFixed(1)} hint="12 LODR / Ind AS 24 checks, weighted to 100" tone="warn" />
        <Stat label="Tie-out pass rate" value={`${tied}%`} hint="Extracted lines = disclosed aggregate" tone={tied >= 90 ? "good" : "warn"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
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

        <Card className="lg:col-span-2" title="Answer, in one line" subtitle="Main specification (sector-demeaned ROA t+1)">
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-brand-500/10 to-transparent p-4">
            <p className="text-[15px] leading-relaxed text-slate-200">
              A 10 pp rise in RPT / Revenue is associated with a{" "}
              <strong className={rptCoef < 0 ? "text-rose-300" : "text-emerald-300"}>
                {(rptCoef * 10).toFixed(2)} pp {rptCoef < 0 ? "lower" : "higher"}
              </strong>{" "}
              next-year ROA (t = {reg.t[1].toFixed(2)}, p = {rptP.toFixed(3)}), holding disclosure quality, size, ownership and board structure constant.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/[0.03] p-3">
              <div className="label">Lowest RPT quintile</div>
              <div className="num mt-1 text-lg font-semibold text-emerald-300">{q1.roaNext.toFixed(1)}% ROA</div>
              <div className="num text-xs text-slate-400">{q1.auditQualifiedPct.toFixed(0)}% audit-qualified</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3">
              <div className="label">Highest RPT quintile</div>
              <div className="num mt-1 text-lg font-semibold text-rose-300">{q5.roaNext.toFixed(1)}% ROA</div>
              <div className="num text-xs text-slate-400">{q5.auditQualifiedPct.toFixed(0)}% audit-qualified</div>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Consistent with the tunnelling view of RPTs (Jian & Wong 2010; Cheung, Rau & Stouraitis 2006) rather than the efficient-transactions view. On the
            simulated panel this is a demonstration of the method, not a finding.
          </p>
          <Link href="/extract" className="btn-primary mt-5 w-full">
            Run the AI extractor on an annual report →
          </Link>
        </Card>
      </div>

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

        <Card title="Regression results" subtitle={`OLS, n = ${reg.n}, R² = ${reg.r2.toFixed(3)}, adj. R² = ${reg.adjR2.toFixed(3)}`}>
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
                  <tr key={n} className={`border-b border-white/5 ${i === 1 ? "bg-brand-500/[0.07]" : ""}`}>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Correlation matrix" subtitle="Pearson r across the 100 companies; bold = significant at 5%">
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

        <Card className="lg:col-span-2" title="Median RPT / Revenue by sector" subtitle="Conglomerates, realty and metals transact most with related parties">
          <HBars rows={sectors.map((s) => ({ label: s.sector, value: s.medianRptRev * 100 }))} format={{ type: "pct", digits: 1 }} />
        </Card>
      </div>

      <Card className="mt-6" title="How the pipeline works">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["1 · Locate", "The AI finds the related party note inside a 300-page annual report PDF and isolates its pages."],
            ["2 · Extract", "Claude reads the note line-by-line and returns every transaction with party, relationship, nature, amount and a verbatim citation."],
            ["3 · Validate", "Each citation is matched back to the source text; extracted lines must sum to the note's own disclosed total."],
            ["4 · Score & compare", "Twelve LODR / Ind AS 24 checks give a 0–100 disclosure score; intensity is ranked against sector peers."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-sm font-semibold text-white">{t}</div>
              <p className="mt-1 text-sm text-slate-400">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="info">Reuses artifacts A1 · A2 · A6 · A7 · A9</Badge>
          <Badge>Source: RPT notes under SEBI LODR Reg 23 & Sch. V</Badge>
          <Badge>Engine: Claude + deterministic rule fallback</Badge>
        </div>
      </Card>
    </>
  );
}
