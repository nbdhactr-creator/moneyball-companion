import test from "node:test";
import assert from "node:assert/strict";
import { assignPlayerToTacticSlot, clearTacticSlotPlayer } from "../../src/data/squad-workspace.ts";

const slots = [
  { id: "GK", label: "GK", position: "GK", x: 50, y: 90, roleId: "gk", playerUid: "keeper" },
  { id: "CB", label: "CB", position: "D-C", x: 50, y: 70, roleId: "cb", playerUid: "defender" },
  { id: "ST", label: "ST", position: "ST-C", x: 50, y: 10, roleId: "st", playerUid: "" },
];

test("assigning a player to a new slot removes the duplicate assignment", () => {
  const result = assignPlayerToTacticSlot(slots, "ST", "defender");
  assert.equal(result.find((slot) => slot.id === "CB")?.playerUid, "");
  assert.equal(result.find((slot) => slot.id === "ST")?.playerUid, "defender");
  assert.equal(slots.find((slot) => slot.id === "CB")?.playerUid, "defender");
});

test("clearing a slot does not change other assignments", () => {
  const result = clearTacticSlotPlayer(slots, "CB");
  assert.equal(result.find((slot) => slot.id === "CB")?.playerUid, "");
  assert.equal(result.find((slot) => slot.id === "GK")?.playerUid, "keeper");
});

test("assigning an empty UID safely clears only the selected slot", () => {
  const result = assignPlayerToTacticSlot(slots, "GK", "  ");
  assert.equal(result.find((slot) => slot.id === "GK")?.playerUid, "");
  assert.equal(result.find((slot) => slot.id === "CB")?.playerUid, "defender");
});
