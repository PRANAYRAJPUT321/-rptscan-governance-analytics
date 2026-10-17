import type { ReactNode } from "react";

export function Card({ title, subtitle, action, children, className = "" }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card card-pad min-w-0 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "good" | "bad" | "warn" }) {
  const toneCls = { default: "text-white", good: "text-emerald-400", bad: "text-rose-400", warn: "text-amber-300" }[tone];
  return (
    <div className="card card-pad">
      <div className="label">{label}</div>
      <div className={`num mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "bad" | "warn" | "info" }) {
  const cls = {
    default: "bg-white/5 text-slate-300 ring-white/10",
    good: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
    bad: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
    warn: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
    info: "bg-brand-500/10 text-brand-300 ring-brand-500/30",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${cls}`}>{children}</span>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 mt-4">
      <div className="label text-brand-300">{eyebrow}</div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-400">{children}</div>}
    </div>
  );
}

export function SimulatedNotice() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200/90">
      <span className="mt-0.5 text-base leading-none">⚠</span>
      <p>
        <strong className="font-semibold text-amber-200">Simulated panel.</strong> Company names and sectors are the real NSE universe, but the financial and
        governance figures are a seeded simulation used to demonstrate the pipeline. Replace rows with the AI Extractor&apos;s output before drawing conclusions
        about any company.
      </p>
    </div>
  );
}

export const DQS_COLOR = (s: number) => (s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#f43f5e");
