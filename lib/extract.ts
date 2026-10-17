import { LODR_CHECKS, materialityThreshold, scoreFromChecks } from "./lodr";
import type { Citation, ExtractionResult, LodrCheck, RptCategory, TieOut, Transaction } from "./types";

/** Keyword map used to classify a transaction line. Order matters: first match wins. */
const CATEGORY_RULES: [RptCategory, RegExp][] = [
  ["guarantee", /guarantee|security given|collateral|letter of comfort/i],
  ["loan", /loan|inter[\s-]corporate deposit|\bicd\b|advance given|advances? (to|repaid)|borrowing/i],
  ["investment", /investment|subscription to (equity|shares)|equity infusion|purchase of shares/i],
  ["royalty", /royalt|brand fee|technical know[\s-]how|trademark/i],
  ["remuneration", /remuneration|salary|sitting fee|commission to director|managerial|employee benefit/i],
  ["dividend", /dividend/i],
  ["interest", /interest (income|expense|paid|received)|interest on/i],
  ["rent", /rent|lease/i],
  ["reimbursement", /reimburse|recovery of expenses/i],
  ["sale", /sale of|sales? to|revenue from|income from sale/i],
  ["purchase", /purchase of|purchases? from|procurement/i],
  ["services", /services|consultancy|management fee|job work|freight|commission/i],
];

const ENTITY = /\b(limited|ltd\.?|private|pvt\.?|llp|inc\.?|plc|gmbh|trust|foundation|corporation|co\.)(?=\W|$)|\b(mr|ms|mrs|dr|shri|smt)\.?\s+[a-z]/i;
const RELATION =
  /(wholly[\s-]owned subsidiary|step[\s-]down subsidiary|subsidiary|associate|joint venture|key managerial personnel|\bkmp\b|promoter group|promoter|holding company|ultimate holding|fellow subsidiary|relative of kmp|relative|enterprise (controlled|influenced)[^|]*|post[\s-]employment benefit plan)/i;
const NUMBER_CELL = /^\(?-?₹?\s*[\d,]+(\.\d+)?\)?$/;

const UNIT_RULES: [RegExp, string, number][] = [
  [/(₹|rs\.?|inr)?\s*(in\s+)?(crores?|cr\.?)(\b|$)/i, "₹ crore", 1],
  [/(₹|rs\.?|inr)?\s*(in\s+)?(lakhs?|lacs?)(\b|$)/i, "₹ lakh", 0.01],
  [/(₹|rs\.?|inr)?\s*(in\s+)?(millions?|mn)(\b|$)/i, "₹ million", 0.1],
];

export function parseAmount(cell: string): number | null {
  const c = cell.replace(/₹|rs\.?|inr/gi, "").trim();
  if (!c || c === "-" || c === "—" || c === "–" || /^nil$/i.test(c)) return null;
  if (!NUMBER_CELL.test(c)) return null;
  const neg = c.startsWith("(") && c.endsWith(")");
  const n = Number(c.replace(/[(),\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

export function splitCells(line: string): string[] {
  return line
    .split(/\s*\|\s*|\t+|\s{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function classify(text: string): RptCategory | null {
  for (const [cat, re] of CATEGORY_RULES) if (re.test(text)) return cat;
  return null;
}

function isYearLike(n: number, cell: string) {
  return !cell.includes(",") && !cell.includes(".") && n >= 1990 && n <= 2100;
}

export function detectUnit(text: string): { unit: string; toCrore: number } {
  const head = text.split("\n").slice(0, 40).join("\n");
  const hit = head.match(/\((?:all amounts? )?(?:₹|rs\.?|inr)[^)]*\)|(?:₹|rs\.?|inr)\s+in\s+\w+|amounts? in [^\n]{0,30}/i);
  const scope = hit ? hit[0] : head;
  for (const [re, unit, factor] of UNIT_RULES) if (re.test(scope)) return { unit, toCrore: factor };
  return { unit: "₹ crore", toCrore: 1 };
}

function detectNote(lines: string[]): string {
  for (const l of lines.slice(0, 30)) {
    const m = l.match(/note\s*(?:no\.?\s*)?(\d+[a-z]?(?:\.\d+)?)/i);
    if (m) return `Note ${m[1]}`;
  }
  return "RPT note";
}

function findFigure(lines: string[], re: RegExp): number | null {
  for (const l of lines) {
    if (!re.test(l)) continue;
    const nums = splitCells(l).map(parseAmount).filter((n): n is number => n !== null);
    if (nums.length) return nums[0];
  }
  return null;
}

export function normalize(s: string) {
  return s.toLowerCase().replace(/[\s|]+/g, " ").trim();
}

/** Check that a quote appears in the source (whitespace/pipe-insensitive). */
export function verifyQuote(source: string, quote: string): boolean {
  if (!quote) return false;
  return normalize(source).includes(normalize(quote));
}

export function computeTieOut(transactions: Transaction[], aggregate: number | null, aggCitation: Citation | null): TieOut {
  const extractedTotal = round2(transactions.reduce((s, t) => s + t.amount, 0));
  if (aggregate === null) {
    return { extractedTotal, disclosedAggregate: null, difference: null, differencePct: null, status: "no-aggregate", aggregateCitation: null };
  }
  const difference = round2(extractedTotal - aggregate);
  const differencePct = aggregate !== 0 ? (difference / aggregate) * 100 : null;
  const tolerance = Math.max(Math.abs(aggregate) * 0.005, 0.05);
  return {
    extractedTotal,
    disclosedAggregate: aggregate,
    difference,
    differencePct,
    status: Math.abs(difference) <= tolerance ? "tied" : "mismatch",
    aggregateCitation: aggCitation,
  };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface ExtractOptions {
  company?: string;
  revenue?: number | null;
  netWorth?: number | null;
  pageOfLine?: (line: number) => number | undefined;
}

/**
 * Deterministic rule engine. Reads an RPT note line by line, keeps a running
 * "current party", classifies each line that carries an amount, and cites the
 * exact line every figure came from. A line starting with "Total" is treated as
 * the disclosed aggregate for the tie-out.
 */
export function extractWithRules(text: string, opts: ExtractOptions = {}): ExtractionResult {
  const lines = text.replace(/\r/g, "").split("\n");
  const note = detectNote(lines);
  const { unit, toCrore } = detectUnit(text);
  const relationships = new Map<string, string>();
  const transactions: Transaction[] = [];
  const warnings: string[] = [];
  let currentParty = "";
  let currentRelation = "";
  let inBalances = false;
  let aggregate: number | null = null;
  let aggCitation: Citation | null = null;

  const cite = (i: number, quote: string): Citation => ({
    note,
    line: i + 1,
    quote: quote.trim(),
    page: opts.pageOfLine?.(i + 1),
    verified: true,
  });

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const cells = splitCells(line);
    const textCells = cells.filter((c) => parseAmount(c) === null);
    const nums = cells
      .map((c) => ({ c, n: parseAmount(c) }))
      .filter((x): x is { c: string; n: number } => x.n !== null && !isYearLike(x.n, x.c));
    const label = textCells.join(" ");

    if (/outstanding|balances? (as at|at the end|due)|closing balance/i.test(label) && nums.length === 0) {
      inBalances = true;
      return;
    }
    if (/transactions? (during|with|for) the (year|period)|details of transactions/i.test(label) && nums.length === 0) {
      inBalances = false;
      return;
    }

    if (/^total\b/i.test(label) || /\btotal related party transactions\b/i.test(label)) {
      if (!inBalances && nums.length) {
        // The last "total" before the balances section wins: it is the overall aggregate.
        aggregate = nums[0].n;
        aggCitation = cite(i, line);
      }
      return;
    }

    if (nums.length === 0) {
      // Header / party line: remember counterparty and its relationship.
      const rel = label.match(RELATION);
      const entityCell = textCells.find((c) => ENTITY.test(c) && !RELATION.test(c)) ?? (ENTITY.test(label) ? textCells[0] : undefined);
      if (entityCell) {
        currentParty = entityCell.replace(/^[\d.)\s-]+/, "").replace(/[:–-]\s*$/, "").trim();
        currentRelation = rel ? capitalize(rel[1]) : relationships.get(currentParty.toLowerCase()) ?? currentRelation;
        if (rel) relationships.set(currentParty.toLowerCase(), currentRelation);
      } else if (rel && textCells.length <= 2) {
        currentRelation = capitalize(rel[1]);
      }
      return;
    }

    if (inBalances) return;
    const category = classify(label);
    if (!category) return;

    const entityCell = textCells.find((c) => ENTITY.test(c) && !RELATION.test(c) && !classify(c));
    const relCell = label.match(RELATION);
    const party = (entityCell ?? currentParty) || "Unspecified related party";
    const relationship = relCell ? capitalize(relCell[1]) : relationships.get(party.toLowerCase()) ?? (currentRelation || "Not stated");
    const natureCell = textCells.find((c) => classify(c) === category) ?? label;

    transactions.push({
      id: `T${transactions.length + 1}`,
      party,
      relationship,
      nature: natureCell.replace(/^[\d.)\s-]+/, ""),
      category,
      amount: nums[0].n,
      previousAmount: nums[1]?.n ?? null,
      citation: cite(i, line),
    });
  });

  if (transactions.length === 0) warnings.push("No transaction lines were recognised. Check that the pasted text is the RPT note.");

  const revenue = opts.revenue ?? scaleOrNull(findFigure(lines, /revenue from operations|total income|turnover/i), toCrore);
  const netWorth = opts.netWorth ?? scaleOrNull(findFigure(lines, /net worth|total equity/i), toCrore);
  const lodr = scoreLodrRules(text, transactions);

  return finalize({
    mode: "rules",
    company: opts.company || detectCompany(lines) || "Uploaded company",
    fiscalYear: detectFiscalYear(text),
    unit,
    note,
    revenue,
    netWorth,
    transactions,
    lodr,
    aggregate,
    aggCitation,
    toCrore,
    warnings,
  });
}

export function scoreLodrRules(text: string, transactions: Transaction[]): LodrCheck[] {
  const lines = text.split("\n");
  return LODR_CHECKS.map((req) => {
    if (req.id === "L1") {
      const named = transactions.find((t) => ENTITY.test(t.party));
      return { id: req.id, met: Boolean(named), evidence: named ? named.party : null };
    }
    if (req.id === "L4") {
      const met = transactions.length > 0;
      return { id: req.id, met, evidence: met ? transactions[0].citation.quote : null };
    }
    const hit = lines.find((l) => req.patterns.some((p) => p.test(l)));
    return { id: req.id, met: Boolean(hit), evidence: hit ? hit.trim().slice(0, 200) : null };
  });
}

interface FinalizeInput {
  mode: "ai" | "rules";
  model?: string;
  company: string;
  fiscalYear: string;
  unit: string;
  note: string;
  revenue: number | null;
  netWorth: number | null;
  transactions: Transaction[];
  lodr: LodrCheck[];
  aggregate: number | null;
  aggCitation: Citation | null;
  toCrore: number;
  warnings: string[];
}

/** Shared tail for both engines: tie-out, scaling, materiality and score. */
export function finalize(f: FinalizeInput): ExtractionResult {
  const tieOut = computeTieOut(f.transactions, f.aggregate, f.aggCitation);
  const gross = f.transactions.reduce((s, t) => s + Math.abs(t.amount), 0) * f.toCrore;
  const threshold = materialityThreshold(f.revenue);
  const material = f.transactions
    .filter((t) => Math.abs(t.amount) * f.toCrore > threshold)
    .map((t) => `${t.id}: ${t.nature} — ${t.party}`);
  const warnings = [...f.warnings];
  if (tieOut.status === "mismatch") warnings.push(`Extracted lines sum to ${tieOut.extractedTotal} but the note discloses ${tieOut.disclosedAggregate}. Review uncited or missed lines.`);
  if (tieOut.status === "no-aggregate") warnings.push("No disclosed aggregate (\"Total\" line) found — tie-out cannot be performed.");
  const unverified = f.transactions.filter((t) => !t.citation.verified).length;
  if (unverified) warnings.push(`${unverified} citation(s) could not be matched verbatim to the source text.`);

  return {
    mode: f.mode,
    model: f.model,
    company: f.company,
    fiscalYear: f.fiscalYear,
    unit: f.unit,
    note: f.note,
    revenue: f.revenue,
    netWorth: f.netWorth,
    transactions: f.transactions,
    tieOut,
    lodr: f.lodr,
    disclosureScore: scoreFromChecks(f.lodr.map((c) => c.met)),
    rptToRevenue: f.revenue ? gross / f.revenue : null,
    rptToNetWorth: f.netWorth ? gross / f.netWorth : null,
    materialTransactions: material,
    warnings,
  };
}

function scaleOrNull(n: number | null, factor: number) {
  return n === null ? null : n * factor;
}

function detectCompany(lines: string[]): string | null {
  for (const l of lines.slice(0, 15)) {
    const m = l.match(/([A-Z][A-Za-z&.\s]+(Limited|Ltd\.?))/);
    if (m && !RELATION.test(l)) return m[1].trim();
  }
  return null;
}

function detectFiscalYear(text: string): string {
  const m = text.match(/(?:year ended|as at)\s+(?:31(?:st)?\s+)?march,?\s+(20\d\d)/i) || text.match(/FY\s?(20\d\d)/i);
  if (!m) return "FY (not stated)";
  const y = Number(m[1]);
  return `FY${y - 1}-${String(y).slice(2)}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
