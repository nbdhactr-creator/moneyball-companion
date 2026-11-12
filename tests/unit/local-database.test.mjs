import assert from "node:assert/strict";
import { test } from "node:test";
import "fake-indexeddb/auto";
import {
  createSave,
  listSaves,
  openLocalDatabase,
  persistSeasonImport,
  recoverInterruptedImports,
} from "../../src/data/storage/local-database.ts";

async function resetDatabase() {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("moneyball-companion");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database deletion was blocked."));
  });
}

function row(uid, name = "Test Player") {
  return {
    sourceLine: 2,
    values: { UID: uid, Name: name, Position: "MC", Age: "21", Club: "Test FC" },
  };
}

function importInput(saveId, overrides = {}) {
  return {
    saveId,
    seasonLabel: "2026/27",
    fileName: "players.csv",
    fileSize: 1024,
    format: "fm24-pipe-table-v1",
    fingerprint: "a".repeat(64),
    rows: [row("1001")],
    ...overrides,
  };
}

test("creates a local save and persists a season snapshot", async () => {
  await resetDatabase();
  const save = await createSave("Hull City Career", "Hull City");
  const dataset = await persistSeasonImport(importInput(save.id));

  assert.equal(dataset.playerCount, 1);
  assert.equal(dataset.status, "committed");
  const library = await listSaves();
  assert.equal(library.length, 1);
  assert.equal(library[0].save.name, "Hull City Career");
  assert.equal(library[0].datasets.length, 1);
  assert.equal(library[0].datasets[0].seasonLabel, "2026/27");
});

test("blocks the same file from being imported twice into one save", async () => {
  await resetDatabase();
  const save = await createSave("Duplicate Test");
  await persistSeasonImport(importInput(save.id));

  await assert.rejects(
    persistSeasonImport(importInput(save.id, { seasonLabel: "2027/28" })),
    /exact file is already saved/,
  );
  assert.equal((await listSaves())[0].datasets.length, 1);
});

test("blocks season labels that differ only by letter case", async () => {
  await resetDatabase();
  const save = await createSave("Season Label Test");
  await persistSeasonImport(importInput(save.id, { seasonLabel: "Season 2026/27" }));

  await assert.rejects(
    persistSeasonImport(importInput(save.id, {
      seasonLabel: "SEASON 2026/27",
      fingerprint: "b".repeat(64),
    })),
    /already exists in this save/,
  );
  assert.equal((await listSaves())[0].datasets.length, 1);
});

test("keeps separate season snapshots for the same player UID", async () => {
  await resetDatabase();
  const save = await createSave("Multi-season Test");
  await persistSeasonImport(importInput(save.id));
  await persistSeasonImport(importInput(save.id, {
    seasonLabel: "2027/28",
    fileName: "players-next-season.csv",
    fingerprint: "b".repeat(64),
    rows: [row("1001", "Test Player Updated")],
  }));

  const library = await listSaves();
  assert.equal(library[0].datasets.length, 2);
  assert.deepEqual(
    library[0].datasets.map((dataset) => dataset.seasonLabel).sort(),
    ["2026/27", "2027/28"],
  );
});

test("rolls back a batch containing duplicate player UIDs and does not publish a dataset", async () => {
  await resetDatabase();
  const save = await createSave("Rollback Test");

  await assert.rejects(
    persistSeasonImport(importInput(save.id, {
      rows: [row("2001", "First"), row("2001", "Duplicate")],
    })),
  );

  assert.equal((await listSaves())[0].datasets.length, 0);
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction(["playerRecords", "importJobs"], "readonly");
    const playerRequest = transaction.objectStore("playerRecords").getAll();
    const jobsRequest = transaction.objectStore("importJobs").getAll();
    const [players, jobs] = await Promise.all([
      new Promise((resolve, reject) => {
        playerRequest.onsuccess = () => resolve(playerRequest.result);
        playerRequest.onerror = () => reject(playerRequest.error);
      }),
      new Promise((resolve, reject) => {
        jobsRequest.onsuccess = () => resolve(jobsRequest.result);
        jobsRequest.onerror = () => reject(jobsRequest.error);
      }),
    ]);
    assert.equal(players.length, 0);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].status, "failed");
  } finally {
    db.close();
  }
});


test("cleans up staged rows left by an interrupted browser session", async () => {
  await resetDatabase();
  const save = await createSave("Interrupted Import Test");
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction(["importJobs", "playerRecords"], "readwrite");
    transaction.objectStore("importJobs").add({
      id: "interrupted-job",
      saveId: save.id,
      datasetId: "unfinished-dataset",
      status: "staging",
      createdAt: new Date().toISOString(),
    });
    transaction.objectStore("playerRecords").add({
      id: "unfinished-dataset:3001",
      saveId: save.id,
      datasetId: "unfinished-dataset",
      importJobId: "interrupted-job",
      uid: "3001",
      sourceLine: 2,
      rawValues: { UID: "3001", Name: "Unfinished Player" },
      displayName: "Unfinished Player",
      club: "Test FC",
      position: "MC",
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }

  assert.equal(await recoverInterruptedImports(), 1);
  const recoveredDb = await openLocalDatabase();
  try {
    const transaction = recoveredDb.transaction(["playerRecords", "importJobs"], "readonly");
    const playersRequest = transaction.objectStore("playerRecords").getAll();
    const jobsRequest = transaction.objectStore("importJobs").getAll();
    const [players, jobs] = await Promise.all([
      new Promise((resolve, reject) => {
        playersRequest.onsuccess = () => resolve(playersRequest.result);
        playersRequest.onerror = () => reject(playersRequest.error);
      }),
      new Promise((resolve, reject) => {
        jobsRequest.onsuccess = () => resolve(jobsRequest.result);
        jobsRequest.onerror = () => reject(jobsRequest.error);
      }),
    ]);
    assert.equal(players.length, 0);
    assert.equal(jobs[0].status, "failed");
  } finally {
    recoveredDb.close();
  }
});
