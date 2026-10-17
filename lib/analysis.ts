import { COMPANIES, SECTORS } from "./companies";
import { corrPValue, mean, median, ols, pearson, percentileRank, quantile } from "./stats";
import type { Company } from "./types";

export const VARIABLES: { key: keyof Company; label: string; short: string }[] = [
  { key: "rptToRevenue", label: "RPT / Revenue", short: "RPT/Rev" },
  { key: "rptToNetWorth", label: "RPT / Net worth", short: "RPT/NW" },
  { key: "disclosureScore", label: "Disclosure quality (0-100)", short: "DQS" },
  { key: "boardIndependence", label: "Board independence %", short: "Indep" },
  { key: "promoterPledge", label: "Promoter pledge %", short: "Pledge" },
  { key: "roaNext", label: "ROA t+1 %", short: "ROA t+1" },
  { key: "tsrNext", label: "Total return t+1 %", short: "TSR t+1" },
];

const num = (c: Company, k: keyof Company) => Number(c[k]);

export function correlationMatrix(companies = COMPANIES) {
  return VARIABLES.map((a) =>
    VARIABLES.map((b) => {
      const r = pearson(
        companies.map((c) => num(c, a.key)),
        companies.map((c) => num(c, b.key)),
      );
      return { r, p: a.key === b.key ? 0 : corrPValue(r, companies.length) };
    }),
  );
}

/** Mean outcomes by RPT-intensity quintile (Q1 = lowest RPT/Revenue). */
export function quintiles(companies = COMPANIES) {
  const sorted = [...companies].sort((a, b) => a.rptToRevenue - b.rptToRevenue);
  const size = Math.ceil(sorted.length / 5);
  return Array.from({ length: 5 }, (_, i) => {
    const g = sorted.slice(i * size, (i + 1) * size);
    return {
      label: `Q${i + 1}`,
      n: g.length,
      rptToRevenue: mean(g.map((c) => c.rptToRevenue)),
      roaNext: mean(g.map((c) => c.roaNext)),
      tsrNext: mean(g.map((c) => c.tsrNext)),
      disclosureScore: mean(g.map((c) => c.disclosureScore)),
      auditQualifiedPct: (g.filter((c) => c.auditQualified).length / g.length) * 100,
    };
  });
}

/**
 * Main specification: ROA(t+1) on RPT intensity, disclosure quality and
 * governance controls, with sector-demeaned ROA to absorb sector effects.
 */
export function mainRegression(companies = COMPANIES) {
  const sectorRoa = new Map(SECTORS.map((s) => [s, mean(companies.filter((c) => c.sector === s).map((c) => c.roaNext))]));
  const y = companies.map((c) => c.roaNext - (sectorRoa.get(c.sector) ?? 0));
  const X = companies.map((c) => [
    c.rptToRevenue * 100,
    c.disclosureScore,
    Math.log(c.revenue),
    c.promoterHolding,
    c.boardIndependence,
    c.promoterPledge,
  ]);
  return ols(y, X, ["RPT/Revenue (pp)", "Disclosure score", "ln(Revenue)", "Promoter holding %", "Board independence %", "Promoter pledge %"]);
}

export function governanceRegression(companies = COMPANIES) {
  const y = companies.map((c) => c.disclosureScore);
  const X = companies.map((c) => [c.rptToRevenue * 100, c.promoterHolding, c.boardIndependence, c.promoterPledge, Math.log(c.revenue)]);
  return ols(y, X, ["RPT/Revenue (pp)", "Promoter holding %", "Board independence %", "Promoter pledge %", "ln(Revenue)"]);
}

export function sectorSummary(companies = COMPANIES) {
  return SECTORS.map((s) => {
    const g = companies.filter((c) => c.sector === s);
    return {
      sector: s,
      n: g.length,
      medianRptRev: median(g.map((c) => c.rptToRevenue)),
      medianRptNw: median(g.map((c) => c.rptToNetWorth)),
      medianDqs: median(g.map((c) => c.disclosureScore)),
      meanRoaNext: mean(g.map((c) => c.roaNext)),
    };
  }).sort((a, b) => b.medianRptRev - a.medianRptRev);
}

export interface Positioning {
  metric: string;
  value: number;
  sectorMedian: number;
  sectorP25: number;
  sectorP75: number;
  percentile: number;
  higherIsWorse: boolean;
  format: "pct" | "score" | "x";
}

export function positionInSector(
  sector: string,
  v: { rptToRevenue: number | null; rptToNetWorth: number | null; disclosureScore: number },
  companies = COMPANIES,
): Positioning[] {
  const peers = companies.filter((c) => c.sector === sector);
  const pool = peers.length >= 3 ? peers : companies;
  const rows: Positioning[] = [];
  const add = (metric: string, value: number | null, values: number[], higherIsWorse: boolean, format: Positioning["format"]) => {
    if (value === null || !Number.isFinite(value)) return;
    rows.push({
      metric,
      value,
      sectorMedian: median(values),
      sectorP25: quantile(values, 0.25),
      sectorP75: quantile(values, 0.75),
      percentile: percentileRank(values, value),
      higherIsWorse,
      format,
    });
  };
  add("RPT / Revenue", v.rptToRevenue, pool.map((c) => c.rptToRevenue), true, "pct");
  add("RPT / Net worth", v.rptToNetWorth, pool.map((c) => c.rptToNetWorth), true, "pct");
  add("Disclosure quality", v.disclosureScore, pool.map((c) => c.disclosureScore), false, "score");
  return rows;
}

/** Composite governance risk flag, 0 (low) – 100 (high). */
export function riskScore(c: Pick<Company, "rptToRevenue" | "disclosureScore" | "promoterPledge" | "auditQualified" | "boardIndependence">) {
  const s =
    Math.min(c.rptToRevenue / 0.4, 1) * 35 +
    ((100 - c.disclosureScore) / 100) * 30 +
    Math.min(c.promoterPledge / 40, 1) * 15 +
    (c.auditQualified ? 10 : 0) +
    Math.max(0, (50 - c.boardIndependence) / 17) * 10;
  return Math.round(Math.min(100, s));
}
