import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
    const transaction = db.transaction(["saves", "datasets", "importJobs", "playerRecords", "playerIdentities"], "readonly");
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
      read("playerIdentities"),
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
  assert.equal(backup.version, 2);
  assert.equal(backup.manifest.datasetCount, 2);
  assert.equal(backup.manifest.playerRecordCount, 3);
  assert.equal(backup.manifest.identityCount, 2);
  assert.equal(backup.playerIdentities.length, 2);
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

  const [saves, datasets, jobs, players, identities] = await readAllStores();
  assert.equal(saves.length, 3);
  const restoredDatasetIds = new Set(restoredEntry.datasets.map((dataset) => dataset.id));
  const restoredPlayers = players.filter((player) => player.saveId === restored.id);
  const restoredJobs = jobs.filter((job) => job.saveId === restored.id);
  assert.equal(restoredPlayers.length, 3);
  assert.equal(restoredJobs.length, 2);
  const restoredIdentities = identities.filter((identity) => identity.saveId === restored.id);
  assert.equal(restoredIdentities.length, 2);
  assert.deepEqual(restoredIdentities.map((identity) => identity.uid).sort(), ["7001", "7002"]);
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
  await assert.rejects(
    restoreSaveBackup({ ...backup, manifest: { ...backup.manifest, identityCount: 999 } }),
    /identity count does not match/,
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

test("upgrades an existing version 1 database without dropping player records", async () => {
  await resetDatabase();
  await new Promise((resolve, reject) => {
    const request = indexedDB.open("moneyball-companion", 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("playerRecords", { keyPath: "id" });
      store.createIndex("datasetId", "datasetId");
      store.createIndex("importJobId", "importJobId");
      store.createIndex("saveUid", ["saveId", "uid"]);
      store.createIndex("datasetUid", ["datasetId", "uid"], { unique: true });
      store.add({
        id: "legacy-dataset:7100",
        saveId: "legacy-save",
        datasetId: "legacy-dataset",
        importJobId: "legacy-job",
        uid: "7100",
        sourceLine: 2,
        rawValues: { UID: "7100", Name: "Legacy Player" },
        displayName: "Legacy Player",
        club: "Legacy FC",
        position: "MC",
      });
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });

  const db = await openLocalDatabase();
  try {
    assert.equal(db.version, 3);
    const store = db.transaction(["playerRecords", "playerIdentities"], "readonly").objectStore("playerRecords");
    assert.equal(store.indexNames.contains("saveId"), true);
    assert.equal(store.indexNames.contains("datasetName"), true);
    const player = await new Promise((resolve, reject) => {
      const request = store.get("legacy-dataset:7100");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    assert.equal(player.displayName, "Legacy Player");
    assert.equal(player.normalizedName, "legacy player");
    const identityStore = db.transaction("playerIdentities", "readonly").objectStore("playerIdentities");
    const identity = await new Promise((resolve, reject) => {
      const request = identityStore.get("legacy-save:7100");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    assert.deepEqual(identity, { id: "legacy-save:7100", saveId: "legacy-save", uid: "7100" });
  } finally {
    db.close();
  }
});

test("restores legacy version 1 backups by deriving player identities", async () => {
  await resetDatabase();
  const save = await createSave("Legacy Backup");
  await persistSeasonImport(importInput(save.id));
  const current = JSON.parse(await createSaveBackup(save.id));
  const legacy = { ...current, version: 1, manifest: {
    datasetCount: current.manifest.datasetCount,
    importJobCount: current.manifest.importJobCount,
    playerRecordCount: current.manifest.playerRecordCount,
  } };
  delete legacy.playerIdentities;
  delete legacy.checksum;
  legacy.checksum = createHash("sha256").update(JSON.stringify(legacy)).digest("hex");

  const restored = await restoreSaveBackup(legacy);
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction("playerIdentities", "readonly");
    const identities = await new Promise((resolve, reject) => {
      const request = transaction.objectStore("playerIdentities").index("saveId").getAll(restored.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    assert.deepEqual(identities.map((identity) => identity.uid), ["7001"]);
  } finally {
    db.close();
  }
});

test("upgrades the currently deployed version 2 database without losing existing players", async () => {
  await resetDatabase();
  await new Promise((resolve, reject) => {
    const request = indexedDB.open("moneyball-companion", 2);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("playerRecords", { keyPath: "id" });
      store.createIndex("datasetId", "datasetId");
      store.createIndex("importJobId", "importJobId");
      store.createIndex("saveUid", ["saveId", "uid"]);
      store.createIndex("datasetUid", ["datasetId", "uid"], { unique: true });
      store.createIndex("saveId", "saveId");
      store.add({
        id: "existing-season:7200",
        saveId: "existing-career",
        datasetId: "existing-season",
        importJobId: "existing-job",
        uid: "7200",
        sourceLine: 3,
        rawValues: { UID: "7200", Name: "Existing Player" },
        displayName: "Existing Player",
        club: "Existing FC",
        position: "DC",
      });
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });

  const db = await openLocalDatabase();
  try {
    assert.equal(db.version, 3);
    const transaction = db.transaction(["playerRecords", "playerIdentities"], "readonly");
    const player = await new Promise((resolve, reject) => {
      const request = transaction.objectStore("playerRecords").get("existing-season:7200");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const identity = await new Promise((resolve, reject) => {
      const request = transaction.objectStore("playerIdentities").get("existing-career:7200");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    assert.equal(player.normalizedName, "existing player");
    assert.deepEqual(identity, { id: "existing-career:7200", saveId: "existing-career", uid: "7200" });
  } finally {
    db.close();
  }
});
