import Link from "next/link";
import { notFound } from "next/navigation";
import { HBars, PercentileStrip, Scatter } from "@/components/charts";
import { Badge, Card, DQS_COLOR, PageHeader, SimulatedNotice, Stat } from "@/components/ui";
import { positionInSector, riskScore } from "@/lib/analysis";
import { COMPANIES, getCompany, sectorPeers } from "@/lib/companies";
import { crore, ordinal, pct } from "@/lib/format";
import { LODR_CHECKS, materialityThreshold, scoreBand } from "@/lib/lodr";

export function generateStaticParams() {
  return COMPANIES.map((c) => ({ symbol: c.symbol }));
}

export default async function CompanyPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const c = getCompany(decodeURIComponent(symbol));
  if (!c) notFound();
  const peers = sectorPeers(c.sector);
  const positions = positionInSector(c.sector, c);
  const band = scoreBand(c.disclosureScore);
  const risk = riskScore(c);
  const mix = Object.entries(c.rptMix).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const metricValues = (m: string) => peers.map((p) => (m === "RPT / Revenue" ? p.rptToRevenue : m === "RPT / Net worth" ? p.rptToNetWorth : p.disclosureScore));

  return (
    <>
      <Link href="/companies" className="text-sm text-slate-400 hover:text-slate-200">
        ← All companies
      </Link>
      <PageHeader eyebrow={`NSE: ${c.symbol} · ${c.sector}`} title={c.name}>
        Related party exposure, disclosure quality against LODR and governance outcomes, positioned against {peers.length - 1} sector peers.
      </PageHeader>
      <SimulatedNotice />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Total RPTs" value={crore(c.rptTotal)} hint={`Revenue ${crore(c.revenue)}`} />
        <Stat label="RPT / Revenue" value={pct(c.rptToRevenue)} hint={`${ordinal(positions[0].percentile)} pct. in sector`} />
        <Stat label="RPT / Net worth" value={pct(c.rptToNetWorth)} hint={`Net worth ${crore(c.netWorth)}`} />
        <Stat label="Disclosure score" value={c.disclosureScore} hint={band.label} tone={band.tone === "good" ? "good" : band.tone === "mid" ? "warn" : "bad"} />
        <Stat label="Governance risk" value={`${risk}/100`} hint="RPT, disclosure, pledge, audit, board" tone={risk >= 50 ? "bad" : risk >= 30 ? "warn" : "good"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2" title="Position in sector" subtitle="Band = P25–P75 of sector peers">
          <div className="space-y-8 pb-2">
            {positions.map((p) => (
              <div key={p.metric}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-200">{p.metric}</span>
                  <span className="num text-sm font-semibold text-white">{p.format === "pct" ? pct(p.value) : p.value}</span>
                </div>
                <PercentileStrip
                  min={Math.min(...metricValues(p.metric))}
                  max={Math.max(...metricValues(p.metric))}
                  p25={p.sectorP25}
                  p75={p.sectorP75}
                  median={p.sectorMedian}
                  value={p.value}
                  higherIsWorse={p.higherIsWorse}
                  format={p.format === "pct" ? { type: "ratio", digits: 0 } : { type: "num", digits: 0 }}
                />
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-3" title={`${c.sector}: RPT intensity vs disclosure quality`} subtitle="Highlighted dot is this company">
          <Scatter
            points={peers.map((p) => ({
              id: p.symbol,
              x: p.rptToRevenue * 100,
              y: p.disclosureScore,
              color: p.symbol === c.symbol ? "#f59e0b" : DQS_COLOR(p.disclosureScore),
              label: p.name,
              highlight: p.symbol === c.symbol,
              detail: `ROA t+1 ${p.roaNext}%`,
            }))}
            xLabel="RPT / Revenue (%)"
            yLabel="Disclosure score"
            xFormat={{ type: "pct", digits: 0 }}
            yFormat={{ type: "num", digits: 0 }}
            trend={peers.length > 3}
            height={280}
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="RPT / Revenue league table">
          <HBars rows={peers.map((p) => ({ label: p.name, value: p.rptToRevenue * 100 })).sort((a, b) => b.value - a.value)} highlight={c.name} format={{ type: "pct", digits: 1 }} />
        </Card>
        <Card title="Mix of related party flows" subtitle={`Reg 23 materiality threshold ₹${Math.round(materialityThreshold(c.revenue)).toLocaleString("en-IN")} cr`}>
          <HBars rows={mix.map(([k, v]) => ({ label: k[0].toUpperCase() + k.slice(1), value: v ?? 0 }))} format={{ type: "inr" }} color="#14b8a6" />
        </Card>
        <Card title="Governance & performance">
          <dl className="space-y-2.5 text-sm">
            {[
              ["Board independence", `${c.boardIndependence}%`],
              ["Promoter holding", `${c.promoterHolding}%`],
              ["Promoter shares pledged", `${c.promoterPledge}%`],
              ["Audit committee meetings", c.acMeetings],
              ["Auditor's opinion", c.auditQualified ? "Qualified / emphasis" : "Unmodified"],
              ["ROA t → t+1", `${c.roa}% → ${c.roaNext}%`],
              ["Total return t+1", `${c.tsrNext}%`],
              ["Tie-out", c.tieOutPassed ? "Passed" : "Difference > 0.5%"],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-slate-400">{k}</dt>
                <dd className="num font-medium text-slate-100">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="mt-6" title="LODR disclosure checklist" subtitle={`${c.lodr.filter(Boolean).length} of ${LODR_CHECKS.length} requirements evidenced`}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LODR_CHECKS.map((req, i) => (
            <div key={req.id} className="flex items-start gap-2.5 rounded-lg bg-white/[0.02] p-2.5">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${c.lodr[i] ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                {c.lodr[i] ? "✓" : "✗"}
              </span>
              <div>
                <div className="text-sm text-slate-200">{req.title}</div>
                <div className="text-[11px] text-slate-500">{req.source}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Badge tone="info">Re-run on the real note in the AI Extractor</Badge>
          <Link href="/extract" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
            Open extractor →
          </Link>
        </div>
      </Card>
    </>
  );
}
