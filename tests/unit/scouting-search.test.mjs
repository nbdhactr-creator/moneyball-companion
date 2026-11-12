import assert from "node:assert/strict";
import { test } from "node:test";
import "fake-indexeddb/auto";
import {
  createSave, persistSeasonImport, searchScoutingPlayers,
  getScoutingWorkspaceState, updateScoutingWorkspaceState,
} from "../../src/data/storage/local-database.ts";

async function resetDatabase() {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("moneyball-companion");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database deletion was blocked."));
  });
}
function player(uid, name, age, rating) {
  return { sourceLine: 2, values: { UID: uid, Name: name, Position: "MC", Age: age, Rating: rating, Club: "Test FC" } };
}
async function fixture() {
  await resetDatabase();
  const save = await createSave("Scouting Search Test");
  const dataset = await persistSeasonImport({
    saveId: save.id, seasonLabel: "2026/27", fileName: "players.csv", fileSize: 1024,
    format: "fm24-pipe-table-v1", fingerprint: "c".repeat(64),
    rows: [
      player("9001", "Alpha Forward", "21", "88"),
      player("9002", "Beta Midfielder", "19", "72"),
      player("9003", "Gamma Defender", "", "95"),
      player("9004", "Delta Midfielder", "24", ""),
    ],
  });
  return { save, dataset };
}

test("searches the complete selected season and applies AND filters deterministically", async () => {
  const { dataset } = await fixture();
  const result = await searchScoutingPlayers({
    datasetId: dataset.id, filters: [
      { id: "a", field: "Age", operator: "gte", value: "20" },
      { id: "b", field: "Rating", operator: "gt", value: "80" },
    ], logic: "and", sortField: "Age", limit: 200,
  });
  assert.equal(result.total, 1);
  assert.deepEqual(result.players.map((entry) => entry.uid), ["9001"]);
});

test("supports OR filter logic and excludes missing values from numeric comparisons", async () => {
  const { dataset } = await fixture();
  const result = await searchScoutingPlayers({
    datasetId: dataset.id, filters: [
      { id: "a", field: "Age", operator: "lt", value: "20" },
      { id: "b", field: "Rating", operator: "gt", value: "90" },
    ], logic: "or", sortField: "name", limit: 200,
  });
  assert.equal(result.total, 2);
  assert.deepEqual(new Set(result.players.map((entry) => entry.uid)), new Set(["9002", "9003"]));
});

test("supports text search, stable sorting and bounded result pages with total count", async () => {
  const { dataset } = await fixture();
  const result = await searchScoutingPlayers({ datasetId: dataset.id, query: "midfielder", sortField: "Age", sortDirection: "desc", limit: 1 });
  assert.equal(result.total, 2);
  assert.equal(result.players.length, 1);
  assert.equal(result.players[0].uid, "9004");
});

test("persists saved searches, visible columns and shortlist decisions with the career", async () => {
  const { save } = await fixture();
  const state = await getScoutingWorkspaceState(save.id);
  state.savedSearches.push({
    id: "saved-1", name: "U21 midfielders", datasetId: "dataset-1", query: "midfielder", logic: "and",
    filters: [{ id: "age", field: "Age", operator: "lt", value: "21" }],
    columns: ["name", "Age"], sortField: "Age", sortDirection: "asc", updatedAt: new Date().toISOString(),
  });
  state.players["9002"] = {
    status: "shortlist", note: "Promising profile", tags: ["value", "U21"],
    reviewDate: "2026-12-01", updatedAt: new Date().toISOString(),
  };
  state.columnsByDataset["dataset-1"] = ["name", "position", "Age"];
  await updateScoutingWorkspaceState(save.id, state);
  const restored = await getScoutingWorkspaceState(save.id);
  assert.equal(restored.savedSearches[0].name, "U21 midfielders");
  assert.equal(restored.players["9002"].status, "shortlist");
  assert.deepEqual(restored.players["9002"].tags, ["value", "U21"]);
  assert.deepEqual(restored.columnsByDataset["dataset-1"], ["name", "position", "Age"]);
});
