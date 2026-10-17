import { governanceRegression, mainRegression, quintiles, riskScore, sectorSummary } from "./analysis";
import { COMPANIES } from "./companies";
import { LODR_CHECKS } from "./lodr";

const p1 = (x: number) => (x * 100).toFixed(1);

/** Compact, model-readable snapshot of the whole study for grounding chat answers. */
export function studyContext(): string {
  const reg = mainRegression();
  const gov = governanceRegression();
  const rows = COMPANIES.map(
    (c) =>
      `${c.symbol},${c.name},${c.sector},${c.revenue},${c.netWorth},${p1(c.rptToRevenue)},${p1(c.rptToNetWorth)},${c.disclosureScore},${c.boardIndependence},${c.promoterHolding},${c.promoterPledge},${c.auditQualified ? 1 : 0},${c.roaNext},${c.tsrNext},${riskScore(c)}`,
  ).join("\n");
  return `STUDY: RPTScan — Related Party Disclosure Study. Research question: does related party transaction (RPT) intensity relate to governance outcomes and subsequent performance? 100 NSE companies. NOTE: the company figures are a SIMULATED panel used to demonstrate the method (names/sectors are real); always say so when citing company-level numbers.

ENGINE: RPT_gross = sum of |current-year RPT flows| in ₹ crore; RPT/Revenue = RPT_gross / revenue from operations; RPT/NW = RPT_gross / total equity; DQS = weighted share (0-100) of 12 LODR / Ind AS 24 checks: ${LODR_CHECKS.map((c) => `${c.id} ${c.title} (${c.weight}pts, ${c.source})`).join("; ")}. Materiality per LODR Reg 23(1): lower of ₹1,000 cr or 10% of turnover; material RPTs need shareholder approval under Reg 23(4). VALIDATION: every transaction cites note+line+quote verified against the source; extracted lines must tie to the note's disclosed total within 0.5%.

MAIN REGRESSION (OLS, dependent = sector-demeaned ROA t+1, n=${reg.n}, R2=${reg.r2.toFixed(3)}): ${reg.names.map((n, i) => `${n}: b=${reg.coef[i].toFixed(4)}, t=${reg.t[i].toFixed(2)}, p=${reg.p[i].toFixed(3)}`).join("; ")}.
GOVERNANCE REGRESSION (dependent = DQS): ${gov.names.map((n, i) => `${n}: b=${gov.coef[i].toFixed(3)}, t=${gov.t[i].toFixed(2)}`).join("; ")}.
QUINTILES by RPT/Revenue: ${quintiles().map((q) => `${q.label}: RPT/Rev ${p1(q.rptToRevenue)}%, ROA t+1 ${q.roaNext.toFixed(1)}%, TSR t+1 ${q.tsrNext.toFixed(1)}%, DQS ${q.disclosureScore.toFixed(0)}, audit-qualified ${q.auditQualifiedPct.toFixed(0)}%`).join("; ")}.
SECTORS (median RPT/Rev %, median RPT/NW %, median DQS, mean ROA t+1): ${sectorSummary().map((s) => `${s.sector} n=${s.n}: ${p1(s.medianRptRev)}, ${p1(s.medianRptNw)}, ${s.medianDqs}, ${s.meanRoaNext.toFixed(1)}`).join("; ")}.

COMPANIES CSV (symbol,name,sector,revenue_cr,net_worth_cr,rpt_rev_pct,rpt_nw_pct,dqs,board_indep_pct,promoter_pct,pledge_pct,audit_qualified,roa_t1_pct,tsr_t1_pct,risk_0_100):
${rows}`;
}

/** Deterministic answers for common questions when no AI is available. */
export function ruleAnswer(question: string): string {
  const q = question.toLowerCase();
  const reg = mainRegression();
  // dir -1 = highest first, 1 = lowest first
  const by = (k: (c: (typeof COMPANIES)[number]) => number, dir = -1) => [...COMPANIES].sort((a, b) => (k(a) - k(b)) * dir).slice(0, 5);
  const words = new Set(q.split(/[^a-z0-9&-]+/));
  const sym = COMPANIES.find((c) => words.has(c.symbol.toLowerCase()) || q.includes(c.name.toLowerCase()));
  if (sym) {
    return `**${sym.name}** (${sym.sector}, simulated figures): RPT / Revenue ${p1(sym.rptToRevenue)}%, RPT / Net worth ${p1(sym.rptToNetWorth)}%, disclosure score ${sym.disclosureScore}/100, governance risk ${riskScore(sym)}/100, ROA t+1 ${sym.roaNext}%.`;
  }
  if (/sector/.test(q)) {
    const s = sectorSummary();
    return `Highest median RPT intensity by sector:\n${s.slice(0, 5).map((x) => `- **${x.sector}**: ${p1(x.medianRptRev)}% of revenue (DQS ${x.medianDqs})`).join("\n")}\n\nLowest: ${s.slice(-3).map((x) => `${x.sector} (${p1(x.medianRptRev)}%)`).join(", ")}.`;
  }
  if (/disclos|dqs|lodr|score/.test(q)) {
    const w = by((c) => c.disclosureScore, 1);
    return `Weakest disclosure scores (simulated panel):\n${w.map((c) => `- **${c.name}**: ${c.disclosureScore}/100`).join("\n")}\n\nThe score is the weighted share of 12 LODR / Ind AS 24 requirements evidenced in the RPT note.`;
  }
  if (/risk|red flag|worst|watch/.test(q)) {
    const w = by((c) => riskScore(c));
    return `Highest governance risk:\n${w.map((c) => `- **${c.name}**: risk ${riskScore(c)}, RPT/Rev ${p1(c.rptToRevenue)}%, DQS ${c.disclosureScore}`).join("\n")}`;
  }
  if (/highest|most|top|intensity/.test(q)) {
    const w = by((c) => c.rptToRevenue);
    return `Highest RPT / Revenue:\n${w.map((c) => `- **${c.name}**: ${p1(c.rptToRevenue)}%`).join("\n")}`;
  }
  return `Main result: a 10 pp rise in RPT / Revenue is associated with a ${(reg.coef[1] * 10).toFixed(2)} pp change in next-year ROA (t = ${reg.t[1].toFixed(2)}, p = ${reg.p[1].toFixed(3)}), controlling for disclosure quality, size, ownership and board independence.\n\nTry asking about a company (e.g. "ADANIENT"), sectors, disclosure scores, or risk.`;
}
