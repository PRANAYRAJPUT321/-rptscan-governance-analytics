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

/* ---------- Radar ---------- */
export function Radar({
  axes,
  series,
  size = 360,
}: {
  axes: string[];
  series: { name: string; color: string; values: number[] }[]; // values normalised 0..1
  size?: number;
}) {
  const c = size / 2;
  const r = c - 64;
  const pad = 70;
  const n = axes.length;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v];
  };
  return (
    <svg viewBox={`${-pad} 0 ${size + pad * 2} ${size}`} className="mx-auto h-auto w-full max-w-lg" role="img" aria-label="Radar comparison">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={axes.map((_, i) => pt(i, k).join(",")).join(" ")} fill="none" stroke="rgba(148,163,184,0.14)" />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 1);
        const [lx, ly] = pt(i, 1.18);
        return (
          <g key={a}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="rgba(148,163,184,0.14)" />
            <text x={lx} y={ly} textAnchor={Math.abs(lx - c) < 4 ? "middle" : lx > c ? "start" : "end"} dominantBaseline="middle" fontSize="14" fontWeight="500" fill="#cbd5e1">
              {a}
            </text>
          </g>
        );
      })}
      {series.map((s) => (
        <g key={s.name}>
          <polygon
            points={s.values.map((v, i) => pt(i, Math.max(0.02, Math.min(1, v))).join(",")).join(" ")}
            fill={s.color}
            fillOpacity="0.16"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {s.values.map((v, i) => {
            const [x, y] = pt(i, Math.max(0.02, Math.min(1, v)));
            return <circle key={i} cx={x} cy={y} r="3.5" fill={s.color} stroke="#070b14" strokeWidth="1.5" />;
          })}
        </g>
      ))}
    </svg>
  );
}

/* ---------- Bubble risk map ---------- */
export interface Bubble {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
  detail?: string;
  href?: string;
}

export function BubbleMap({
  bubbles,
  xLabel,
  yLabel,
  xSplit,
  ySplit,
  quadrants,
  height = 380,
}: {
  bubbles: Bubble[];
  xLabel: string;
  yLabel: string;
  xSplit: number;
  ySplit: number;
  quadrants: [string, string, string, string]; // TL, TR, BL, BR
  height?: number;
}) {
  const [hover, setHover] = useState<Bubble | null>(null);
  const W = 720;
  const H = height;
  const m = { l: 48, r: 18, t: 18, b: 40 };
  const xMax = Math.max(...bubbles.map((b) => b.x)) * 1.08;
  const yMin = Math.min(...bubbles.map((b) => b.y)) - 5;
  const yMax = 106;
  const sMax = Math.max(...bubbles.map((b) => b.size));
  const sx = (v: number) => m.l + (v / xMax) * (W - m.l - m.r);
  const sy = (v: number) => H - m.b - ((v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
  const rad = (s: number) => 4 + Math.sqrt(s / sMax) * 18;
  const qx = sx(xSplit);
  const qy = sy(ySplit);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Governance risk map">
        <rect x={qx} y={qy} width={W - m.r - qx} height={H - m.b - qy} fill="rgba(244,63,94,0.07)" />
        <rect x={m.l} y={m.t} width={qx - m.l} height={qy - m.t} fill="rgba(16,185,129,0.06)" />
        <line x1={qx} x2={qx} y1={m.t} y2={H - m.b} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" />
        <line x1={m.l} x2={W - m.r} y1={qy} y2={qy} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" />
        {[
          [m.l + 8, m.t + 16, "start", quadrants[0], "#6ee7b7"],
          [W - m.r - 8, m.t + 16, "end", quadrants[1], "#fcd34d"],
          [m.l + 8, H - m.b - 10, "start", quadrants[2], "#fcd34d"],
          [W - m.r - 8, H - m.b - 10, "end", quadrants[3], "#fda4af"],
        ].map(([x, y, a, t, col]) => (
          <text key={String(t)} x={x as number} y={y as number} textAnchor={a as "start" | "end"} fontSize="11" fontWeight="600" fill={col as string} opacity="0.85">
            {t as string}
          </text>
        ))}
        {ticks(0, xMax).map((t) => (
          <text key={`x${t}`} x={sx(t)} y={H - m.b + 18} textAnchor="middle" fontSize="11" fill="#94a3b8">
            {t}%
          </text>
        ))}
        {ticks(yMin, yMax).map((t) => (
          <text key={`y${t}`} x={m.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
            {t}
          </text>
        ))}
        <text x={(W + m.l) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#cbd5e1">
          {xLabel}
        </text>
        <text x={12} y={(H - m.b) / 2} textAnchor="middle" fontSize="11" fill="#cbd5e1" transform={`rotate(-90 12 ${(H - m.b) / 2})`}>
          {yLabel}
        </text>
        {[...bubbles]
          .sort((a, b) => b.size - a.size)
          .map((b) => (
            <a key={b.id} href={b.href}>
              <circle
                cx={sx(b.x)}
                cy={sy(b.y)}
                r={rad(b.size)}
                fill={b.color}
                fillOpacity={hover?.id === b.id ? 0.9 : 0.45}
                stroke={b.color}
                strokeWidth={hover?.id === b.id ? 2.5 : 1.2}
                onMouseEnter={() => setHover(b)}
                onMouseLeave={() => setHover(null)}
                className="cursor-pointer transition-all"
              />
            </a>
          ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-ink-850/95 px-3 py-2 text-xs shadow-xl"
          style={{ left: `${(sx(hover.x) / W) * 100}%`, top: `${(sy(hover.y) / H) * 100}%`, transform: "translate(-50%, calc(-100% - 16px))" }}
        >
          <div className="font-semibold text-white">{hover.label}</div>
          {hover.detail && <div className="num whitespace-nowrap text-slate-300">{hover.detail}</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- Heatmap ---------- */
export function Heatmap({
  rows,
  cols,
  values,
  format,
  higherIsWorse,
}: {
  rows: string[];
  cols: string[];
  values: number[][];
  format: Fmt[];
  higherIsWorse: boolean[];
}) {
  const fns = format.map((f) => toFn(f, (v) => v.toFixed(1)));
  const colStats = cols.map((_, j) => {
    const col = values.map((r) => r[j]);
    return [Math.min(...col), Math.max(...col)];
  });
  const shade = (v: number, j: number) => {
    const [lo, hi] = colStats[j];
    let k = (v - lo) / (hi - lo || 1);
    if (!higherIsWorse[j]) k = 1 - k;
    // green (good) → amber → rose (bad)
    const hue = 150 - k * 150;
    return `hsla(${hue}, 70%, 45%, ${0.16 + k * 0.32})`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c} className="px-1 pb-1 text-center text-[11px] font-semibold text-slate-400">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r}>
              <td className="whitespace-nowrap pr-3 text-xs font-medium text-slate-300">{r}</td>
              {values[i].map((v, j) => (
                <td key={j} className="num rounded-md py-2 text-center text-xs font-semibold text-white" style={{ background: shade(v, j) }}>
                  {fns[j](v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Donut ---------- */
export function Donut({ parts, size = 160, center }: { parts: { label: string; value: number; color: string }[]; size?: number; center?: ReactNodeLike }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 60;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
        {parts.map((p) => {
          const len = (p.value / total) * C;
          const el = (
            <circle key={p.label} cx="80" cy="80" r={r} fill="none" stroke={p.color} strokeWidth="18" strokeDasharray={`${Math.max(len - 1.5, 0)} ${C}`} strokeDashoffset={-acc} />
          );
          acc += len;
          return el;
        })}
      </svg>
      {center && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  );
}
type ReactNodeLike = import("react").ReactNode;

/* ---------- Sparkline ---------- */
export function Sparkline({ values, color = "#60a5fa", width = 120, height = 32 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - lo) / (hi - lo || 1)) * (height - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
