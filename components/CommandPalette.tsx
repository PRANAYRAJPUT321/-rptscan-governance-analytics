"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { COMPANIES } from "@/lib/companies";
import { pct } from "@/lib/format";
import { IconArrow, IconBuilding, IconSearch } from "./icons";

interface Item {
  id: string;
  title: string;
  sub: string;
  href: string;
  group: "Pages" | "Companies" | "Actions";
}

const PAGES: Item[] = [
  { id: "p-study", title: "Study dashboard", sub: "Research question, regression, risk map", href: "/", group: "Pages" },
  { id: "p-extract", title: "AI Extractor", sub: "Extract an RPT note from an annual report", href: "/extract", group: "Pages" },
  { id: "p-ask", title: "Ask RPTScan AI", sub: "Chat with the study data", href: "/ask", group: "Pages" },
  { id: "p-companies", title: "Companies", sub: "All 100 NSE companies", href: "/companies", group: "Pages" },
  { id: "p-compare", title: "Compare companies", sub: "Radar chart, side-by-side", href: "/compare", group: "Pages" },
  { id: "p-lab", title: "Regression Lab", sub: "Pick variables and re-run OLS", href: "/lab", group: "Pages" },
  { id: "p-method", title: "Methodology", sub: "Engine, validation, LODR rubric, viva script", href: "/methodology", group: "Pages" },
  { id: "a-sample", title: "Run the sample extraction", sub: "Load the demo RPT note", href: "/extract?sample=1", group: "Actions" },
];

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const companies: Item[] = COMPANIES.map((c) => ({
      id: c.symbol,
      title: c.name,
      sub: `${c.symbol} · ${c.sector} · RPT/Rev ${pct(c.rptToRevenue)} · DQS ${c.disclosureScore}`,
      href: `/companies/${encodeURIComponent(c.symbol)}`,
      group: "Companies",
    }));
    const all = [...PAGES, ...companies];
    if (!s) return [...PAGES, ...companies.slice(0, 6)];
    return all.filter((i) => `${i.title} ${i.sub}`.toLowerCase().includes(s)).slice(0, 12);
  }, [q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => setIdx(0), [q]);

  if (!open) return null;

  const go = (i: Item) => {
    onClose();
    router.push(i.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/70 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div className="animate-pop w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl shadow-black/50" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <IconSearch className="h-5 w-5 text-slate-500" />
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") (e.preventDefault(), setIdx((i) => Math.min(i + 1, items.length - 1)));
              if (e.key === "ArrowUp") (e.preventDefault(), setIdx((i) => Math.max(i - 1, 0)));
              if (e.key === "Enter" && items[idx]) go(items[idx]);
            }}
            placeholder="Search a company (e.g. Adani, TCS) or a page…"
            className="w-full bg-transparent py-4 text-[15px] text-white placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <div className="px-3 py-8 text-center text-sm text-slate-500">No matches</div>}
          {items.map((i, n) => (
            <div key={i.id}>
              {(n === 0 || items[n - 1].group !== i.group) && <div className="label px-3 pb-1 pt-3">{i.group}</div>}
              <button
                onMouseEnter={() => setIdx(n)}
                onClick={() => go(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${n === idx ? "bg-brand-500/15" : ""}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${i.group === "Companies" ? "bg-teal-500/10 text-teal-300" : "bg-brand-500/10 text-brand-300"}`}>
                  {i.group === "Companies" ? <IconBuilding className="h-4 w-4" /> : <IconArrow className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-100">{i.title}</span>
                  <span className="block truncate text-xs text-slate-500">{i.sub}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
