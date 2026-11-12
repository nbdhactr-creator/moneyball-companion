import {
  openLocalDatabase,
  formatStorageError,
  type SaveRecord,
  type SeasonDatasetRecord,
  type PlayerIdentityRecord,
} from "./local-database.ts";

const BACKUP_FORMAT = "moneyball-companion-save-backup";
const BACKUP_VERSION = 2;

interface ImportJobRecord {
  id: string;
  saveId: string;
  datasetId: string;
  status: "staging" | "committed" | "failed";
  createdAt: string;
  heartbeatAt?: string;
  error?: string;
}

interface PlayerSeasonRecord {
  id: string;
  saveId: string;
  datasetId: string;
  importJobId: string;
  uid: string;
  sourceLine: number;
  rawValues: Record<string, string>;
  displayName: string;
  club: string;
  position: string;
}

interface BackupManifest {
  datasetCount: number;
  playerRecordCount: number;
  importJobCount: number;
  identityCount?: number;
}

interface BackupPayload {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  save: SaveRecord;
  datasets: SeasonDatasetRecord[];
  importJobs: ImportJobRecord[];
  playerRecords: PlayerSeasonRecord[];
  playerIdentities: PlayerIdentityRecord[];
  manifest: BackupManifest & { identityCount: number };
  checksum: string;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("A local database request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("The local database transaction was aborted."));
    transaction.onerror = () => reject(transaction.error ?? new Error("The local database transaction failed."));
  });
}

function canonicalPayload(payload: Omit<BackupPayload, "checksum">): string {
  return JSON.stringify(payload);
}

async function checksum(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("This browser cannot verify backup integrity. Open Moneyball Companion in a current browser over HTTPS.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Backup is invalid: ${label} is missing.`);
}

async function validateBackup(input: unknown): Promise<BackupPayload> {
  if (!isObject(input)) throw new Error("This file is not a valid Moneyball Companion backup.");
  if (input.format !== BACKUP_FORMAT) throw new Error("This file is not a Moneyball Companion save backup.");
  if (input.version !== 1 && input.version !== BACKUP_VERSION) throw new Error("This backup version is not supported by this app version.");
  if (!Array.isArray(input.datasets) || !Array.isArray(input.importJobs) || !Array.isArray(input.playerRecords) ||
      (input.version === 2 && !Array.isArray(input.playerIdentities))) {
    throw new Error("Backup is incomplete: one or more data collections are missing.");
  }
  if (!isObject(input.save) || !isObject(input.manifest) || typeof input.checksum !== "string") {
    throw new Error("Backup metadata is missing or malformed.");
  }

  const save = input.save as unknown as SaveRecord;
  requireString(save.id, "career ID");
  requireString(save.name, "career name");
  requireString(save.createdAt, "career creation date");
  requireString(save.updatedAt, "career update date");

  const datasets = input.datasets as unknown as SeasonDatasetRecord[];
  const importJobs = input.importJobs as unknown as ImportJobRecord[];
  const playerRecords = input.playerRecords as unknown as PlayerSeasonRecord[];
  const suppliedIdentities = (Array.isArray(input.playerIdentities) ? input.playerIdentities : []) as PlayerIdentityRecord[];
  const manifest = input.manifest as unknown as BackupManifest & { identityCount?: number };

  if (manifest.datasetCount !== datasets.length ||
      manifest.importJobCount !== importJobs.length ||
      manifest.playerRecordCount !== playerRecords.length) {
    throw new Error("Backup integrity check failed: record counts do not match the manifest.");
  }

  const datasetIds = new Set<string>();
  const seasonKeys = new Set<string>();
  const fingerprints = new Set<string>();
  for (const dataset of datasets) {
    if (!isObject(dataset)) throw new Error("Backup contains an invalid season record.");
    requireString(dataset.id, "season ID");
    requireString(dataset.seasonLabel, "season label");
    requireString(dataset.seasonKey, "season key");
    requireString(dataset.fingerprint, "file fingerprint");
    requireString(dataset.importedAt, "season import date");
    if (dataset.saveId !== save.id || dataset.status !== "committed") {
      throw new Error("Backup contains a season that does not belong to this career or is not committed.");
    }
    if (datasetIds.has(dataset.id)) throw new Error("Backup contains duplicate season IDs.");
    datasetIds.add(dataset.id);
    if (seasonKeys.has(dataset.seasonKey) || fingerprints.has(dataset.fingerprint)) {
      throw new Error("Backup contains duplicate season labels or source files.");
    }
    seasonKeys.add(dataset.seasonKey);
    fingerprints.add(dataset.fingerprint);
    if (!Number.isInteger(dataset.playerCount) || dataset.playerCount < 0) {
      throw new Error("Backup contains an invalid player count.");
    }
  }

  const jobsById = new Map<string, ImportJobRecord>();
  const jobsByDataset = new Map<string, ImportJobRecord>();
  for (const job of importJobs) {
    if (!isObject(job)) throw new Error("Backup contains an invalid import record.");
    requireString(job.id, "import record ID");
    if (job.saveId !== save.id || job.status !== "committed" || !datasetIds.has(job.datasetId)) {
      throw new Error("Backup contains an import record with an invalid career, season or status.");
    }
    if (jobsById.has(job.id) || jobsByDataset.has(job.datasetId)) {
      throw new Error("Backup contains duplicate import records.");
    }
    jobsById.set(job.id, job);
    jobsByDataset.set(job.datasetId, job);
  }

  const countsByDataset = new Map<string, number>();
  const playerKeys = new Set<string>();
  for (const player of playerRecords) {
    if (!isObject(player)) throw new Error("Backup contains an invalid player record.");
    requireString(player.uid, "player UID");
    const job = jobsById.get(player.importJobId);
    if (player.saveId !== save.id || !datasetIds.has(player.datasetId) ||
        !job || job.datasetId !== player.datasetId) {
      throw new Error("Backup contains a player record with a broken season or import reference.");
    }
    const playerKey = `${player.datasetId}|${player.uid}`;
    if (playerKeys.has(playerKey)) throw new Error("Backup contains duplicate player UIDs within a season.");
    playerKeys.add(playerKey);
    countsByDataset.set(player.datasetId, (countsByDataset.get(player.datasetId) ?? 0) + 1);
  }

  for (const dataset of datasets) {
    if (!jobsByDataset.has(dataset.id)) throw new Error("Backup is missing an import record for a season.");
    if ((countsByDataset.get(dataset.id) ?? 0) !== dataset.playerCount) {
      throw new Error(`Backup integrity check failed for season "${dataset.seasonLabel}": player count mismatch.`);
    }
  }

  const derivedIdentities = new Map<string, PlayerIdentityRecord>();
  for (const player of playerRecords) {
    const id = `${save.id}:${player.uid}`;
    derivedIdentities.set(id, { id, saveId: save.id, uid: player.uid });
  }
  let playerIdentities: PlayerIdentityRecord[];
  if (input.version === 1) {
    // Legacy v1 backups predate the identity store. Derive stable identities
    // from their validated season records without altering the signed payload.
    playerIdentities = [...derivedIdentities.values()];
  } else {
    playerIdentities = suppliedIdentities;
    if (manifest.identityCount !== playerIdentities.length) {
      throw new Error("Backup integrity check failed: identity count does not match the manifest.");
    }
    const identityIds = new Set<string>();
    for (const identity of playerIdentities) {
      if (!isObject(identity)) throw new Error("Backup contains an invalid player identity.");
      requireString(identity.id, "player identity ID");
      requireString(identity.uid, "player identity UID");
      if (identity.saveId !== save.id || identity.id !== `${save.id}:${identity.uid}` ||
          identityIds.has(identity.id)) {
        throw new Error("Backup contains an invalid or duplicate player identity.");
      }
      identityIds.add(identity.id);
    }
    if (identityIds.size !== derivedIdentities.size ||
        [...derivedIdentities.keys()].some((id) => !identityIds.has(id))) {
      throw new Error("Backup is missing player identities referenced by its season records.");
    }
  }

  const unsignedV1 = {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: String(input.exportedAt ?? ""),
    save,
    datasets,
    importJobs,
    playerRecords,
    manifest: {
      datasetCount: manifest.datasetCount,
      playerRecordCount: manifest.playerRecordCount,
      importJobCount: manifest.importJobCount,
    },
  };
  const unsignedV2 = {
    format: BACKUP_FORMAT,
    version: 2,
    exportedAt: String(input.exportedAt ?? ""),
    save,
    datasets,
    importJobs,
    playerRecords,
    playerIdentities,
    manifest: {
      datasetCount: manifest.datasetCount,
      playerRecordCount: manifest.playerRecordCount,
      importJobCount: manifest.importJobCount,
      identityCount: playerIdentities.length,
    },
  };
  const expected = await checksum(canonicalPayload(input.version === 1 ? unsignedV1 as Omit<BackupPayload, "checksum"> : unsignedV2));
  if (expected !== input.checksum) throw new Error("Backup integrity check failed. The file may be damaged or modified.");

  return { ...unsignedV2, checksum: input.checksum } as BackupPayload;
}

/** Creates a portable, integrity-checked backup of one career and all committed season data. */
export async function createSaveBackup(saveId: string): Promise<string> {
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction(["saves", "datasets", "importJobs", "playerRecords", "playerIdentities"], "readonly");
    const done = transactionDone(transaction);
    const [saves, allDatasets, allJobs, playerRecords, playerIdentities] = await Promise.all([
      requestResult(transaction.objectStore("saves").getAll() as IDBRequest<SaveRecord[]>),
      requestResult(transaction.objectStore("datasets").index("saveId").getAll(saveId) as IDBRequest<SeasonDatasetRecord[]>),
      requestResult(transaction.objectStore("importJobs").index("saveId").getAll(saveId) as IDBRequest<ImportJobRecord[]>),
      requestResult(transaction.objectStore("playerRecords").index("saveId").getAll(saveId) as IDBRequest<PlayerSeasonRecord[]>),
      requestResult(transaction.objectStore("playerIdentities").index("saveId").getAll(saveId) as IDBRequest<PlayerIdentityRecord[]>),
    ]);
    await done;

    const save = saves.find((entry) => entry.id === saveId);
    if (!save) throw new Error("That career could not be found. Refresh the save library and try again.");
    const datasets = allDatasets.filter((entry) => entry.status === "committed");
    const datasetIds = new Set(datasets.map((entry) => entry.id));
    const importJobs = allJobs.filter((entry) => entry.status === "committed" && datasetIds.has(entry.datasetId));
    const jobIds = new Set(importJobs.map((entry) => entry.id));
    const committedPlayers = playerRecords.filter((entry) =>
      datasetIds.has(entry.datasetId) && jobIds.has(entry.importJobId));

    const unsigned = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      save,
      datasets,
      importJobs,
      playerRecords: committedPlayers,
      playerIdentities,
      manifest: {
        datasetCount: datasets.length,
        importJobCount: importJobs.length,
        playerRecordCount: committedPlayers.length,
        identityCount: playerIdentities.length,
      },
    } satisfies Omit<BackupPayload, "checksum">;
    const result: BackupPayload = { ...unsigned, checksum: await checksum(canonicalPayload(unsigned)) };
    await validateBackup(result);
    return JSON.stringify(result);
  } catch (error) {
    throw new Error(formatStorageError(error));
  } finally {
    db.close();
  }
}

/**
 * Restores a validated backup as a new career. Existing careers and season records are never replaced.
 * All IDs are regenerated so the restored copy cannot collide with the original.
 */
export async function restoreSaveBackup(input: unknown): Promise<SaveRecord> {
  const backup = await validateBackup(input);
  const newSaveId = crypto.randomUUID();
  const now = new Date().toISOString();
  const save: SaveRecord = {
    ...backup.save,
    id: newSaveId,
    name: `${backup.save.name} (Restored)`,
    createdAt: now,
    updatedAt: now,
  };

  const datasetIds = new Map(backup.datasets.map((dataset) => [dataset.id, crypto.randomUUID()]));
  const jobIds = new Map(backup.importJobs.map((job) => [job.id, crypto.randomUUID()]));
  const datasets = backup.datasets.map((dataset) => ({
    ...dataset,
    id: datasetIds.get(dataset.id)!,
    saveId: newSaveId,
  }));
  const importJobs = backup.importJobs.map((job) => ({
    ...job,
    id: jobIds.get(job.id)!,
    saveId: newSaveId,
    datasetId: datasetIds.get(job.datasetId)!,
    createdAt: now,
    heartbeatAt: now,
  }));
  const playerIdentities = backup.playerIdentities.map((identity) => ({
    id: `${newSaveId}:${identity.uid}`,
    saveId: newSaveId,
    uid: identity.uid,
  }));
  const playerRecords = backup.playerRecords.map((player) => {
    const datasetId = datasetIds.get(player.datasetId)!;
    return {
      ...player,
      id: `${datasetId}:${player.uid}`,
      normalizedName: (player.displayName ?? "").normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " "),
      saveId: newSaveId,
      datasetId,
      importJobId: jobIds.get(player.importJobId)!,
    };
  });

  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction(["saves", "datasets", "importJobs", "playerRecords", "playerIdentities"], "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore("saves").add(save);
    for (const dataset of datasets) transaction.objectStore("datasets").add(dataset);
    for (const job of importJobs) transaction.objectStore("importJobs").add(job);
    for (const player of playerRecords) transaction.objectStore("playerRecords").add(player);
    for (const identity of playerIdentities) transaction.objectStore("playerIdentities").add(identity);
    await done;
    return save;
  } catch (error) {
    throw new Error(formatStorageError(error));
  } finally {
    db.close();
  }
}
