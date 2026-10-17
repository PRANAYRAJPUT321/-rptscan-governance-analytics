"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CommandPalette from "./CommandPalette";
import { IconBook, IconBuilding, IconChat, IconCompare, IconLab, IconSearch, IconSpark, IconStudy } from "./icons";

export const NAV_LINKS = [
  { href: "/", label: "Study", Icon: IconStudy },
  { href: "/extract", label: "AI Extractor", Icon: IconSpark },
  { href: "/ask", label: "Ask AI", Icon: IconChat },
  { href: "/companies", label: "Companies", Icon: IconBuilding },
  { href: "/compare", label: "Compare", Icon: IconCompare },
  { href: "/lab", label: "Regression Lab", Icon: IconLab },
  { href: "/methodology", label: "Methodology", Icon: IconBook },
];

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      <header
        className={`no-print sticky top-0 z-40 border-b transition-colors ${
          scrolled ? "border-white/[0.08] bg-ink-950/80 backdrop-blur-xl" : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 via-indigo-500 to-teal-400 text-sm font-black text-white shadow-lg shadow-brand-500/30">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="6" cy="12" r="2.5" />
                <circle cx="18" cy="6" r="2.5" />
                <circle cx="18" cy="18" r="2.5" />
                <path d="M8.3 11l7.4-3.8M8.3 13l7.4 3.8" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-white">RPTScan</span>
              <span className="hidden text-[11px] text-slate-400 sm:block xl:hidden 2xl:block">Related Party Disclosure Study</span>
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-0.5 xl:flex">
            {NAV_LINKS.map(({ href, label, Icon }) => {
              const active = href === "/" ? path === "/" : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition ${
                    active ? "text-white" : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300"}`} />
                  {label}
                  {active && <span className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-gradient-to-r from-brand-400 to-teal-400" />}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => setOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400 transition hover:border-white/20 hover:text-slate-200"
          >
            <IconSearch className="h-4 w-4" />
            <span className="hidden whitespace-nowrap sm:inline xl:hidden 2xl:inline">Search…</span>
            <kbd className="hidden rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
          </button>
        </div>

        {/* Mobile tab strip */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 xl:hidden">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${active ? "bg-white/10 text-white" : "text-slate-400"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  );
}
