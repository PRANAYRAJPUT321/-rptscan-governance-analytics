import { NextResponse } from "next/server";
import { aiEnabled, extractWithClaude } from "@/lib/ai";
import { extractWithRules } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 120_000;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { text?: string; company?: string; revenue?: number | null; netWorth?: number | null; pages?: number[]; mode?: "auto" | "rules" }
    | null;
  const text = body?.text?.trim();
  if (!text) return NextResponse.json({ error: "Paste or upload the RPT note text first." }, { status: 400 });
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: `The note is ${text.length.toLocaleString()} characters; trim it to the RPT note (max ${MAX_CHARS.toLocaleString()}).` }, { status: 413 });
  }
  const pages = body?.pages;
  const opts = {
    company: body?.company?.trim() || undefined,
    revenue: body?.revenue ?? null,
    netWorth: body?.netWorth ?? null,
    pageOfLine: pages ? (line: number) => pages[line - 1] : undefined,
  };

  if (body?.mode !== "rules" && aiEnabled()) {
    try {
      return NextResponse.json(await extractWithClaude(text, opts));
    } catch (err) {
      const result = extractWithRules(text, opts);
      result.warnings.unshift(`AI extraction failed (${(err as Error).message}); showing the rule-based engine's result.`);
      return NextResponse.json(result);
    }
  }
  const result = extractWithRules(text, opts);
  if (body?.mode !== "rules") result.warnings.unshift("ANTHROPIC_API_KEY is not configured — results come from the deterministic rule engine.");
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({ ai: aiEnabled() });
}
