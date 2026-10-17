# RPTScan — Related Party Disclosure Study

**Topic:** Disclosure Quality and Governance Outcomes · **AI in Finance project**

> **Research question:** Does related party transaction (RPT) intensity relate to governance outcomes and subsequent performance?

RPTScan uses AI (Claude) to read the related party transactions note of an Indian listed company's annual report (Ind AS 24 / SEBI LODR Reg 23 & Schedule V), extracts every transaction **with a citation to the line it came from**, ties the extracted lines to the note's own disclosed total, scales RPTs to revenue and net worth, scores disclosure quality against the LODR requirements, and compares the company against its sector across a 100-company NSE study panel.

## What's in the app

| Page | Purpose |
| --- | --- |
| **Study** (`/`) | Answer to the research question: scatter, governance risk map, red-flag watchlist, quintile sorts, OLS regression, sector heatmap, correlation matrix |
| **AI Extractor** (`/extract`) | The engine & viva demo: upload an annual report PDF → auto-locate the RPT note → extract with Claude → validate → LODR scorecard → sector comparison → AI analyst note → CSV/JSON export, printable report, saved history |
| **Companies** (`/companies`) | Searchable, sortable table of the 100 companies; each company page shows it against its sector |
| **Ask AI** (`/ask`) | Chat analyst grounded in the study data (and your latest extraction); rule-based answers when AI is unavailable |
| **Compare** (`/compare`) | Up to 4 companies: governance radar (percentiles), side-by-side table, RPT mix |
| **Regression Lab** (`/lab`) | Choose outcome, regressors, sector fixed effects and sample; OLS re-runs live with coefficient plot and added-variable plot |
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
- **On Vercel no key is needed**: requests go through Vercel AI Gateway (`anthropic/claude-opus-5`, fallback `anthropic/claude-sonnet-5`) authenticated with the deployment's own OIDC token. Set `ANTHROPIC_API_KEY` to call the Anthropic API directly instead, or `AI_GATEWAY_API_KEY` to use the gateway from local dev.
- If the AI call fails, a **rule-based engine** with the same output schema runs (server-side, or in the browser if the API is unreachable).

> ⚠️ **Data note.** The 100-company panel uses the real NSE company names and sectors, but its financial and governance figures are a **seeded simulation** (`lib/companies.ts`) so the analytics can be shown end to end. Replace rows with extractor output before drawing conclusions about any company.

## Run locally

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY to enable Claude
npm run dev                  # http://localhost:3000
npm test                     # engine validation tests
```

## Deployment (Vercel)

Live: **https://rptscan.vercel.app**

- **Every 15 minutes** a scheduled deploy check compares the branch head with the live production deployment and deploys it if it is newer (four staggered hourly scheduled tasks, so the cadence survives session restarts).
- Optional: connect the repo in *Vercel → Project → Settings → Git* so every push deploys instantly, or add a `VERCEL_TOKEN` GitHub Actions secret to enable `.github/workflows/scheduled-deploy.yml` (deploy on push).
- AI works out of the box on Vercel via AI Gateway (free monthly credits on Hobby). Optionally add `ANTHROPIC_API_KEY` to use your own Anthropic account.

## Viva demonstration (3 minutes)

1. **AI Extractor → Annual report PDF**: drop one company's annual report; RPTScan highlights the pages holding the RPT note.
2. Enter revenue and net worth, pick the sector, click **Extract with Claude AI**.
3. Click any citation to jump to the source line; show **✓ Ties out** and the verified-citation count.
4. Walk the LODR scorecard, then the sector percentile strips and league table.
5. Generate the **AI analyst note**, and close on the Study page regression.
