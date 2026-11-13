import test from "node:test";
import assert from "node:assert/strict";
import { rankPlayersForRole, topRoleFit } from "../../src/data/player-search.ts";

const players = [
  { uid: "a", displayName: "Ari", position: "DM, MC" },
  { uid: "b", displayName: "Bela", position: "MC" },
  { uid: "c", displayName: "Cato", position: "ST" },
  { uid: "d", displayName: "Dara", position: "DM" },
];
const fits = new Map([
  ["a", { score: 81, coverage: .9, confidence: "high", listedForRole: true, positionEligible: true }],
  ["b", { score: null, coverage: .4, confidence: "low", listedForRole: true, positionEligible: true }],
  ["c", { score: 95, coverage: 1, confidence: "high", listedForRole: false, positionEligible: false }],
  ["d", { score: 88, coverage: .8, confidence: "medium", listedForRole: true, positionEligible: true }],
]);

test("role ranking puts the highest eligible scored player first", () => {
  assert.deepEqual(rankPlayersForRole(players, "", "", fits).map((p) => p.uid), ["d", "a", "b", "c"]);
});
test("role ranking filters by player text and position", () => {
  assert.deepEqual(rankPlayersForRole(players, "a", "DM", fits).map((p) => p.uid), ["d", "a"]);
});
test("top role fit ignores unlisted players and insufficient-evidence scores", () => {
  assert.equal(topRoleFit(players, fits)?.uid, "d");
});
test("top role fit is null when no player has a valid score", () => {
  assert.equal(topRoleFit(players, new Map()), null);
});
