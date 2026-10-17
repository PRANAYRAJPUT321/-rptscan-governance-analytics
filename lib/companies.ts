import { LODR_CHECKS, scoreFromChecks } from "./lodr";
import type { Company, RptCategory } from "./types";

/**
 * Study universe: 100 NSE-listed companies (names, symbols, sectors are public).
 *
 * IMPORTANT: the financial and governance figures are a seeded, simulated panel
 * calibrated to plausible ranges so the analytics, charts and regression can be
 * demonstrated end to end. They are NOT extracted from the companies' annual
 * reports. Replace each row with the Extractor's output (or a CSV) before
 * drawing any conclusion about a real company.
 */
const UNIVERSE: [string, string, string][] = [
  ["RELIANCE", "Reliance Industries", "Energy"],
  ["ONGC", "Oil & Natural Gas Corporation", "Energy"],
  ["IOC", "Indian Oil Corporation", "Energy"],
  ["BPCL", "Bharat Petroleum Corporation", "Energy"],
  ["GAIL", "GAIL (India)", "Energy"],
  ["COALINDIA", "Coal India", "Energy"],
  ["ADANIGREEN", "Adani Green Energy", "Power & Utilities"],
  ["NTPC", "NTPC", "Power & Utilities"],
  ["POWERGRID", "Power Grid Corporation of India", "Power & Utilities"],
  ["TATAPOWER", "Tata Power Company", "Power & Utilities"],
  ["ADANIPOWER", "Adani Power", "Power & Utilities"],
  ["JSWENERGY", "JSW Energy", "Power & Utilities"],
  ["TCS", "Tata Consultancy Services", "Information Technology"],
  ["INFY", "Infosys", "Information Technology"],
  ["HCLTECH", "HCL Technologies", "Information Technology"],
  ["WIPRO", "Wipro", "Information Technology"],
  ["TECHM", "Tech Mahindra", "Information Technology"],
  ["LTIM", "LTIMindtree", "Information Technology"],
  ["PERSISTENT", "Persistent Systems", "Information Technology"],
  ["COFORGE", "Coforge", "Information Technology"],
  ["MPHASIS", "Mphasis", "Information Technology"],
  ["HDFCBANK", "HDFC Bank", "Financial Services"],
  ["ICICIBANK", "ICICI Bank", "Financial Services"],
  ["SBIN", "State Bank of India", "Financial Services"],
  ["KOTAKBANK", "Kotak Mahindra Bank", "Financial Services"],
  ["AXISBANK", "Axis Bank", "Financial Services"],
  ["INDUSINDBK", "IndusInd Bank", "Financial Services"],
  ["BAJFINANCE", "Bajaj Finance", "Financial Services"],
  ["BAJAJFINSV", "Bajaj Finserv", "Financial Services"],
  ["SHRIRAMFIN", "Shriram Finance", "Financial Services"],
  ["CHOLAFIN", "Cholamandalam Investment & Finance", "Financial Services"],
  ["HDFCLIFE", "HDFC Life Insurance", "Financial Services"],
  ["SBILIFE", "SBI Life Insurance", "Financial Services"],
  ["ICICIGI", "ICICI Lombard General Insurance", "Financial Services"],
  ["HINDUNILVR", "Hindustan Unilever", "FMCG"],
  ["ITC", "ITC", "FMCG"],
  ["NESTLEIND", "Nestle India", "FMCG"],
  ["BRITANNIA", "Britannia Industries", "FMCG"],
  ["TATACONSUM", "Tata Consumer Products", "FMCG"],
  ["DABUR", "Dabur India", "FMCG"],
  ["MARICO", "Marico", "FMCG"],
  ["GODREJCP", "Godrej Consumer Products", "FMCG"],
  ["COLPAL", "Colgate-Palmolive (India)", "FMCG"],
  ["UNITDSPR", "United Spirits", "FMCG"],
  ["VBL", "Varun Beverages", "FMCG"],
  ["MARUTI", "Maruti Suzuki India", "Automobile"],
  ["TATAMOTORS", "Tata Motors", "Automobile"],
  ["M&M", "Mahindra & Mahindra", "Automobile"],
  ["BAJAJ-AUTO", "Bajaj Auto", "Automobile"],
  ["EICHERMOT", "Eicher Motors", "Automobile"],
  ["HEROMOTOCO", "Hero MotoCorp", "Automobile"],
  ["TVSMOTOR", "TVS Motor Company", "Automobile"],
  ["MOTHERSON", "Samvardhana Motherson International", "Automobile"],
  ["BOSCHLTD", "Bosch", "Automobile"],
  ["SUNPHARMA", "Sun Pharmaceutical Industries", "Healthcare"],
  ["DRREDDY", "Dr. Reddy's Laboratories", "Healthcare"],
  ["CIPLA", "Cipla", "Healthcare"],
  ["DIVISLAB", "Divi's Laboratories", "Healthcare"],
  ["APOLLOHOSP", "Apollo Hospitals Enterprise", "Healthcare"],
  ["LUPIN", "Lupin", "Healthcare"],
  ["TORNTPHARM", "Torrent Pharmaceuticals", "Healthcare"],
  ["ZYDUSLIFE", "Zydus Lifesciences", "Healthcare"],
  ["TATASTEEL", "Tata Steel", "Metals & Mining"],
  ["JSWSTEEL", "JSW Steel", "Metals & Mining"],
  ["HINDALCO", "Hindalco Industries", "Metals & Mining"],
  ["VEDL", "Vedanta", "Metals & Mining"],
  ["JINDALSTEL", "Jindal Steel & Power", "Metals & Mining"],
  ["NMDC", "NMDC", "Metals & Mining"],
  ["HINDZINC", "Hindustan Zinc", "Metals & Mining"],
  ["ULTRACEMCO", "UltraTech Cement", "Construction Materials"],
  ["GRASIM", "Grasim Industries", "Construction Materials"],
  ["SHREECEM", "Shree Cement", "Construction Materials"],
  ["AMBUJACEM", "Ambuja Cements", "Construction Materials"],
  ["ACC", "ACC", "Construction Materials"],
  ["LT", "Larsen & Toubro", "Capital Goods"],
  ["SIEMENS", "Siemens", "Capital Goods"],
  ["ABB", "ABB India", "Capital Goods"],
  ["BEL", "Bharat Electronics", "Capital Goods"],
  ["HAL", "Hindustan Aeronautics", "Capital Goods"],
  ["CGPOWER", "CG Power & Industrial Solutions", "Capital Goods"],
  ["CUMMINSIND", "Cummins India", "Capital Goods"],
  ["POLYCAB", "Polycab India", "Capital Goods"],
  ["HAVELLS", "Havells India", "Consumer Durables"],
  ["TITAN", "Titan Company", "Consumer Durables"],
  ["ASIANPAINT", "Asian Paints", "Consumer Durables"],
  ["PIDILITIND", "Pidilite Industries", "Consumer Durables"],
  ["DMART", "Avenue Supermarts", "Consumer Services"],
  ["TRENT", "Trent", "Consumer Services"],
  ["ZOMATO", "Zomato (Eternal)", "Consumer Services"],
  ["INDHOTEL", "Indian Hotels Company", "Consumer Services"],
  ["NAUKRI", "Info Edge (India)", "Consumer Services"],
  ["BHARTIARTL", "Bharti Airtel", "Telecom"],
  ["INDUSTOWER", "Indus Towers", "Telecom"],
  ["ADANIENT", "Adani Enterprises", "Infra & Conglomerates"],
  ["ADANIPORTS", "Adani Ports & SEZ", "Infra & Conglomerates"],
  ["DLF", "DLF", "Realty"],
  ["GODREJPROP", "Godrej Properties", "Realty"],
  ["LODHA", "Macrotech Developers", "Realty"],
  ["SRF", "SRF", "Chemicals"],
  ["PIIND", "PI Industries", "Chemicals"],
];

/** Mulberry32 — small seeded PRNG so every build produces the same panel. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const SECTOR_PROFILE: Record<string, { rpt: number; roa: number; promoter: number }> = {
  Energy: { rpt: 0.16, roa: 6.5, promoter: 58 },
  "Power & Utilities": { rpt: 0.2, roa: 4.5, promoter: 60 },
  "Information Technology": { rpt: 0.09, roa: 17, promoter: 52 },
  "Financial Services": { rpt: 0.05, roa: 2.1, promoter: 35 },
  FMCG: { rpt: 0.11, roa: 19, promoter: 55 },
  Automobile: { rpt: 0.18, roa: 9, promoter: 52 },
  Healthcare: { rpt: 0.12, roa: 11, promoter: 50 },
  "Metals & Mining": { rpt: 0.22, roa: 6, promoter: 55 },
  "Construction Materials": { rpt: 0.17, roa: 7.5, promoter: 60 },
  "Capital Goods": { rpt: 0.14, roa: 8, promoter: 55 },
  "Consumer Durables": { rpt: 0.08, roa: 15, promoter: 55 },
  "Consumer Services": { rpt: 0.07, roa: 9, promoter: 50 },
  Telecom: { rpt: 0.15, roa: 5, promoter: 55 },
  "Infra & Conglomerates": { rpt: 0.27, roa: 5, promoter: 70 },
  Realty: { rpt: 0.26, roa: 4, promoter: 68 },
  Chemicals: { rpt: 0.1, roa: 10, promoter: 50 },
};

const MIX: RptCategory[] = ["purchase", "sale", "services", "loan", "guarantee", "royalty", "investment", "remuneration"];

function normal(r: () => number) {
  const u = Math.max(r(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const r1 = (x: number) => Math.round(x * 10) / 10;

function build(): Company[] {
  return UNIVERSE.map(([symbol, name, sector]) => {
    const r = rng(hash(symbol));
    const p = SECTOR_PROFILE[sector];
    const revenue = Math.round(Math.exp(9 + r() * 2.8)); // ~₹8k cr to ~₹130k cr
    const netWorth = Math.round(revenue * (0.35 + r() * 0.9));
    const marketCap = Math.round(netWorth * (1.5 + r() * 8));
    const promoterHolding = r1(clamp(p.promoter + normal(r) * 10, 0, 75));
    // Promoter-heavy firms transact more with group entities.
    const rptToRevenue = clamp(p.rpt * Math.exp(normal(r) * 0.55) * (0.7 + promoterHolding / 120), 0.005, 0.85);
    const rptTotal = Math.round(revenue * rptToRevenue);

    // Disclosure quality: weaker for high-RPT, high-pledge groups, with noise.
    const promoterPledge = r1(clamp(r() < 0.75 ? r() * 4 : 5 + r() * 35, 0, 60));
    const qualityLatent = 0.85 - rptToRevenue * 0.6 - promoterPledge / 200 + normal(r) * 0.12;
    const lodr = LODR_CHECKS.map((c, i) => {
      const base = i < 4 ? 0.97 : i === 9 ? 0.45 : 0.75; // core items nearly always present
      return r() < clamp(base * (0.55 + qualityLatent * 0.6), 0.05, 0.995);
    });
    const disclosureScore = scoreFromChecks(lodr);

    const boardIndependence = r1(clamp(50 + normal(r) * 7 + (disclosureScore - 70) / 6, 33, 80));
    const auditQualified = r() < clamp(0.02 + rptToRevenue * 0.35 + (100 - disclosureScore) / 400, 0, 0.6);
    const acMeetings = Math.round(clamp(5 + normal(r) * 1.5, 4, 12));
    const roa = r1(p.roa * (0.8 + r() * 0.5));
    // Tunnelling hypothesis embedded for demonstration: high RPT intensity and weak
    // disclosure drag next-year ROA and return.
    const roaNext = r1(roa * 0.75 + p.roa * 0.25 - rptToRevenue * 9 + (disclosureScore - 70) * 0.04 + normal(r) * 1.6);
    const tsrNext = r1(12 + (roaNext - p.roa) * 1.5 - rptToRevenue * 25 + (disclosureScore - 70) * 0.15 + normal(r) * 14);

    const weights = MIX.map(() => r() ** 2);
    const wsum = weights.reduce((s, w) => s + w, 0);
    const rptMix = Object.fromEntries(MIX.map((m, i) => [m, Math.round((rptTotal * weights[i]) / wsum)]));

    return {
      symbol,
      name,
      sector,
      revenue,
      netWorth,
      marketCap,
      rptTotal,
      rptMix,
      rptToRevenue,
      rptToNetWorth: rptTotal / netWorth,
      lodr,
      disclosureScore,
      boardIndependence,
      promoterHolding,
      promoterPledge,
      auditQualified,
      acMeetings,
      roa,
      roaNext,
      tsrNext,
      tieOutPassed: r() < 0.9,
    };
  });
}

export const COMPANIES: Company[] = build();
export const SECTORS = Array.from(new Set(COMPANIES.map((c) => c.sector))).sort();

export function getCompany(symbol: string) {
  return COMPANIES.find((c) => c.symbol.toLowerCase() === symbol.toLowerCase());
}

export function sectorPeers(sector: string) {
  return COMPANIES.filter((c) => c.sector === sector);
}
