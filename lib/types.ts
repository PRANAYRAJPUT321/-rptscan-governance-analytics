export type RptCategory =
  | "sale"
  | "purchase"
  | "services"
  | "loan"
  | "investment"
  | "guarantee"
  | "royalty"
  | "rent"
  | "remuneration"
  | "dividend"
  | "interest"
  | "reimbursement"
  | "other";

export interface Citation {
  /** Note reference in the annual report, e.g. "Note 42" */
  note: string;
  /** 1-based line number inside the extracted note text */
  line: number;
  /** Exact snippet from the source the figure was read from */
  quote: string;
  /** Source page in the uploaded PDF, when known */
  page?: number;
  /** True when the quote was found verbatim in the source text */
  verified: boolean;
}

export interface Transaction {
  id: string;
  party: string;
  relationship: string;
  nature: string;
  category: RptCategory;
  amount: number;
  previousAmount: number | null;
  citation: Citation;
}

export interface LodrCheck {
  id: string;
  met: boolean;
  evidence: string | null;
}

export interface TieOut {
  extractedTotal: number;
  disclosedAggregate: number | null;
  difference: number | null;
  differencePct: number | null;
  status: "tied" | "mismatch" | "no-aggregate";
  aggregateCitation: Citation | null;
}

export interface ExtractionResult {
  mode: "ai" | "rules";
  model?: string;
  company: string;
  fiscalYear: string;
  unit: string;
  note: string;
  revenue: number | null;
  netWorth: number | null;
  transactions: Transaction[];
  tieOut: TieOut;
  lodr: LodrCheck[];
  disclosureScore: number;
  rptToRevenue: number | null;
  rptToNetWorth: number | null;
  materialTransactions: string[];
  warnings: string[];
}

export interface Company {
  symbol: string;
  name: string;
  sector: string;
  revenue: number; // ₹ crore
  netWorth: number; // ₹ crore
  marketCap: number; // ₹ crore
  rptTotal: number; // ₹ crore
  rptMix: Partial<Record<RptCategory, number>>;
  rptToRevenue: number; // ratio
  rptToNetWorth: number; // ratio
  lodr: boolean[]; // aligned with LODR_CHECKS
  disclosureScore: number; // 0-100
  boardIndependence: number; // %
  promoterHolding: number; // %
  promoterPledge: number; // % of promoter holding
  auditQualified: boolean;
  acMeetings: number;
  roa: number; // % year t
  roaNext: number; // % year t+1
  tsrNext: number; // % year t+1
  tieOutPassed: boolean;
}
