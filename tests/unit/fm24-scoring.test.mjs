import test from "node:test";
import assert from "node:assert/strict";
import {
  createFm24Scorer,
  combineTacticalFit,
  philosophyWeightsForRole,
  FM24_ROLE_COUNT,
  FM24_PHILOSOPHY_PRINCIPLES,
} from "../../src/analytics/fm24-scoring.ts";

function defender(index, overrides = {}) {
  return {
    uid: String(1000 + index),
    displayName: "Defender " + index,
    position: "D (C)",
    division: "Premier League",
    rawValues: {
      UID: String(1000 + index),
      Name: "Defender " + index,
      Position: "D (C)",
      Mins: "2400",
      "Hdr %": String(55 + index),
      "Hdrs A": "70",
      "Hdrs W/90": String(0.5 + index / 100),
      "Tck R": String(55 + index),
      "Tck A": "40",
      "Tck W": String(25 + index),
      "Itc": String(20 + index),
      "K Tck": String(8 + index),
      "Blk": String(12 + index),
      "Clear": String(40 + index),
      "Shts Blckd": String(8 + index),
      "Gl Mst": String(index % 3),
      "Pas %": String(70 + index),
      "Poss Lost/90": "8",
      "Ps A/90": "45",
      "Drb/90": "0.5",
      "Pr passes/90": String(2 + index / 10),
      "OP-KP/90": "0.1",
      "xA/90": "0.05",
      "Pres A/90": String(8 + index / 2),
      "Pres C/90": String(3 + index / 3),
      "Poss Won/90": String(5 + index / 2),
      "Int/90": String(2 + index / 4),
      "Sprints/90": String(12 + index / 2),
      Distance: "55.4mi",
      ...overrides,
    },
  };
}

test("catalogue exposes 115 FM24 role/duty variants and six philosophy principles", () => {
  assert.equal(FM24_ROLE_COUNT, 115);
  assert.equal(FM24_PHILOSOPHY_PRINCIPLES.length, 6);
});

test("source zero is preserved while blank values remain missing", () => {
  const players = [defender(0, { Gls: "0", xG: "", Ast: "-" })];
  const scorer = createFm24Scorer(players);
  assert.equal(scorer.players[0].stats.Gls, 0);
  assert.equal(scorer.players[0].stats.xG, null);
  assert.equal(scorer.players[0].stats.Ast, null);
  assert.ok(scorer.players[0].stats["Dist/90 km"] > 3.3);
});

test("role score is position-specific and returns explainable family coverage", () => {
  const players = Array.from({ length: 14 }, (_, index) => defender(index));
  const scorer = createFm24Scorer(players);
  const role = scorer.roles.find((entry) => entry.id === "cd-DC-D");
  assert.ok(role);
  const score = scorer.scoreRole(scorer.players[5], role);
  assert.notEqual(score.score, null);
  assert.ok(score.coverage >= 0.6);
  assert.ok(score.families.length > 0);
  assert.ok(score.families.every((family) => Array.isArray(family.metrics)));
  const wingerRole = scorer.roles.find((entry) => entry.strata === "AMLR");
  assert.ok(wingerRole);
  assert.equal(scorer.scoreRole(scorer.players[5], wingerRole).score, null);
});

test("insufficient evidence produces no role or philosophy score", () => {
  const players = Array.from({ length: 14 }, (_, index) => ({
    uid: String(index + 1), position: "D (C)", division: "Premier League",
    rawValues: { UID: String(index + 1), Position: "D (C)", Mins: "2400" },
  }));
  const scorer = createFm24Scorer(players);
  const role = scorer.roles.find((entry) => entry.id === "cd-DC-D");
  assert.ok(role);
  assert.equal(scorer.scoreRole(scorer.players[0], role).score, null);
  assert.equal(scorer.scorePhilosophy(scorer.players[0], role).score, null);
});

test("philosophy score reports principle-level evidence and coverage", () => {
  const players = Array.from({ length: 14 }, (_, index) => defender(index));
  const scorer = createFm24Scorer(players);
  const role = scorer.roles.find((entry) => entry.id === "cd-DC-D");
  assert.ok(role);
  const result = scorer.scorePhilosophy(scorer.players[5], role);
  assert.notEqual(result.score, null);
  assert.equal(result.principles.length, 6);
  assert.ok(result.coverage >= 0.6);
  assert.ok(result.principles.every((principle) => principle.metricCoverage >= 0 && principle.metricCoverage <= 1));
});

test("combined tactical fit never substitutes missing philosophy with a neutral score", () => {
  const role = {
    score: 80, coverage: 1, availableWeight: 5, totalWeight: 5,
    coreFamilyAvailable: true, confidence: "high", minutes: 2500, families: [],
  };
  const missingPhilosophy = {
    score: null, coverage: 0.2, availableWeight: 1, totalWeight: 5, principles: [], profile: "v1-baseline",
  };
  assert.equal(combineTacticalFit(role, missingPhilosophy).score, null);
  const completePhilosophy = { ...missingPhilosophy, score: 60, coverage: 1 };
  const combined = combineTacticalFit(role, completePhilosophy);
  assert.equal(combined.score, 74);
  assert.equal(combined.status, "complete");
});

test("philosophy templates preserve six role-specific weights within the 0-3 scale", () => {
  const role = "cd-DC-D";
  for (const template of ["possession", "counter", "direct", "balanced", "lowblock", "wing", "positional", "press", "physical"]) {
    const weights = philosophyWeightsForRole(role, template);
    assert.equal(weights.length, 6);
    assert.ok(weights.every((weight) => weight >= 0 && weight <= 3));
  }
});

test("partial-season minute samples scale reference and confidence thresholds", () => {
  const players = Array.from({ length: 14 }, (_, index) => defender(index));
  const scorer = createFm24Scorer(players);
  assert.equal(scorer.seasonProgress, 0.5);
  assert.equal(scorer.poolMinimumMinutes, 600);
  assert.equal(scorer.highConfidenceMinutes, 1000);
});

test("derived metrics stay missing when required source components are absent", () => {
  const scorer = createFm24Scorer([{
    uid: "missing-components",
    position: "D (C)",
    division: "Premier League",
    rawValues: {
      UID: "missing-components",
      Position: "D (C)",
      Mins: "2400",
      Gls: "2",
      xG: "1.5",
      Shots: "10",
      Pens: "0",
      "Tck W": "12",
      Itc: "8",
      Blk: "3",
      "Pres A": "40",
      Distance: "55.4",
    },
  }]);
  const stats = scorer.players[0].stats;
  assert.equal(stats["Non-pen G/90"], null, "missing penalty goals must not be assumed to be zero");
  assert.equal(stats["Def actions/90"], null, "missing clearances must not be assumed to be zero");
  assert.equal(stats["Press success"], null, "missing completed pressures must not be assumed to be zero");
  assert.equal(stats["Dist/90 km"], null, "unitless distance must not be assumed to be kilometres");
});

test("V1 philosophy templates reproduce source transformations for a centre-back", () => {
  const role = "cd-DC-D";
  assert.deepEqual(philosophyWeightsForRole(role, "possession"), [2, 1, 1, 1, 3, 1]);
  assert.deepEqual(philosophyWeightsForRole(role, "counter"), [1, 1, 1, 2, 3, 2]);
  assert.deepEqual(philosophyWeightsForRole(role, "direct"), [0, 0, 2, 1, 3, 2]);
  assert.deepEqual(philosophyWeightsForRole(role, "balanced"), [2, 2, 2, 2, 2, 2]);
  assert.deepEqual(philosophyWeightsForRole(role, "lowblock"), [0, 0, 2, 0, 3, 1]);
  assert.deepEqual(philosophyWeightsForRole(role, "positional"), [3, 2, 2, 1, 3, 0]);
  assert.deepEqual(philosophyWeightsForRole(role, "press"), [1, 1, 1, 2, 3, 3]);
  assert.deepEqual(philosophyWeightsForRole(role, "physical"), [1, 1, 1, 2, 3, 3]);
});

test("V1 philosophy goalkeeper exceptions are preserved", () => {
  const role = { id: "gk-GK-D", type: "gk", strata: "GK" };
  const base = philosophyWeightsForRole(role, "possession");
  for (const template of ["lowblock", "wing", "press", "physical"]) {
    assert.deepEqual(philosophyWeightsForRole(role, template), base);
  }
  assert.deepEqual(philosophyWeightsForRole(role, "positional"), [2, 1, 0, 0, 1, 0]);
});

test("DoF evaluation preserves the V1 90/10 aerial adjustment without altering core role fit", () => {
  const players = Array.from({ length: 14 }, (_, index) => defender(index));
  const scorer = createFm24Scorer(players);
  const player = scorer.players[5];
  const role = "cd-DC-D";
  const core = scorer.scoreRole(player, role).score;
  const evaluation = scorer.scoreDofEvaluation(player, role);
  assert.notEqual(core, null);
  assert.equal(evaluation.coreRoleScore, core);
  assert.equal(evaluation.aerialAdjustmentApplied, true);
  assert.notEqual(evaluation.aerialScore, null);
  assert.equal(evaluation.score, Math.round(core * 0.9 + evaluation.aerialScore * 0.1));
});

test("missing aerial evidence never reduces a DoF role evaluation", () => {
  const players = Array.from({ length: 14 }, (_, index) => defender(index, index === 5 ? { "Hdr %": "" } : {}));
  const scorer = createFm24Scorer(players);
  const player = scorer.players[5];
  const role = "cd-DC-D";
  const core = scorer.scoreRole(player, role).score;
  const evaluation = scorer.scoreDofEvaluation(player, role);
  assert.notEqual(core, null);
  assert.equal(evaluation.aerialAdjustmentApplied, false);
  assert.equal(evaluation.score, core);
});

test("optional sample shrinkage pulls low-minute DoF scores toward the median", () => {
  const players = Array.from({ length: 30 }, (_, index) =>
    defender(index, { Mins: index < 26 ? "2400" : "600" }));
  const scorer = createFm24Scorer(players, { shrinkSmallSamples: true });
  const role = scorer.roles.find((entry) => entry.id === "cd-DC-D");
  assert.ok(role);
  assert.equal(scorer.seasonProgress, 0.5);
  const player = scorer.players[29];
  const core = scorer.scoreRole(player, role);
  const dof = scorer.scoreDofEvaluation(player, role, core.score);
  assert.notEqual(dof.score, null);
  assert.equal(dof.sampleAdjusted, true);
  assert.ok(Math.abs(dof.displayScore - 50) < Math.abs(dof.score - 50));
});
