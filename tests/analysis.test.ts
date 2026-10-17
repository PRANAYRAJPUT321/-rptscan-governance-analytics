import { test } from "node:test";
import assert from "node:assert/strict";
import { riskScore } from "../lib/analysis.ts";
import { COMPANIES } from "../lib/companies.ts";
import { ruleAnswer } from "../lib/context.ts";
import { ols } from "../lib/stats.ts";

test("OLS recovers known coefficients", () => {
  const X = Array.from({ length: 50 }, (_, i) => [i, (i * 7) % 11]);
  const y = X.map(([a, b]) => 2 + 0.5 * a - 1.5 * b);
  const r = ols(y, X, ["a", "b"]);
  assert.ok(Math.abs(r.coef[0] - 2) < 1e-8 && Math.abs(r.coef[1] - 0.5) < 1e-8 && Math.abs(r.coef[2] + 1.5) < 1e-8);
});

test("rule answer lists the riskiest companies first", () => {
  const top = [...COMPANIES].sort((a, b) => riskScore(b) - riskScore(a))[0];
  const ans = ruleAnswer("which companies are riskiest?");
  assert.ok(ans.split("\n")[1].includes(top.name), ans);
});

test("rule answer does not match a company from a common word", () => {
  assert.ok(!ruleAnswer("which information technology sector is riskiest").includes("Info Edge"));
});
