# RPTScan — Related Party Disclosure Study

**Topic:** Disclosure Quality and Governance Outcomes · **AI in Finance project**

> **Research question:** Does related party transaction (RPT) intensity relate to governance outcomes and subsequent performance?

RPTScan uses AI (Claude) to read the related party transactions note of an Indian listed company's annual report (Ind AS 24 / SEBI LODR Reg 23 & Schedule V), extracts every transaction **with a citation to the line it came from**, ties the extracted lines to the note's own disclosed total, scales RPTs to revenue and net worth, scores disclosure quality against the LODR requirements, and compares the company against its sector across a 100-company NSE study panel.

## What's in the app

| Page | Purpose |
| --- | --- |
| **Study** (`/`) | Answer to the research question: scatter, quintile sorts, OLS regression, correlation matrix, sector medians |
| **AI Extractor** (`/extract`) | The engine & viva demo: upload an annual report PDF → auto-locate the RPT note → extract with Claude → validate → LODR scorecard → sector comparison → AI analyst note → CSV/JSON export |
| **Companies** (`/companies`) | Searchable, sortable table of the 100 companies; each company page shows it against its sector |
| **Methodology** (`/methodology`) | Formulas, validation test, LODR rubric, research design, artifacts A1/A2/A6/A7/A9, the 3-minute viva script |

## Engine — the calculation

```
RPT_gross      = Σ |amount_j|  (current-year flows; year-end balances excluded), converted to ₹ crore
RPT/Revenue    = RPT_gross / Revenue from operations
RPT/Net worth  = RPT_gross / Total equity
DQS (0–100)    = 100 × Σ w_k·met_k / Σ w_k over 12 LODR / Ind AS 24 checks
Material RPT   = amount > min(₹1,000 cr, 10% of turnover)   (LODR Reg 23(1))
```

## Validation test — how we prove it is right

1. **Every extracted transaction cites the note it came from** — note reference, line number, PDF page and a verbatim quote, which is matched back against the source text. Unmatched citations are flagged.
2. **Totals tie to the disclosed aggregate** — `|Σ extracted − disclosed total| ≤ max(0.5%, 0.05)`. The aggregate is read from the note, never computed.
3. LODR checks claimed by the AI count only if their evidence snippet exists in the source.
4. `npm test` runs the engine on a reference note and asserts 13/13 cited transactions, a tie-out, and that removing a line breaks the tie-out.

## AI design

- **Claude** (`claude-opus-5-5` by default, override with `ANTHROPIC_MODEL`) receives the line-numbered note and returns schema-constrained JSON (structured outputs via `zodOutputFormat`).
- Deterministic code verifies every citation and computes the tie-out, ratios, materiality and score, so the AI reads and the code checks.
- Without `ANTHROPIC_API_KEY`, a **rule-based engine** with the same output schema runs (server-side, or in the browser if the API is unreachable).

> ⚠️ **Data note.** The 100-company panel uses the real NSE company names and sectors, but its financial and governance figures are a **seeded simulation** (`lib/companies.ts`) so the analytics can be shown end to end. Replace rows with extractor output before drawing conclusions about any company.

## Run locally

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY to enable Claude
npm run dev                  # http://localhost:3000
npm test                     # engine validation tests
```

## Deployment (Vercel)

- The Vercel project is linked to this GitHub repository, so **every push deploys automatically**.
- `.github/workflows/scheduled-deploy.yml` also redeploys **every 15 minutes**. To enable it, create a Deploy Hook in *Vercel → Project → Settings → Git → Deploy Hooks* and save its URL as the GitHub Actions secret `VERCEL_DEPLOY_HOOK_URL`.
- Add `ANTHROPIC_API_KEY` in *Vercel → Project → Settings → Environment Variables* to turn on AI extraction.

## Viva demonstration (3 minutes)

1. **AI Extractor → Annual report PDF**: drop one company's annual report; RPTScan highlights the pages holding the RPT note.
2. Enter revenue and net worth, pick the sector, click **Extract with Claude AI**.
3. Click any citation to jump to the source line; show **✓ Ties out** and the verified-citation count.
4. Walk the LODR scorecard, then the sector percentile strips and league table.
5. Generate the **AI analyst note**, and close on the Study page regression.
