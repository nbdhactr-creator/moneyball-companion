import type { Fm24RawPlayerRow } from "../import/fm24-pipe-parser";

const DATABASE_NAME = "moneyball-companion";
const DATABASE_VERSION = 1;
const IMPORT_BATCH_SIZE = 400;

export interface SaveRecord {
  id: string;
  name: string;
  club: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeasonDatasetRecord {
  id: string;
  saveId: string;
  seasonLabel: string;
  fileName: string;
  fileSize: number;
  format: string;
  fingerprint: string;
  playerCount: number;
  importedAt: string;
  status: "committed";
}

interface ImportJobRecord {
  id: string;
  saveId: string;
  datasetId: string;
  status: "staging" | "committed" | "failed";
  createdAt: string;
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

export interface SaveWithDatasets {
  save: SaveRecord;
  datasets: SeasonDatasetRecord[];
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

function makeId(): string {
  return crypto.randomUUID();
}

function playerField(row: Fm24RawPlayerRow, candidates: string[]): string {
  const key = Object.keys(row.values).find((header) => candidates.includes(header.toLocaleLowerCase()));
  return key ? row.values[key] ?? "" : "";
}

function databaseError(error: unknown): Error {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new Error("Your browser is running low on storage. Free space or remove unused site data, then try the import again. Existing saves have not been replaced.");
  }
  if (error instanceof Error) return error;
  return new Error("The local database operation failed. Your existing saves have not been changed.");
}

export function openLocalDatabase(): Promise<IDBDatabase> {
  if (!("indexedDB" in globalThis)) {
    return Promise.reject(new Error("This browser does not support IndexedDB. Use a current version of Chrome, Edge, Firefox or Safari."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("saves")) {
        const store = db.createObjectStore("saves", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("datasets")) {
        const store = db.createObjectStore("datasets", { keyPath: "id" });
        store.createIndex("saveId", "saveId");
        store.createIndex("saveFingerprint", ["saveId", "fingerprint"], { unique: true });
        store.createIndex("saveSeason", ["saveId", "seasonLabel"], { unique: true });
      }
      if (!db.objectStoreNames.contains("playerRecords")) {
        const store = db.createObjectStore("playerRecords", { keyPath: "id" });
        store.createIndex("datasetId", "datasetId");
        store.createIndex("importJobId", "importJobId");
        store.createIndex("saveUid", ["saveId", "uid"]);
        store.createIndex("datasetUid", ["datasetId", "uid"], { unique: true });
      }
      if (!db.objectStoreNames.contains("importJobs")) {
        const store = db.createObjectStore("importJobs", { keyPath: "id" });
        store.createIndex("saveId", "saveId");
        store.createIndex("status", "status");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage."));
    request.onblocked = () => reject(new Error("A previous Moneyball Companion tab is blocking a database update. Close other app tabs and reload."));
  });
}

export async function createSave(name: string, club = ""): Promise<SaveRecord> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Enter a name for this Football Manager save.");
  const db = await openLocalDatabase();
  const now = new Date().toISOString();
  const save: SaveRecord = {
    id: makeId(),
    name: cleanName,
    club: club.trim(),
    createdAt: now,
    updatedAt: now,
  };
  try {
    const transaction = db.transaction("saves", "readwrite");
    transaction.objectStore("saves").add(save);
    await transactionDone(transaction);
    return save;
  } catch (error) {
    throw databaseError(error);
  } finally {
    db.close();
  }
}

export async function listSaves(): Promise<SaveWithDatasets[]> {
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction(["saves", "datasets"], "readonly");
    const done = transactionDone(transaction);
    const [saves, datasets] = await Promise.all([
      requestResult(transaction.objectStore("saves").getAll() as IDBRequest<SaveRecord[]>),
      requestResult(transaction.objectStore("datasets").getAll() as IDBRequest<SeasonDatasetRecord[]>),
    ]);
    await done;
    return saves
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((save) => ({
        save,
        datasets: datasets.filter((dataset) => dataset.saveId === save.id && dataset.status === "committed")
          .sort((a, b) => b.importedAt.localeCompare(a.importedAt)),
      }));
  } finally {
    db.close();
  }
}

async function removeStagedRows(db: IDBDatabase, jobId: string): Promise<void> {
  const read = db.transaction("playerRecords", "readonly");
  const readDone = transactionDone(read);
  const keys = await requestResult(read.objectStore("playerRecords").index("importJobId").getAllKeys(IDBKeyRange.only(jobId)));
  await readDone;
  for (let offset = 0; offset < keys.length; offset += IMPORT_BATCH_SIZE) {
    const transaction = db.transaction("playerRecords", "readwrite");
    const store = transaction.objectStore("playerRecords");
    for (const key of keys.slice(offset, offset + IMPORT_BATCH_SIZE)) store.delete(key);
    await transactionDone(transaction);
  }
}

export async function persistSeasonImport(input: {
  saveId: string;
  seasonLabel: string;
  fileName: string;
  fileSize: number;
  format: string;
  fingerprint: string;
  rows: Fm24RawPlayerRow[];
}): Promise<SeasonDatasetRecord> {
  const seasonLabel = input.seasonLabel.trim();
  if (!seasonLabel) throw new Error("Enter a season label, for example 2026/27.");
  if (!input.rows.length) throw new Error("There are no valid player rows to save.");
  const db = await openLocalDatabase();
  const jobId = makeId();
  const datasetId = makeId();
  const now = new Date().toISOString();
  let staged = false;

  try {
    const save = await requestResult(db.transaction("saves", "readonly").objectStore("saves").get(input.saveId) as IDBRequest<SaveRecord | undefined>);
    if (!save) throw new Error("That save no longer exists. Refresh the save library and try again.");

    const check = db.transaction("datasets", "readonly");
    const checkDone = transactionDone(check);
    const datasetStore = check.objectStore("datasets");
    const duplicate = await requestResult(datasetStore.index("saveFingerprint").get([input.saveId, input.fingerprint]) as IDBRequest<SeasonDatasetRecord | undefined>);
    const sameSeason = await requestResult(datasetStore.index("saveSeason").get([input.saveId, seasonLabel]) as IDBRequest<SeasonDatasetRecord | undefined>);
    await checkDone;
    if (duplicate) throw new Error(`This exact file is already saved as season "${duplicate.seasonLabel}". Duplicate imports are blocked.`);
    if (sameSeason) throw new Error(`Season "${seasonLabel}" already exists in this save. Existing data is protected; explicit season replacement will be added separately.`);

    const job: ImportJobRecord = { id: jobId, saveId: input.saveId, datasetId, status: "staging", createdAt: now };
    const jobTransaction = db.transaction("importJobs", "readwrite");
    jobTransaction.objectStore("importJobs").add(job);
    await transactionDone(jobTransaction);

    for (let offset = 0; offset < input.rows.length; offset += IMPORT_BATCH_SIZE) {
      const transaction = db.transaction("playerRecords", "readwrite");
      const store = transaction.objectStore("playerRecords");
      for (const row of input.rows.slice(offset, offset + IMPORT_BATCH_SIZE)) {
        const uid = playerField(row, ["uid"]);
        const name = playerField(row, ["name", "player", "full name"]);
        store.add({
          id: `${datasetId}:${uid}`,
          saveId: input.saveId,
          datasetId,
          importJobId: jobId,
          uid,
          sourceLine: row.sourceLine,
          rawValues: row.values,
          displayName: name || `UID ${uid}`,
          club: playerField(row, ["club", "team"]),
          position: playerField(row, ["position", "positions"]),
        } satisfies PlayerSeasonRecord);
      }
      await transactionDone(transaction);
      staged = true;
    }

    const dataset: SeasonDatasetRecord = {
      id: datasetId,
      saveId: input.saveId,
      seasonLabel,
      fileName: input.fileName,
      fileSize: input.fileSize,
      format: input.format,
      fingerprint: input.fingerprint,
      playerCount: input.rows.length,
      importedAt: new Date().toISOString(),
      status: "committed",
    };

    const commit = db.transaction(["datasets", "importJobs", "saves"], "readwrite");
    commit.objectStore("datasets").add(dataset);
    commit.objectStore("importJobs").put({ ...job, status: "committed" } satisfies ImportJobRecord);
    commit.objectStore("saves").put({ ...save, updatedAt: dataset.importedAt });
    await transactionDone(commit);
    return dataset;
  } catch (error) {
    if (staged) {
      try {
        await removeStagedRows(db, jobId);
        const cleanup = db.transaction("importJobs", "readwrite");
        cleanup.objectStore("importJobs").put({
          id: jobId,
          saveId: input.saveId,
          datasetId,
          status: "failed",
          createdAt: now,
          error: error instanceof Error ? error.message : "Import failed",
        } satisfies ImportJobRecord);
        await transactionDone(cleanup);
      } catch {
        // Staged rows are not visible because no committed dataset references them.
      }
    }
    throw databaseError(error);
  } finally {
    db.close();
  }
}

export function formatStorageError(error: unknown): string {
  return databaseError(error).message;
}
