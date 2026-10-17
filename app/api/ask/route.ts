import { NextResponse } from "next/server";
import { aiEnabled, chatAnswer, type ChatTurn } from "@/lib/ai";
import { ruleAnswer, studyContext } from "@/lib/context";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { messages?: ChatTurn[]; extraction?: string } | null;
  const turns = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!turns.length || turns[turns.length - 1].role !== "user") {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  // The conversation must start with a user turn.
  while (turns.length && turns[0].role !== "user") turns.shift();
  const question = turns[turns.length - 1].content;
  if (aiEnabled()) {
    try {
      const extra = body?.extraction ? `\n\nLATEST EXTRACTION BY THE USER (real data from an annual report):\n${body.extraction.slice(0, 8000)}` : "";
      return NextResponse.json({ mode: "ai", text: await chatAnswer(studyContext() + extra, turns) });
    } catch (err) {
      return NextResponse.json({ mode: "rules", text: ruleAnswer(question), note: `AI unavailable (${(err as Error).message})` });
    }
  }
  return NextResponse.json({ mode: "rules", text: ruleAnswer(question) });
}
