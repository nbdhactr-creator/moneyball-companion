import type { Fm24RawPlayerRow } from "../import/fm24-pipe-parser";

const DATABASE_NAME = "moneyball-companion";
const DATABASE_VERSION = 3;
const IMPORT_BATCH_SIZE = 400;


export type ScoutingFilterOperator = "contains" | "equals" | "gt" | "gte" | "lt" | "lte" | "is-empty" | "is-not-empty";
export interface ScoutingFilterCondition { id: string; field: string; operator: ScoutingFilterOperator; value: string; }
export type ShortlistStatus = "unreviewed" | "watching" | "shortlist" | "reject" | "signed" | "revisit";
export interface PlayerScoutingState { status: ShortlistStatus; note: string; tags: string[]; reviewDate: string; updatedAt: string; }
export interface SavedPlayerSearch {
  id: string; name: string; datasetId: string; query: string; logic: "and" | "or";
  filters: ScoutingFilterCondition[]; columns: string[]; sortField: string; sortDirection: "asc" | "desc"; updatedAt: string;
}
export interface ScoutingAnalysisSettings {
  roleId: string;
  philosophyTemplate: "" | "possession" | "counter" | "direct" | "balanced" | "lowblock" | "wing" | "positional" | "press" | "physical";
  roleWeight: number;
}
export interface ScoutingWorkspaceState {
  savedSearches: SavedPlayerSearch[];
  players: Record<string, PlayerScoutingState>;
  columnsByDataset: Record<string, string[]>;
  analysis?: ScoutingAnalysisSettings;
}
export interface ScoutingSearchResult { players: PlayerSeasonRecord[]; total: number; fields: string[]; }
export function emptyScoutingWorkspaceState(): ScoutingWorkspaceState {
  return { savedSearches: [], players: {}, columnsByDataset: {}, analysis: { roleId: "", philosophyTemplate: "", roleWeight: 0.7 } };
}

export interface SaveRecord {
  id: string;
  name: string;
  club: string;
  createdAt: string;
  updatedAt: string;
  scoutingState?: ScoutingWorkspaceState;
}

export interface SeasonDatasetRecord {
  id: string;
  saveId: string;
  seasonLabel: string;
  seasonKey: string;
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
  heartbeatAt?: string;
  error?: string;
}

export interface PlayerIdentityRecord {
  id: string;
  saveId: string;
  uid: string;
}

export interface PlayerSeasonRecord {
  id: string;
  saveId: string;
  datasetId: string;
  importJobId: string;
  uid: string;
  sourceLine: number;
  rawValues: Record<string, string>;
  displayName: string;
  normalizedName: string;
  club: string;
  position: string;
}

export interface PlayerSeasonHistoryEntry {
  dataset: SeasonDatasetRecord;
  player?: PlayerSeasonRecord;
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

function normalizePlayerName(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
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
        store.createIndex("saveSeason", ["saveId", "seasonKey"], { unique: true });
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
      // Version 2 adds a save-level player index so exports do not need to load
      // player rows belonging to every other career in the same browser.
      const playerStore = request.transaction!.objectStore("playerRecords");
      if (!playerStore.indexNames.contains("saveId")) playerStore.createIndex("saveId", "saveId");

      // Version 3 separates stable career-scoped identity from season rows.
      if (!db.objectStoreNames.contains("playerIdentities")) {
        const identities = db.createObjectStore("playerIdentities", { keyPath: "id" });
        identities.createIndex("saveId", "saveId");
        identities.createIndex("saveUid", ["saveId", "uid"], { unique: true });
      }
      if (!playerStore.indexNames.contains("datasetName")) {
        playerStore.createIndex("datasetName", ["datasetId", "normalizedName"]);
      }

      // Backfill identity rows and a searchable name key without changing source values.
      const cursorRequest = playerStore.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const player = cursor.value as PlayerSeasonRecord;
        const normalizedName = normalizePlayerName(player.displayName ?? "");
        if (player.normalizedName !== normalizedName) cursor.update({ ...player, normalizedName });
        if (player.saveId && player.uid) {
          request.transaction!.objectStore("playerIdentities").put({
            id: `${player.saveId}:${player.uid}`,
            saveId: player.saveId,
            uid: player.uid,
          } satisfies PlayerIdentityRecord);
        }
        cursor.continue();
      };
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

export async function recoverInterruptedImports(): Promise<number> {
  const db = await openLocalDatabase();
  let recovered = 0;
  try {
    const read = db.transaction("importJobs", "readonly");
    const readDone = transactionDone(read);
    const jobs = await requestResult(read.objectStore("importJobs").getAll() as IDBRequest<ImportJobRecord[]>);
    await readDone;

    const recoveryCutoff = Date.now() - 5 * 60 * 1000;
    const abandonedJobs = jobs.filter((entry) => entry.status === "staging" &&
      new Date(entry.heartbeatAt ?? entry.createdAt).getTime() < recoveryCutoff);

    for (const job of abandonedJobs) {
      await removeStagedRows(db, job.id);
      const transaction = db.transaction("importJobs", "readwrite");
      transaction.objectStore("importJobs").put({
        ...job,
        status: "failed",
        error: "The browser session ended before the season was committed. Staged rows were cleaned up on the next app launch.",
      } satisfies ImportJobRecord);
      await transactionDone(transaction);
      recovered += 1;
    }
    return recovered;
  } finally {
    db.close();
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
  const seasonKey = seasonLabel.toLowerCase();
  if (!seasonLabel) throw new Error("Enter a season label, for example 2026/27.");
  if (!input.rows.length) throw new Error("There are no valid player rows to save.");
  const db = await openLocalDatabase();
  const jobId = makeId();
  const datasetId = makeId();
  const now = new Date().toISOString();
  let jobCreated = false;

  try {
    const save = await requestResult(db.transaction("saves", "readonly").objectStore("saves").get(input.saveId) as IDBRequest<SaveRecord | undefined>);
    if (!save) throw new Error("That save no longer exists. Refresh the save library and try again.");

    const check = db.transaction("datasets", "readonly");
    const checkDone = transactionDone(check);
    const datasetStore = check.objectStore("datasets");
    const [duplicate, sameSeason] = await Promise.all([
      requestResult(datasetStore.index("saveFingerprint").get([input.saveId, input.fingerprint]) as IDBRequest<SeasonDatasetRecord | undefined>),
      requestResult(datasetStore.index("saveSeason").get([input.saveId, seasonKey]) as IDBRequest<SeasonDatasetRecord | undefined>),
    ]);
    await checkDone;
    if (duplicate) throw new Error(`This exact file is already saved as season "${duplicate.seasonLabel}". Duplicate imports are blocked.`);
    if (sameSeason) throw new Error(`Season "${seasonLabel}" already exists in this save. Existing data is protected; explicit season replacement will be added separately.`);

    const job: ImportJobRecord = { id: jobId, saveId: input.saveId, datasetId, status: "staging", createdAt: now, heartbeatAt: now };
    const jobTransaction = db.transaction("importJobs", "readwrite");
    jobTransaction.objectStore("importJobs").add(job);
    await transactionDone(jobTransaction);
    jobCreated = true;

    for (let offset = 0; offset < input.rows.length; offset += IMPORT_BATCH_SIZE) {
      const heartbeat = db.transaction("importJobs", "readwrite");
      heartbeat.objectStore("importJobs").put({ ...job, heartbeatAt: new Date().toISOString() } satisfies ImportJobRecord);
      await transactionDone(heartbeat);

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
          normalizedName: normalizePlayerName(name || `UID ${uid}`),
          position: playerField(row, ["position", "positions"]),
        } satisfies PlayerSeasonRecord);
      }
      await transactionDone(transaction);
    }

    const dataset: SeasonDatasetRecord = {
      id: datasetId,
      saveId: input.saveId,
      seasonLabel,
      seasonKey,
      fileName: input.fileName,
      fileSize: input.fileSize,
      format: input.format,
      fingerprint: input.fingerprint,
      playerCount: input.rows.length,
      importedAt: new Date().toISOString(),
      status: "committed",
    };

    const commit = db.transaction(["datasets", "importJobs", "saves", "playerIdentities"], "readwrite");
    commit.objectStore("datasets").add(dataset);
    commit.objectStore("importJobs").put({ ...job, status: "committed" } satisfies ImportJobRecord);
    commit.objectStore("saves").put({ ...save, updatedAt: dataset.importedAt });
    const identities = commit.objectStore("playerIdentities");
    for (const row of input.rows) {
      const uid = playerField(row, ["uid"]);
      identities.put({ id: `${input.saveId}:${uid}`, saveId: input.saveId, uid } satisfies PlayerIdentityRecord);
    }
    await transactionDone(commit);
    return dataset;
  } catch (error) {
    if (jobCreated) {
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


/** Prefix-searches one immutable season snapshot using its indexed, normalised player name. */
export async function searchPlayersInDataset(datasetId: string, query = "", limit = 100): Promise<PlayerSeasonRecord[]> {
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction("playerRecords", "readonly");
    const done = transactionDone(transaction);
    const prefix = normalizePlayerName(query);
    const range = prefix
      ? IDBKeyRange.bound([datasetId, prefix], [datasetId, `${prefix}\uffff`])
      : IDBKeyRange.bound([datasetId, ""], [datasetId, "\uffff"]);
    const results: PlayerSeasonRecord[] = [];
    await new Promise<void>((resolve, reject) => {
      const request = transaction.objectStore("playerRecords").index("datasetName").openCursor(range);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || results.length >= Math.max(1, limit)) {
          resolve();
          return;
        }
        results.push(cursor.value as PlayerSeasonRecord);
        cursor.continue();
      };
      request.onerror = () => reject(request.error ?? new Error("Player search failed."));
    });
    await done;
    return results;
  } finally {
    db.close();
  }
}

/** Returns every committed season, including explicit absence where a UID is not present. */
export async function getPlayerHistory(saveId: string, uid: string): Promise<PlayerSeasonHistoryEntry[]> {
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction(["datasets", "playerRecords", "playerIdentities"], "readonly");
    const done = transactionDone(transaction);
    const [datasets, records, identity] = await Promise.all([
      requestResult(transaction.objectStore("datasets").index("saveId").getAll(saveId) as IDBRequest<SeasonDatasetRecord[]>),
      requestResult(transaction.objectStore("playerRecords").index("saveUid").getAll([saveId, uid]) as IDBRequest<PlayerSeasonRecord[]>),
      requestResult(transaction.objectStore("playerIdentities").index("saveUid").get([saveId, uid]) as IDBRequest<PlayerIdentityRecord | undefined>),
    ]);
    await done;
    if (!identity) return [];
    const recordsByDataset = new Map(records.map((record) => [record.datasetId, record]));
    return datasets
      .filter((dataset) => dataset.status === "committed")
      .sort((a, b) => a.importedAt.localeCompare(b.importedAt) || a.seasonKey.localeCompare(b.seasonKey))
      .map((dataset) => ({
        dataset,
        ...(recordsByDataset.has(dataset.id) ? { player: recordsByDataset.get(dataset.id)! } : {}),
      }));
  } finally {
    db.close();
  }
}

/** Counts distinct career-scoped players rather than player-season rows. */
export async function countPlayerIdentities(saveId: string): Promise<number> {
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction("playerIdentities", "readonly");
    const done = transactionDone(transaction);
    const count = await requestResult(transaction.objectStore("playerIdentities").index("saveId").count(saveId));
    await done;
    return count;
  } finally {
    db.close();
  }
}

export function formatStorageError(error: unknown): string {
  return databaseError(error).message;
}

function scoutingFieldValue(player: PlayerSeasonRecord, field: string): string {
  if (field === "name") return player.displayName;
  if (field === "club") return player.club;
  if (field === "position") return player.position;
  if (field === "uid") return player.uid;
  return player.rawValues[field] ?? "";
}
function matchesScoutingFilter(player: PlayerSeasonRecord, filter: ScoutingFilterCondition): boolean {
  const actual = scoutingFieldValue(player, filter.field).trim();
  const expected = filter.value.trim();
  if (filter.operator === "is-empty") return actual === "" || actual === "-";
  if (filter.operator === "is-not-empty") return actual !== "" && actual !== "-";
  if (!actual || actual === "-" || !expected) return false;
  if (filter.operator === "contains") return actual.toLocaleLowerCase().includes(expected.toLocaleLowerCase());
  if (filter.operator === "equals") return actual.toLocaleLowerCase() === expected.toLocaleLowerCase();
  const left = Number(actual.replace(/,/g, ""));
  const right = Number(expected.replace(/,/g, ""));
  if (!expected || !Number.isFinite(left) || !Number.isFinite(right)) return false;
  if (filter.operator === "gt") return left > right;
  if (filter.operator === "gte") return left >= right;
  if (filter.operator === "lt") return left < right;
  if (filter.operator === "lte") return left <= right;
  return false;
}

/** Searches all records in one selected season; missing values never become numeric zero. */
export async function searchScoutingPlayers(input: {
  datasetId: string; query?: string; filters?: ScoutingFilterCondition[]; logic?: "and" | "or";
  sortField?: string; sortDirection?: "asc" | "desc"; offset?: number; limit?: number;
  scoreByUid?: ReadonlyMap<string, { roleScore: number | null; philosophyScore: number | null; tacticalFit: number | null }>;
}): Promise<ScoutingSearchResult> {
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction("playerRecords", "readonly");
    const done = transactionDone(transaction);
    const records = await requestResult(transaction.objectStore("playerRecords").index("datasetId").getAll(input.datasetId) as IDBRequest<PlayerSeasonRecord[]>);
    await done;
    const query = (input.query ?? "").normalize("NFKC").trim().toLocaleLowerCase();
    const filters = input.filters ?? [];
    const matched = records.filter((player) => {
      const queryMatch = !query || [player.displayName, player.club, player.position, ...Object.values(player.rawValues)]
        .some((value) => value.toLocaleLowerCase().includes(query));
      if (!queryMatch) return false;
      if (!filters.length) return true;
      return input.logic === "or"
        ? filters.some((filter) => matchesScoutingFilter(player, filter))
        : filters.every((filter) => matchesScoutingFilter(player, filter));
    });
    const field = input.sortField || "name";
    const direction = input.sortDirection === "desc" ? -1 : 1;
    matched.sort((a, b) => {
      const scoreField = field === "roleScore" || field === "philosophyScore" || field === "tacticalFit";
      const left = (scoreField ? String(input.scoreByUid?.get(a.uid)?.[field] ?? "") : scoutingFieldValue(a, field)).trim();
      const right = (scoreField ? String(input.scoreByUid?.get(b.uid)?.[field] ?? "") : scoutingFieldValue(b, field)).trim();
      if (!left && right) return 1;
      if (left && !right) return -1;
      const ln = Number(left.replace(/,/g, ""));
      const rn = Number(right.replace(/,/g, ""));
      const comparison = left && right && Number.isFinite(ln) && Number.isFinite(rn)
        ? ln - rn : left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
      return comparison * direction || a.uid.localeCompare(b.uid, undefined, { numeric: true });
    });
    const offset = Math.max(0, input.offset ?? 0);
    const limit = Math.min(500, Math.max(1, input.limit ?? 200));
    return { total: matched.length, players: matched.slice(offset, offset + limit), fields: records[0] ? Object.keys(records[0].rawValues) : [] };
  } catch (error) {
    throw databaseError(error);
  } finally { db.close(); }
}

/** Reads every row in one committed season. Used by the scoring Web Worker to build position-specific reference pools. */
export async function getDatasetPlayers(datasetId: string): Promise<PlayerSeasonRecord[]> {
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction("playerRecords", "readonly");
    const done = transactionDone(transaction);
    const records = await requestResult(
      transaction.objectStore("playerRecords").index("datasetId").getAll(datasetId) as IDBRequest<PlayerSeasonRecord[]>,
    );
    await done;
    return records;
  } catch (error) {
    throw databaseError(error);
  } finally {
    db.close();
  }
}

export async function getScoutingWorkspaceState(saveId: string): Promise<ScoutingWorkspaceState> {
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction("saves", "readonly");
    const done = transactionDone(transaction);
    const save = await requestResult(transaction.objectStore("saves").get(saveId) as IDBRequest<SaveRecord | undefined>);
    await done;
    return save?.scoutingState ?? emptyScoutingWorkspaceState();
  } finally { db.close(); }
}

export async function updateScoutingWorkspaceState(saveId: string, state: ScoutingWorkspaceState): Promise<void> {
  const db = await openLocalDatabase();
  try {
    const transaction = db.transaction("saves", "readwrite");
    const store = transaction.objectStore("saves");
    const save = await requestResult(store.get(saveId) as IDBRequest<SaveRecord | undefined>);
    if (!save) throw new Error("The active career could not be found. Refresh the save library and try again.");
    store.put({ ...save, scoutingState: state, updatedAt: new Date().toISOString() });
    await transactionDone(transaction);
  } catch (error) { throw databaseError(error); }
  finally { db.close(); }
}
