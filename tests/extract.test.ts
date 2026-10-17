import { test } from "node:test";
import assert from "node:assert/strict";
import { extractWithRules, parseAmount, verifyQuote } from "../lib/extract.ts";
import { SAMPLE_NOTE, SAMPLE_COMPANY } from "../lib/sample.ts";

test("parses Indian-format amounts", () => {
  assert.equal(parseAmount("1,426.35"), 1426.35);
  assert.equal(parseAmount("(12.50)"), -12.5);
  assert.equal(parseAmount("-"), null);
  assert.equal(parseAmount("Sale of goods"), null);
});

test("sample note: every transaction is cited and totals tie to the disclosed aggregate", () => {
  const r = extractWithRules(SAMPLE_NOTE, { revenue: SAMPLE_COMPANY.revenue, netWorth: SAMPLE_COMPANY.netWorth });
  assert.equal(r.transactions.length, 13);
  assert.equal(r.note, "Note 42");
  assert.equal(r.unit, "₹ crore");
  assert.equal(r.tieOut.status, "tied");
  assert.equal(r.tieOut.disclosedAggregate, 3710.5);
  for (const t of r.transactions) {
    assert.ok(t.citation.line > 0);
    assert.ok(verifyQuote(SAMPLE_NOTE, t.citation.quote), t.citation.quote);
  }
  const loan = r.transactions.find((t) => t.category === "loan");
  assert.equal(loan?.party, "Aarav Steel Limited");
  assert.equal(loan?.relationship, "Wholly-owned subsidiary");
  assert.ok(r.disclosureScore >= 90, `score ${r.disclosureScore}`);
  assert.ok(r.materialTransactions.some((m) => m.includes("Purchase")));
});

test("missing line is caught by the tie-out", () => {
  const broken = SAMPLE_NOTE.replace("Sale of goods | 238.60 | 214.45\n", "");
  const r = extractWithRules(broken);
  assert.equal(r.tieOut.status, "mismatch");
  assert.equal(r.tieOut.difference, -238.6);
});
