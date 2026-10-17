"use client";

import { useEffect, useRef, useState } from "react";
import { IconChat, IconSend, IconSpark } from "@/components/icons";
import { Badge } from "@/components/ui";
import { renderMarkdown } from "@/lib/markdown";

interface Msg {
  role: "user" | "assistant";
  content: string;
  mode?: string;
}

const SUGGESTIONS = [
  "Which sectors have the highest RPT intensity, and why might that be?",
  "Explain the main regression result in plain English for my viva.",
  "Which 5 companies look riskiest on governance and why?",
  "What does LODR Regulation 23 require for material RPTs?",
  "How does disclosure quality relate to RPT intensity?",
  "How do we validate that the AI extraction is correct?",
];

const STORE = "rptscan.chat.v1";

export default function AskPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [extraction, setExtraction] = useState<string | null>(null);
  const [useExtraction, setUseExtraction] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) setMsgs(JSON.parse(saved));
      const ex = localStorage.getItem("rptscan.lastExtraction");
      if (ex) setExtraction(ex);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(msgs.slice(-30)));
    } catch {}
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          extraction: useExtraction ? extraction : undefined,
        }),
      });
      const d = await res.json();
      setMsgs([...next, { role: "assistant", content: d.text ?? d.error ?? "Something went wrong.", mode: d.mode }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "The analyst is unreachable right now — check your connection and try again.", mode: "error" }]);
    } finally {
      setBusy(false);
    }
  }

  const extractionName = (() => {
    try {
      return extraction ? (JSON.parse(extraction).company as string) : null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-4xl flex-col">
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label text-brand-300">AI analyst</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Ask RPTScan</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-400">
            Chat with the study: every answer is grounded in the 100-company panel, the regression output and the LODR rubric
            {extractionName ? ", plus your latest extraction" : ""}.
          </p>
        </div>
        {msgs.length > 0 && (
          <button onClick={() => setMsgs([])} className="btn-ghost py-1.5 text-xs">
            New chat
          </button>
        )}
      </div>

      {extractionName && (
        <label className="mt-4 flex cursor-pointer items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
          <input type="checkbox" checked={useExtraction} onChange={(e) => setUseExtraction(e.target.checked)} className="accent-brand-500" />
          Include my latest extraction: <strong className="text-white">{extractionName}</strong>
        </label>
      )}

      <div className="mt-6 flex-1 space-y-5">
        {msgs.length === 0 && (
          <div className="animate-fade-up">
            <div className="card card-pad glow-border text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-teal-400/20 text-brand-200">
                <IconChat className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">What would you like to know?</h2>
              <p className="mt-1 text-sm text-slate-400">Try one of these, or ask about any company by name or NSE symbol.</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="card-hover animate-fade-up rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left text-sm text-slate-300 hover:text-white"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <IconSpark className="mb-1 h-4 w-4 text-brand-300" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end animate-fade-up">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-brand-500 to-brand-600 px-4 py-2.5 text-[14px] text-white shadow-lg shadow-brand-600/20">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-3 animate-fade-up">
              <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-teal-400 text-white">
                <IconSpark className="h-4 w-4" />
              </span>
              <div className="min-w-0 max-w-[85%]">
                <div className="prose-chat rounded-2xl rounded-tl-md border border-white/[0.07] bg-ink-900/80 px-4 py-3 text-[14px] leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                <div className="mt-1.5">
                  <Badge tone={m.mode === "ai" ? "info" : "default"}>{m.mode === "ai" ? "✦ Claude" : m.mode === "error" ? "Offline" : "Rule engine"}</Badge>
                </div>
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex gap-3">
            <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-teal-400 text-white">
              <IconSpark className="h-4 w-4" />
            </span>
            <div className="w-full max-w-md space-y-2 rounded-2xl rounded-tl-md border border-white/[0.07] bg-ink-900/80 p-4">
              <div className="skeleton h-3 w-11/12" />
              <div className="skeleton h-3 w-9/12" />
              <div className="skeleton h-3 w-10/12" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-4 mt-6"
      >
        <div className="glow-border flex items-end gap-2 rounded-2xl border border-white/10 bg-ink-900/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about RPT intensity, a company, a sector, LODR rules…"
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button type="submit" disabled={busy || !input.trim()} className="btn-primary h-11 w-11 shrink-0 p-0" aria-label="Send">
            <IconSend className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
