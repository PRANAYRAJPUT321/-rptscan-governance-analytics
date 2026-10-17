import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { detectUnit, finalize, verifyQuote } from "./extract";
import { LODR_CHECKS } from "./lodr";
import type { ExtractOptions } from "./extract";
import type { Citation, ExtractionResult, LodrCheck, RptCategory, Transaction } from "./types";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

const CATEGORIES = [
  "sale", "purchase", "services", "loan", "investment", "guarantee", "royalty",
  "rent", "remuneration", "dividend", "interest", "reimbursement", "other",
] as const;

const ExtractionSchema = z.object({
  company: z.string(),
  fiscal_year: z.string(),
  note_reference: z.string(),
  unit: z.string(),
  revenue: z.number().nullable(),
  net_worth: z.number().nullable(),
  transactions: z.array(
    z.object({
      party: z.string(),
      relationship: z.string(),
      nature: z.string(),
      category: z.enum(CATEGORIES),
      amount: z.number(),
      previous_amount: z.number().nullable(),
      line: z.number().int(),
      quote: z.string(),
    }),
  ),
  disclosed_aggregate: z
    .object({ amount: z.number(), line: z.number().int(), quote: z.string() })
    .nullable(),
  lodr_checks: z.array(z.object({ id: z.string(), met: z.boolean(), evidence: z.string().nullable() })),
});

const SYSTEM = `You are RPTScan, an analyst extracting related party transactions (RPTs) from the RPT note of an Indian listed company's annual report, prepared under Ind AS 24 and Regulation 23 / Schedule V of SEBI (LODR) Regulations, 2015.

The note is given with line numbers in the form "L12: ...". Rules:
- Extract every transaction FLOW for the current reporting year (sales, purchases, services, loans given/taken, investments, guarantees given, royalty, rent, remuneration, dividends, interest, reimbursements). Do not extract year-end outstanding balances, and do not extract subtotal or total lines as transactions.
- For each transaction, "line" is the line number the amount is printed on and "quote" is copied verbatim from that line (no paraphrasing). "amount" is the current-year figure in the note's unit; "previous_amount" is the comparative figure if shown.
- If the counterparty is named on a heading line above the amount, use that name as "party".
- "disclosed_aggregate" is the note's own total of related party transactions for the current year if one is printed, with its line and verbatim quote; otherwise null. Never compute it yourself.
- "revenue" and "net_worth" only if stated in the text (in the note's unit), else null.
- For lodr_checks, return one entry per requirement id given below. "met" is true only if the note actually discloses it, and "evidence" must be a verbatim snippet from the note (or null when not met).

Requirements:
${LODR_CHECKS.map((c) => `${c.id}: ${c.title} — ${c.description} (${c.source})`).join("\n")}`;

export async function extractWithClaude(text: string, opts: ExtractOptions = {}): Promise<ExtractionResult> {
  const client = new Anthropic();
  const lines = text.replace(/\r/g, "").split("\n");
  const numbered = lines.map((l, i) => `L${i + 1}: ${l}`).join("\n");

  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(ExtractionSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: `<rpt_note>\n${numbered}\n</rpt_note>` }],
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined this request.");
  const out = response.parsed_output;
  if (!out) throw new Error("The model response could not be parsed.");

  const { toCrore } = detectUnit(text);
  const note = out.note_reference || "RPT note";
  const lineText = (n: number) => lines[n - 1] ?? "";
  // Grounding: a citation counts only if its quote is in the source, ideally on the cited line.
  const ground = (line: number, quote: string): Citation => {
    const onLine = verifyQuote(lineText(line), quote);
    const anywhere = onLine || verifyQuote(text, quote);
    let fixedLine = line;
    if (!onLine && anywhere) {
      const idx = lines.findIndex((l) => verifyQuote(l, quote));
      if (idx >= 0) fixedLine = idx + 1;
    }
    return { note, line: fixedLine, quote, page: opts.pageOfLine?.(fixedLine), verified: anywhere };
  };

  const transactions: Transaction[] = out.transactions.map((t, i) => ({
    id: `T${i + 1}`,
    party: t.party,
    relationship: t.relationship || "Not stated",
    nature: t.nature,
    category: t.category as RptCategory,
    amount: t.amount,
    previousAmount: t.previous_amount,
    citation: ground(t.line, t.quote),
  }));

  const warnings: string[] = [];
  const lodr: LodrCheck[] = LODR_CHECKS.map((req) => {
    const hit = out.lodr_checks.find((c) => c.id === req.id);
    if (!hit) return { id: req.id, met: false, evidence: null };
    if (hit.met && hit.evidence && !verifyQuote(text, hit.evidence)) {
      warnings.push(`${req.id} was claimed as met but its evidence is not in the source — marked not met.`);
      return { id: req.id, met: false, evidence: null };
    }
    return { id: req.id, met: hit.met, evidence: hit.evidence };
  });

  const agg = out.disclosed_aggregate;
  return finalize({
    mode: "ai",
    model: AI_MODEL,
    company: opts.company || out.company,
    fiscalYear: out.fiscal_year,
    unit: out.unit,
    note,
    revenue: opts.revenue ?? (out.revenue !== null ? out.revenue * toCrore : null),
    netWorth: opts.netWorth ?? (out.net_worth !== null ? out.net_worth * toCrore : null),
    transactions,
    lodr,
    aggregate: agg ? agg.amount : null,
    aggCitation: agg ? ground(agg.line, agg.quote) : null,
    toCrore,
    warnings,
  });
}

export async function analystNote(prompt: string): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    system:
      "You are a governance analyst writing for an Indian equity research audience. Write 4 concise bullet points (markdown '- ' bullets, no headings) interpreting the company's related party transaction intensity and disclosure quality against its sector, citing the numbers given. Mention LODR Reg 23 materiality where relevant. Do not invent facts beyond the data provided.",
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") throw new Error("declined");
  return response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}
