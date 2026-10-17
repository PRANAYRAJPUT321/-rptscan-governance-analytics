/**
 * Disclosure-quality rubric for related party transaction notes.
 *
 * Each check maps to a requirement in SEBI (LODR) Regulations, 2015 or Ind AS 24
 * (which Schedule V Part A of LODR relies on for annual report RPT disclosure).
 * Weights sum to 100, so the disclosure score is the weighted share of checks met.
 */
export interface LodrRequirement {
  id: string;
  title: string;
  source: string;
  weight: number;
  description: string;
  /** Patterns used by the rule engine to detect the disclosure in note text */
  patterns: RegExp[];
}

export const LODR_CHECKS: LodrRequirement[] = [
  {
    id: "L1",
    title: "Related parties identified by name",
    source: "Ind AS 24 ¶18; LODR Sch. V Part A",
    weight: 10,
    description: "Each counterparty is named, not just described by class.",
    patterns: [/\b(limited|ltd\.?|private|pvt\.?|llp|trust|foundation|mr\.|ms\.|mrs\.|shri|smt\.)/i],
  },
  {
    id: "L2",
    title: "Nature of relationship stated",
    source: "Ind AS 24 ¶18",
    weight: 10,
    description: "Subsidiary, associate, JV, KMP, promoter group, relative, etc.",
    patterns: [/subsidiar|associate|joint venture|key managerial|\bkmp\b|promoter|holding company|relative|fellow|entities? (controlled|influenced)/i],
  },
  {
    id: "L3",
    title: "Nature of each transaction",
    source: "Ind AS 24 ¶18; LODR Reg 23(9)",
    weight: 10,
    description: "Type of transaction (sale, purchase, loan, royalty …) given per line.",
    patterns: [/sale|purchase|loan|royalt|rent|services|remuneration|guarantee|dividend|reimburse/i],
  },
  {
    id: "L4",
    title: "Transaction values for the year",
    source: "Ind AS 24 ¶18(a)",
    weight: 12,
    description: "Amounts quantified per transaction for the reporting period.",
    patterns: [/\d[\d,]*\.\d{1,2}/],
  },
  {
    id: "L5",
    title: "Outstanding balances at year end",
    source: "Ind AS 24 ¶18(b)",
    weight: 10,
    description: "Receivables / payables / loans outstanding with related parties.",
    patterns: [/outstanding|balance[s]? (as at|at the end)|closing balance|receivable|payable/i],
  },
  {
    id: "L6",
    title: "Terms & conditions disclosed",
    source: "Ind AS 24 ¶18(b)(i); LODR Reg 23(9) format",
    weight: 8,
    description: "Secured/unsecured, interest rate, tenure, nature of settlement.",
    patterns: [/unsecured|secured|interest rate|rate of interest|tenure|settled in cash|repayable|terms and conditions/i],
  },
  {
    id: "L7",
    title: "Arm's length / ordinary course statement",
    source: "Companies Act s.188; LODR Reg 23",
    weight: 8,
    description: "Assertion that transactions were at arm's length in the ordinary course.",
    patterns: [/arm'?s[\s-]length|ordinary course of business/i],
  },
  {
    id: "L8",
    title: "Audit committee approval",
    source: "LODR Reg 23(2)",
    weight: 8,
    description: "Prior approval / omnibus approval of the audit committee referenced.",
    patterns: [/audit committee|omnibus approval/i],
  },
  {
    id: "L9",
    title: "Shareholder approval for material RPTs",
    source: "LODR Reg 23(4)",
    weight: 8,
    description: "Material RPTs (> ₹1,000 cr or 10% of turnover) approved by shareholders.",
    patterns: [/shareholders'? approval|approval of (the )?(shareholders|members)|material related party|ordinary resolution|postal ballot/i],
  },
  {
    id: "L10",
    title: "Loans / investments: purpose & end use",
    source: "LODR Reg 23(9); SEBI circular Nov-2021 format",
    weight: 6,
    description: "For ICDs, loans, advances or investments, purpose and end-use stated.",
    patterns: [/purpose|end[\s-]use|utili[sz]ed for|working capital|general corporate/i],
  },
  {
    id: "L11",
    title: "KMP compensation disclosed",
    source: "Ind AS 24 ¶17",
    weight: 5,
    description: "Short-term, post-employment and share-based benefits to KMP.",
    patterns: [/short[\s-]term (employee )?benefits|post[\s-]employment|share[\s-]based|sitting fees|commission to (directors|non-executive)|managerial remuneration/i],
  },
  {
    id: "L12",
    title: "RPT policy weblink / comparatives",
    source: "LODR Reg 46(2)(g); Ind AS 1 comparatives",
    weight: 5,
    description: "Policy on materiality & dealing with RPTs referenced, prior-year figures shown.",
    patterns: [/policy on (materiality|related party)|website|weblink|previous year|\bpy\b|fy\s?20\d\d-?\d{0,2}.*fy\s?20\d\d/i],
  },
];

export const LODR_TOTAL_WEIGHT = LODR_CHECKS.reduce((s, c) => s + c.weight, 0);

export function scoreFromChecks(met: boolean[]): number {
  const got = LODR_CHECKS.reduce((s, c, i) => s + (met[i] ? c.weight : 0), 0);
  return Math.round((got / LODR_TOTAL_WEIGHT) * 100);
}

/** Reg 23(1) materiality: lower of ₹1,000 crore or 10% of annual consolidated turnover. */
export function materialityThreshold(revenueCrore: number | null): number {
  if (!revenueCrore || revenueCrore <= 0) return 1000;
  return Math.min(1000, revenueCrore * 0.1);
}

export function scoreBand(score: number): { label: string; tone: "good" | "mid" | "bad" } {
  if (score >= 80) return { label: "Strong", tone: "good" };
  if (score >= 60) return { label: "Adequate", tone: "mid" };
  return { label: "Weak", tone: "bad" };
}
