import assert from "node:assert/strict";
import { test } from "node:test";
import "fake-indexeddb/auto";
import {
  createSave,
  listSaves,
  openLocalDatabase,
  persistSeasonImport,
} from "../../src/data/storage/local-database.ts";
import {
  createSaveBackup,
  restoreSaveBackup,
} from "../../src/data/storage/save-backup.ts";

async function resetDatabase() {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("moneyball-companion");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database deletion was blocked."));
  });
}

function row(uid, name = "Backup Player") {
  return {
    sourceLine: 2,
    values: { UID: uid, Name: name, Position: "MC", Age: "21", Club: "Test FC" },
  };
}

function importInput(saveId, overrides = {}) {
  return {
    saveId,
    seasonLabel: "2025/26",
    fileName: "players.csv",
    fileSize: 1024,
    format: "fm24-pipe-table-v1",
    fingerprint: "c".repeat(64),
    rows: [row("7001")],
    ...overrides,
  };
}

async function readAllStores() {
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction(["saves", "datasets", "importJobs", "playerRecords"], "readonly");
    const read = (store) => new Promise((resolve, reject) => {
      const request = transaction.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await Promise.all([
      read("saves"),
      read("datasets"),
      read("importJobs"),
      read("playerRecords"),
    ]);
  } finally {
    db.close();
  }
}

test("exports a complete career backup and restores it as a separate career", async () => {
  await resetDatabase();
  const original = await createSave("Hull City Career", "Hull City");
  await persistSeasonImport(importInput(original.id));
  await persistSeasonImport(importInput(original.id, {
    seasonLabel: "2026/27",
    fileName: "players-next.html",
    format: "fm24-html-table-v1",
    fingerprint: "d".repeat(64),
    rows: [row("7001", "Backup Player Updated"), row("7002", "Second Player")],
  }));
  const unrelated = await createSave("Unrelated Career");
  await persistSeasonImport(importInput(unrelated.id, {
    seasonLabel: "2024/25",
    fingerprint: "e".repeat(64),
    rows: [row("9001", "Other Player")],
  }));

  const backupText = await createSaveBackup(original.id);
  const backup = JSON.parse(backupText);
  assert.equal(backup.format, "moneyball-companion-save-backup");
  assert.equal(backup.version, 1);
  assert.equal(backup.manifest.datasetCount, 2);
  assert.equal(backup.manifest.playerRecordCount, 3);
  assert.equal(backup.datasets.every((dataset) => dataset.saveId === original.id), true);

  const restored = await restoreSaveBackup(backup);
  assert.notEqual(restored.id, original.id);
  assert.equal(restored.name, "Hull City Career (Restored)");

  const library = await listSaves();
  assert.equal(library.length, 3);
  const restoredEntry = library.find((entry) => entry.save.id === restored.id);
  assert.ok(restoredEntry);
  assert.equal(restoredEntry.datasets.length, 2);
  assert.deepEqual(
    restoredEntry.datasets.map((dataset) => dataset.seasonLabel).sort(),
    ["2025/26", "2026/27"],
  );

  const [saves, datasets, jobs, players] = await readAllStores();
  assert.equal(saves.length, 3);
  const restoredDatasetIds = new Set(restoredEntry.datasets.map((dataset) => dataset.id));
  const restoredPlayers = players.filter((player) => player.saveId === restored.id);
  const restoredJobs = jobs.filter((job) => job.saveId === restored.id);
  assert.equal(restoredPlayers.length, 3);
  assert.equal(restoredJobs.length, 2);
  assert.equal(restoredPlayers.every((player) => restoredDatasetIds.has(player.datasetId)), true);
  assert.equal(restoredPlayers.every((player) => restoredJobs.some((job) =>
    job.id === player.importJobId && job.datasetId === player.datasetId)), true);
  assert.equal(datasets.length, 5);
  assert.equal((await listSaves()).find((entry) => entry.save.id === original.id).datasets.length, 2);
});

test("rejects a backup whose contents have been changed", async () => {
  await resetDatabase();
  const save = await createSave("Tamper Test");
  await persistSeasonImport(importInput(save.id));
  const backup = JSON.parse(await createSaveBackup(save.id));
  backup.playerRecords[0].rawValues.Name = "Changed Without Re-signing";

  await assert.rejects(restoreSaveBackup(backup), /integrity check failed/);
  assert.equal((await listSaves()).length, 1);
});

test("rejects unsupported backup versions and incomplete manifests", async () => {
  await resetDatabase();
  const save = await createSave("Format Test");
  await persistSeasonImport(importInput(save.id));
  const backup = JSON.parse(await createSaveBackup(save.id));

  await assert.rejects(
    restoreSaveBackup({ ...backup, version: 999 }),
    /version is not supported/,
  );
  await assert.rejects(
    restoreSaveBackup({ ...backup, manifest: { ...backup.manifest, playerRecordCount: 999 } }),
    /record counts do not match/,
  );
  assert.equal((await listSaves()).length, 1);
});

test("restoring the same backup twice creates two isolated copies without replacing data", async () => {
  await resetDatabase();
  const save = await createSave("Repeated Restore");
  await persistSeasonImport(importInput(save.id));
  const backup = JSON.parse(await createSaveBackup(save.id));

  const first = await restoreSaveBackup(backup);
  const second = await restoreSaveBackup(backup);
  assert.notEqual(first.id, second.id);
  assert.equal((await listSaves()).length, 3);
  assert.equal((await listSaves()).every((entry) => entry.datasets.length === 1), true);
});
