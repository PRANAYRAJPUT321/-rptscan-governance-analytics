"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, DQS_COLOR } from "@/components/ui";
import { riskScore } from "@/lib/analysis";
import { pct } from "@/lib/format";
import type { Company } from "@/lib/types";

type SortKey = "name" | "sector" | "rptToRevenue" | "rptToNetWorth" | "disclosureScore" | "roaNext" | "risk";

export default function CompanyTable({ companies, sectors }: { companies: Company[]; sectors: string[] }) {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("All");
  const [sort, setSort] = useState<SortKey>("rptToRevenue");
  const [dir, setDir] = useState<1 | -1>(-1);

  const rows = useMemo(() => {
    const withRisk = companies.map((c) => ({ ...c, risk: riskScore(c) }));
    return withRisk
      .filter((c) => (sector === "All" || c.sector === sector) && `${c.name} ${c.symbol}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => {
        const va = a[sort];
        const vb = b[sort];
        return (typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number)) * dir;
      });
  }, [companies, q, sector, sort, dir]);

  const head = (k: SortKey, label: string, right = false) => (
    <th className={`th cursor-pointer select-none hover:text-slate-200 ${right ? "text-right" : ""}`} onClick={() => (sort === k ? setDir((d) => (d === 1 ? -1 : 1)) : (setSort(k), setDir(-1)))}>
      {label} {sort === k ? (dir === 1 ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap gap-3 border-b border-white/5 p-4">
        <input className="input max-w-xs" placeholder="Search company or symbol…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[14rem]" value={sector} onChange={(e) => setSector(e.target.value)}>
          <option>All</option>
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="ml-auto self-center text-xs text-slate-500">{rows.length} companies</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="bg-white/[0.02]">
            <tr>
              {head("name", "Company")}
              {head("sector", "Sector")}
              {head("rptToRevenue", "RPT / Rev", true)}
              {head("rptToNetWorth", "RPT / NW", true)}
              {head("disclosureScore", "Disclosure", true)}
              {head("roaNext", "ROA t+1", true)}
              {head("risk", "Risk", true)}
              <th className="th">Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.symbol} className="border-t border-white/5 hover:bg-white/[0.025]">
                <td className="td">
                  <Link href={`/companies/${encodeURIComponent(c.symbol)}`} className="group">
                    <div className="font-medium text-slate-100 group-hover:text-brand-300">{c.name}</div>
                    <div className="num text-xs text-slate-500">NSE: {c.symbol}</div>
                  </Link>
                </td>
                <td className="td text-slate-400">{c.sector}</td>
                <td className="td num text-right">{pct(c.rptToRevenue)}</td>
                <td className="td num text-right text-slate-400">{pct(c.rptToNetWorth)}</td>
                <td className="td text-right">
                  <span className="num font-semibold" style={{ color: DQS_COLOR(c.disclosureScore) }}>
                    {c.disclosureScore}
                  </span>
                </td>
                <td className={`td num text-right ${c.roaNext < 0 ? "text-rose-400" : "text-slate-300"}`}>{c.roaNext.toFixed(1)}%</td>
                <td className="td text-right">
                  <span className={`num font-semibold ${c.risk >= 50 ? "text-rose-400" : c.risk >= 30 ? "text-amber-300" : "text-emerald-400"}`}>{c.risk}</span>
                </td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    {c.auditQualified && <Badge tone="bad">Qualified</Badge>}
                    {c.promoterPledge > 20 && <Badge tone="warn">Pledge {c.promoterPledge.toFixed(0)}%</Badge>}
                    {!c.tieOutPassed && <Badge tone="warn">Tie-out</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
