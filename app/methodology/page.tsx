import { Badge, Card, PageHeader } from "@/components/ui";
import { LODR_CHECKS } from "@/lib/lodr";

export const metadata = { title: "Methodology — RPTScan" };

const ARTIFACTS = [
  ["A1", "Data sourcing", "Annual report collection for the 100 NSE companies; the PDF reader and RPT-note locator (page relevance scoring)."],
  ["A2", "Text extraction", "PDF → positioned text → table lines with column separators; line numbering used by every citation."],
  ["A6", "Scoring rubric", "The 12-item LODR / Ind AS 24 disclosure-quality checklist and its weights."],
  ["A7", "Validation", "Citation verification against the source and the tie-out of extracted lines to the disclosed aggregate."],
  ["A9", "Dashboard & reporting", "Sector comparison, regression tables and the exportable CSV / JSON of each extraction."],
];

function Formula({ children }: { children: React.ReactNode }) {
  return <div className="num my-3 overflow-x-auto rounded-xl border border-white/10 bg-ink-950/70 px-4 py-3 font-mono text-sm text-brand-200">{children}</div>;
}

export default function Methodology() {
  return (
    <>
      <PageHeader eyebrow="Build & defend" title="Methodology">
        The engine, the AI design, the validation test and the regression behind the study — everything you need to defend the numbers.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Engine — the calculation">
          <p className="text-sm text-slate-400">
            For company <em>i</em> with extracted related party transactions <em>j = 1…n</em> (current-year flows only; year-end balances excluded):
          </p>
          <Formula>RPT_gross(i) = Σⱼ |amountᵢⱼ| × unit→₹crore</Formula>
          <Formula>RPT/Revenue(i) = RPT_gross(i) / Revenue from operations(i)</Formula>
          <Formula>RPT/NetWorth(i) = RPT_gross(i) / Total equity(i)</Formula>
          <Formula>DQS(i) = 100 × Σₖ wₖ·metᵢₖ / Σₖ wₖ, k = L1…L12</Formula>
          <p className="text-sm text-slate-400">
            Materiality follows LODR Reg 23(1): a transaction is material if it exceeds the lower of ₹1,000 crore or 10% of annual consolidated turnover, which
            triggers prior shareholder approval under Reg 23(4).
          </p>
        </Card>

        <Card title="Validation test — how we prove it is right">
          <ol className="space-y-3 text-sm text-slate-300">
            <li>
              <strong className="text-white">1. Every transaction cites its source.</strong> Each extracted row carries the note reference, line number, PDF page and a
              verbatim quote. The quote is string-matched back to the source text (whitespace-insensitive); a non-matching citation is flagged red.
            </li>
            <li>
              <strong className="text-white">2. Totals tie to the disclosed aggregate.</strong> The note&apos;s own &ldquo;Total&rdquo; line is extracted separately and never
              computed. The test passes when
            </li>
          </ol>
          <Formula>|Σ extracted − disclosed aggregate| ≤ max(0.5% × aggregate, 0.05)</Formula>
          <ol start={3} className="space-y-3 text-sm text-slate-300">
            <li>
              <strong className="text-white">3. Evidence for every LODR check.</strong> A check counts as met only when the AI&apos;s evidence snippet exists in the source;
              unsupported claims are downgraded automatically.
            </li>
            <li>
              <strong className="text-white">4. Regression tests.</strong> The repository&apos;s unit tests run the engine on a reference note, assert 13/13 verified citations
              and a tie-out, and confirm that deleting a line produces a mismatch.
            </li>
          </ol>
        </Card>
      </div>

      <Card className="mt-6" title="Where the AI is used" subtitle="Claude does the reading; deterministic code does the checking">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Locate", "Page relevance scoring finds the Ind AS 24 note among hundreds of pages and drops board-report boilerplate that mentions RPTs without figures."],
            ["Extract", "Claude reads the line-numbered note and returns structured JSON (schema-constrained output): party, relationship, nature, category, amounts, line, quote, plus the disclosed aggregate and evidence for each LODR check."],
            ["Interpret", "An analyst note interprets the company against its sector using only the computed figures. A deterministic rule engine with the same output schema runs when no API key is set, and as a cross-check."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-sm font-semibold text-white">✦ {t}</div>
              <p className="mt-1 text-sm text-slate-400">{d}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6" title="LODR disclosure-quality rubric" subtitle="Weights sum to 100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="th">ID</th>
                <th className="th">Requirement</th>
                <th className="th">Source</th>
                <th className="th text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {LODR_CHECKS.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="td num text-slate-500">{c.id}</td>
                  <td className="td">
                    <div className="font-medium text-slate-100">{c.title}</div>
                    <div className="text-xs text-slate-500">{c.description}</div>
                  </td>
                  <td className="td text-xs text-slate-400">{c.source}</td>
                  <td className="td num text-right font-semibold">{c.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Research design">
          <p className="text-sm text-slate-400">Main specification, cross-section of 100 companies:</p>
          <Formula>ROAᵢ,ₜ₊₁ − ROA̅_sector = α + β₁ RPT/Revᵢ + β₂ DQSᵢ + β₃ ln(Revᵢ) + β₄ Promoter% + β₅ Indep% + β₆ Pledge% + εᵢ</Formula>
          <p className="text-sm text-slate-400">
            β₁ &lt; 0 supports the <strong className="text-slate-200">tunnelling</strong> (conflict-of-interest) view of RPTs; β₁ ≥ 0 supports the
            <strong className="text-slate-200"> efficient transactions</strong> view. A second model regresses DQS on RPT intensity and ownership to test the governance
            channel. Quintile sorts and a correlation matrix give a model-free view.
          </p>
        </Card>
        <Card title="Module artifacts reused">
          <div className="space-y-2.5">
            {ARTIFACTS.map(([id, t, d]) => (
              <div key={id} className="flex gap-3">
                <Badge tone="info">{id}</Badge>
                <div>
                  <div className="text-sm font-medium text-slate-100">{t}</div>
                  <div className="text-xs text-slate-400">{d}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Mapping of RPTScan components to the course&apos;s module artifacts — align the labels with your module handbook.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Viva demonstration — three minutes">
          <ol className="space-y-2.5 text-sm text-slate-300">
            {[
              ["0:00", "Open AI Extractor → Annual report PDF; drop one company's annual report."],
              ["0:30", "Show the auto-located RPT note pages; adjust if needed. Enter revenue & net worth, pick the sector."],
              ["1:00", "Extract with Claude. Walk through the transactions table — click a citation to jump to the source line."],
              ["1:45", "Show the validation tile: citations verified and the tie-out to the note's disclosed total."],
              ["2:15", "LODR scorecard and the sector panel: percentile of RPT/Revenue and DQS vs peers, league table."],
              ["2:45", "Generate the AI analyst note; close on the Study page regression answering the research question."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <span className="num w-10 shrink-0 font-semibold text-brand-300">{t}</span>
                <span>{d}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Limitations">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
            <li>The 100-company panel on the Study page is simulated until each company&apos;s note is run through the extractor; it demonstrates the method only.</li>
            <li>Cross-sectional associations are not causal; reverse causality (weak firms relying on group support) is possible.</li>
            <li>Scanned (image-only) annual reports need OCR before text extraction.</li>
            <li>Notes that present RPTs only in consolidated form may net intra-group flows, lowering measured intensity.</li>
            <li>Gross intensity sums absolute flows; guarantees and loans are stocks-like and can be analysed separately via the category mix.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
