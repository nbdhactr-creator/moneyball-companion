import test from "node:test";
import assert from "node:assert/strict";
import { buildFm24DofRecommendations } from "../../src/analytics/fm24-dof-recommendations.ts";

function player(uid, overrides = {}) {
  return {
    uid, name: "Player " + uid, club: "Other FC", age: 25, minutes: 2400,
    transferValue: 2_000_000, transferValueLabel: "€2M",
    wage: 20_000, wageLabel: "€20K p/w", notForSale: false,
    positionEligible: true, listedForRole: true,
    roleScore: 75, dofEvaluationScore: 75, philosophyScore: 70,
    tacticalFit: 74, confidence: "high",
    ...overrides,
  };
}
const options = (overrides = {}) => ({
  currentClub: "My FC", budget: 20_000_000, wageCap: 40_000,
  philosophyThreshold: 50, requireKnownValue: true,
  rankingMode: "role-led", poolMinimumMinutes: 900,
  prospectMinimumMinutes: 300, ...overrides,
});

test("role-led ranking sorts on DoF role evaluation and uses philosophy as a tie-break", () => {
  const players = [
    player("a", { dofEvaluationScore: 80, philosophyScore: 55 }),
    player("b", { dofEvaluationScore: 80, philosophyScore: 85 }),
    player("c", { dofEvaluationScore: 79, philosophyScore: 99 }),
  ];
  const result = buildFm24DofRecommendations(players, options());
  assert.deepEqual(result.categories.best.map((p) => p.uid), ["b", "a", "c"]);
});

test("a measured low philosophy score is filtered but missing philosophy is not treated as zero", () => {
  const players = [
    player("low", { philosophyScore: 42 }),
    player("missing", { philosophyScore: null, tacticalFit: null }),
    player("fit", { philosophyScore: 68 }),
  ];
  const result = buildFm24DofRecommendations(players, options());
  assert.deepEqual(result.eligible.map((p) => p.uid).sort(), ["fit", "missing"]);
});

test("budget and wage caps are applied without inventing missing financial values", () => {
  const players = [
    player("over-value", { transferValue: 25_000_000 }),
    player("over-wage", { wage: 50_000 }),
    player("unknown-value", { transferValue: null }),
    player("unknown-wage", { wage: null }),
    player("inside", { transferValue: 10_000_000, wage: 30_000 }),
  ];
  const result = buildFm24DofRecommendations(players, options());
  assert.deepEqual(result.eligible.map((p) => p.uid), ["inside", "unknown-wage"]);
  const allowUnknown = buildFm24DofRecommendations(players, options({ requireKnownValue: false }));
  assert.ok(allowUnknown.eligible.some((p) => p.uid === "unknown-value"));
});

test("balanced ranking requires both scores and ranks by the explicit composite", () => {
  const players = [
    player("role-first", { dofEvaluationScore: 90, philosophyScore: 55, tacticalFit: 80 }),
    player("balanced-first", { dofEvaluationScore: 80, philosophyScore: 90, tacticalFit: 86 }),
    player("incomplete", { tacticalFit: null, philosophyScore: null }),
  ];
  const result = buildFm24DofRecommendations(players, options({ rankingMode: "balanced", philosophyThreshold: null }));
  assert.deepEqual(result.categories.best.map((p) => p.uid), ["balanced-first", "role-first"]);
  assert.ok(!result.categories.best.some((p) => p.uid === "incomplete"));
});

test("starter-relative upgrade, value and depth categories use separate criteria", () => {
  const players = [
    player("starter", { club: "My FC", age: 27, minutes: 2600, dofEvaluationScore: 70, roleScore: 68 }),
    player("upgrade", { age: 25, dofEvaluationScore: 82, transferValue: 8_000_000 }),
    player("value", { age: 27, dofEvaluationScore: 75, transferValue: 1_000_000 }),
    player("depth", { age: 29, dofEvaluationScore: 64, confidence: "high", transferValue: 1_000_000 }),
  ];
  const result = buildFm24DofRecommendations(players, options({ starterUid: "starter", budget: 10_000_000 }));
  assert.deepEqual(result.categories.upgrades.map((p) => p.uid), ["upgrade"]);
  assert.ok(result.categories.value.some((p) => p.uid === "value"));
  assert.ok(result.categories.depth.some((p) => p.uid === "depth"));
});

test("young targets use an explicit minutes floor and do not claim age-adjusted scoring", () => {
  const players = [
    player("young", { age: 19, minutes: 400, dofEvaluationScore: 61 }),
    player("short-sample", { age: 18, minutes: 120 }),
    player("older", { age: 22, minutes: 1800 }),
  ];
  const result = buildFm24DofRecommendations(players, options({ philosophyThreshold: null }));
  assert.deepEqual(result.categories.young.map((p) => p.uid), ["young"]);
});

test("not-for-sale and wrong-position candidates are excluded", () => {
  const players = [
    player("nfs", { notForSale: true }),
    player("wrong-position", { positionEligible: false }),
    player("normal"),
  ];
  const result = buildFm24DofRecommendations(players, options());
  assert.deepEqual(result.eligible.map((p) => p.uid), ["normal"]);
});
