import { NextResponse } from "next/server";
import { aiEnabled, analystNote } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

interface InsightInput {
  company: string;
  sector: string;
  facts: string[];
  fallback: string[];
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as InsightInput | null;
  if (!body?.company) return NextResponse.json({ error: "Missing company" }, { status: 400 });
  if (!aiEnabled()) return NextResponse.json({ mode: "rules", text: body.fallback.map((f) => `- ${f}`).join("\n") });
  try {
    const text = await analystNote(`Company: ${body.company}\nSector: ${body.sector}\nData:\n${body.facts.map((f) => `- ${f}`).join("\n")}`);
    return NextResponse.json({ mode: "ai", text });
  } catch {
    return NextResponse.json({ mode: "rules", text: body.fallback.map((f) => `- ${f}`).join("\n") });
  }
}
