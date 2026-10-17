"use client";

import { useState } from "react";

export type FormatSpec = { type: "num" | "pct" | "ratio" | "inr"; digits?: number };
type Fmt = FormatSpec | ((v: number) => string);

function toFn(f: Fmt | undefined, fallback: (v: number) => string): (v: number) => string {
  if (!f) return fallback;
  if (typeof f === "function") return f;
  const d = f.digits ?? 1;
  switch (f.type) {
    case "pct":
      return (v) => `${v.toFixed(d)}%`;
    case "ratio":
      return (v) => `${(v * 100).toFixed(d)}%`;
    case "inr":
      return (v) => `₹${Math.round(v).toLocaleString("en-IN")}`;
    default:
      return (v) => v.toFixed(d);
  }
}

const AXIS = "#475569";
const GRID = "rgba(148,163,184,0.10)";

function ticks(min: number, max: number, count = 5) {
  const span = max - min || 1;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (count * step) / span;
  const mult = err <= 0.15 ? 10 : err <= 0.35 ? 5 : err <= 0.75 ? 2 : 1;
  const s = step * mult;
  const out: number[] = [];
  for (let v = Math.ceil(min / s) * s; v <= max + 1e-9; v += s) out.push(Number(v.toFixed(10)));
  return out;
}

export interface ScatterPoint {
  id: string;
  x: number;
  y: number;
  color: string;
  label: string;
  detail?: string;
  highlight?: boolean;
}

export function Scatter({
  points,
  xLabel,
  yLabel,
  xFormat: xf,
  yFormat: yf,
  trend = true,
  height = 320,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xFormat?: Fmt;
  yFormat?: Fmt;
  trend?: boolean;
  height?: number;
}) {
  const [hover, setHover] = useState<ScatterPoint | null>(null);
  const xFormat = toFn(xf, String);
  const yFormat = toFn(yf, String);
  const W = 640;
  const H = height;
  const m = { l: 48, r: 16, t: 12, b: 40 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(0, ...xs);
  const xMax = Math.max(...xs) * 1.05;
  const yMin = Math.min(...ys) - 1;
  const yMax = Math.max(...ys) + 1;
  const sx = (v: number) => m.l + ((v - xMin) / (xMax - xMin)) * (W - m.l - m.r);
  const sy = (v: number) => H - m.b - ((v - yMin) / (yMax - yMin)) * (H - m.t - m.b);

  let line: [number, number, number, number] | null = null;
  if (trend && points.length > 2) {
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const b = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const a = my - b * mx;
    line = [sx(xMin), sy(a + b * xMin), sx(xMax), sy(a + b * xMax)];
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${yLabel} against ${xLabel}`}>
        {ticks(yMin, yMax).map((t) => (
          <g key={`y${t}`}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke={GRID} />
            <text x={m.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {ticks(xMin, xMax).map((t) => (
          <text key={`x${t}`} x={sx(t)} y={H - m.b + 18} textAnchor="middle" fontSize="11" fill="#94a3b8">
            {xFormat(t)}
          </text>
        ))}
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke={AXIS} />
        <text x={(W + m.l) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#cbd5e1">
          {xLabel}
        </text>
        <text x={12} y={(H - m.b) / 2} textAnchor="middle" fontSize="11" fill="#cbd5e1" transform={`rotate(-90 12 ${(H - m.b) / 2})`}>
          {yLabel}
        </text>
        {line && <line x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />}
        {points.map((p) => (
          <circle
            key={p.id}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={p.highlight ? 8 : hover?.id === p.id ? 6.5 : 5}
            fill={p.color}
            fillOpacity={p.highlight ? 1 : 0.75}
            stroke={p.highlight ? "#fff" : "rgba(7,11,20,0.9)"}
            strokeWidth={p.highlight ? 2.5 : 1}
            onMouseEnter={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
            className="cursor-pointer transition-all"
          />
        ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-ink-850/95 px-3 py-2 text-xs shadow-xl"
          style={{ left: `${(sx(hover.x) / W) * 100}%`, top: `${(sy(hover.y) / H) * 100}%`, transform: "translate(-50%, calc(-100% - 12px))" }}
        >
          <div className="font-semibold text-white">{hover.label}</div>
          <div className="num text-slate-300">
            {xLabel}: {xFormat(hover.x)} · {yLabel}: {yFormat(hover.y)}
          </div>
          {hover.detail && <div className="text-slate-400">{hover.detail}</div>}
        </div>
      )}
    </div>
  );
}

export function HBars({
  rows,
  format: f,
  highlight,
  color = "#3b82f6",
  marker,
}: {
  rows: { label: string; value: number; sub?: string }[];
  format?: Fmt;
  highlight?: string;
  color?: string;
  marker?: { value: number; label: string };
}) {
  const format = toFn(f, (v) => v.toFixed(1));
  const max = Math.max(...rows.map((r) => r.value), marker?.value ?? 0) || 1;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const hi = r.label === highlight;
        return (
          <div key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 text-sm">
            <div className={`truncate ${hi ? "font-semibold text-white" : "text-slate-300"}`} title={r.label}>
              {r.label}
            </div>
            <div className="relative h-5 rounded-md bg-white/[0.04]">
              <div
                className="absolute inset-y-0 left-0 rounded-md transition-all"
                style={{ width: `${(Math.max(r.value, 0) / max) * 100}%`, background: hi ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : color, opacity: hi ? 1 : 0.8 }}
              />
              {marker && (
                <div className="absolute inset-y-[-3px] w-px bg-white/60" style={{ left: `${(marker.value / max) * 100}%` }} title={marker.label} />
              )}
            </div>
            <div className={`num text-right ${hi ? "font-semibold text-amber-300" : "text-slate-400"}`}>{format(r.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Columns({
  data,
  format: f,
  colors,
  height = 200,
}: {
  data: { label: string; value: number; sub?: string }[];
  format?: Fmt;
  colors?: string[];
  height?: number;
}) {
  const format = toFn(f, (v) => v.toFixed(1));
  const max = Math.max(...data.map((d) => Math.abs(d.value))) || 1;
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <div className="num text-xs font-semibold text-slate-200">{format(d.value)}</div>
          <div
            className="w-full rounded-t-lg"
            style={{
              height: `${(Math.abs(d.value) / max) * 75}%`,
              minHeight: 4,
              background: colors?.[i] ?? "linear-gradient(180deg,#60a5fa,#2563eb)",
            }}
          />
          <div className="text-xs font-medium text-slate-300">{d.label}</div>
          {d.sub && <div className="num -mt-1 text-[10px] text-slate-500">{d.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/** Box-style sector band (P25–P75) with median tick and the company's marker. */
export function PercentileStrip({
  min,
  max,
  p25,
  p75,
  median,
  value,
  format: f,
  higherIsWorse,
}: {
  min: number;
  max: number;
  p25: number;
  p75: number;
  median: number;
  value: number;
  format: Fmt;
  higherIsWorse: boolean;
}) {
  const format = toFn(f, String);
  const lo = Math.min(min, value);
  const hi = Math.max(max, value);
  const pos = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%`;
  const good = higherIsWorse ? value <= median : value >= median;
  return (
    <div className="relative mt-6 h-8">
      <div className="absolute inset-x-0 top-3.5 h-1 rounded-full bg-white/10" />
      <div className="absolute top-2 h-4 rounded bg-brand-500/30 ring-1 ring-brand-400/40" style={{ left: pos(p25), width: `calc(${pos(p75)} - ${pos(p25)})` }} />
      <div className="absolute top-1 h-6 w-0.5 bg-brand-300" style={{ left: pos(median) }} />
      <div className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[10px] text-brand-300" style={{ left: pos(median) }}>
        median {format(median)}
      </div>
      <div
        className={`absolute top-0.5 h-7 w-7 -translate-x-1/2 rounded-full border-2 border-white shadow-lg ${good ? "bg-emerald-500" : "bg-rose-500"}`}
        style={{ left: pos(value) }}
        title={format(value)}
      />
      <div className="absolute top-9 flex w-full justify-between text-[10px] text-slate-500">
        <span>{format(lo)}</span>
        <span>{format(hi)}</span>
      </div>
    </div>
  );
}

export function Gauge({ value, label }: { value: number; label: string }) {
  const r = 52;
  const c = Math.PI * r;
  const color = value >= 80 ? "#10b981" : value >= 60 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-40">
        <path d="M8 62 A52 52 0 0 1 112 62" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M8 62 A52 52 0 0 1 112 62"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
        />
        <text x="60" y="56" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff" className="num">
          {value}
        </text>
      </svg>
      <div className="label -mt-1">{label}</div>
    </div>
  );
}
