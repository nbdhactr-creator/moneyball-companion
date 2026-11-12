import "./styles.css";
import type { Fm24ParseResult, Fm24ValidationResult } from "./data/import/fm24-pipe-parser";
import {
  createSave as createLocalSave,
  formatStorageError,
  listSaves,
  persistSeasonImport,
  recoverInterruptedImports,
  type SaveWithDatasets,
} from "./data/storage/local-database";

type Section = "Overview" | "Squad" | "Scouting" | "Market" | "Intelligence" | "Planning" | "Data & Saves";
const sections: Section[] = ["Overview", "Squad", "Scouting", "Market", "Intelligence", "Planning", "Data & Saves"];
const descriptions: Record<Section, string> = {
  Overview: "Your recruitment workspace, organised around the decisions that matter.",
  Squad: "Understand squad balance, positional cover and player evidence.",
  Scouting: "Find players by role, compare evidence and build shortlists.",
  Market: "Track expiring contracts, free transfers and emerging youth.",
  Intelligence: "Put clubs, leagues and player performance into context.",
  Planning: "Test squad changes before committing to a recruitment decision.",
  "Data & Saves": "Manage imports, local data, backups and optional cloud sync.",
};

type ImportState =
  | { status: "idle" }
  | { status: "processing"; fileName: string }
  | { status: "error"; fileName: string; message: string }
  | {
      status: "complete";
      fileName: string;
      fileSize: number;
      fingerprint: string;
      parsed: Fm24ParseResult;
      validation: Fm24ValidationResult;
    };

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root was not found.");

let activeSection: Section = "Overview";
let importState: ImportState = { status: "idle" };
let importWorker: Worker | null = null;
let importRequestId = 0;
let saveLibrary: SaveWithDatasets[] = [];
const ACTIVE_SAVE_STORAGE_KEY = "moneyball-companion:active-save";
function readActiveSaveId(): string | null {
  try { return localStorage.getItem(ACTIVE_SAVE_STORAGE_KEY); } catch { return null; }
}
function persistActiveSaveId(saveId: string | null): void {
  try {
    if (saveId) localStorage.setItem(ACTIVE_SAVE_STORAGE_KEY, saveId);
    else localStorage.removeItem(ACTIVE_SAVE_STORAGE_KEY);
  } catch {
    // Save selection remains usable for this session if browser storage is unavailable.
  }
}
let activeSaveId: string | null = readActiveSaveId();
let saveMessage = "";
let saveMessageIsError = false;
let isPersisting = false;

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => replacements[character] ?? character);
}

function activeSave(): SaveWithDatasets | undefined {
  return saveLibrary.find((entry) => entry.save.id === activeSaveId);
}

function render(): void {
  const selectedSave = activeSave();
  app!.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Main navigation">
        <a class="brand" href="#overview" aria-label="Moneyball Companion home">
          <span class="brand-mark">M</span>
          <span class="brand-copy"><strong>Moneyball</strong><small>COMPANION</small></span>
        </a>
        <div class="workspace-label">WORKSPACE</div>
        <nav class="nav-list">
          ${sections.map((section) => `
            <button class="nav-item ${activeSection === section ? "active" : ""}" data-section="${section}" ${activeSection === section ? 'aria-current="page"' : ""}>
              <span class="nav-indicator"></span><span>${section}</span>
            </button>`).join("")}
        </nav>
        <div class="sidebar-bottom">
          <div class="local-status"><span class="status-dot"></span><span>Local-first workspace</span></div>
          <span class="version">FOUNDATION BUILD · 0.2</span>
        </div>
      </aside>
      <main class="main-panel">
        <header class="topbar">
          <div class="breadcrumb"><span>Moneyball Companion</span><span class="crumb-divider">/</span><strong>${activeSection}</strong></div>
          <div class="topbar-right"><span class="save-chip"><span class="status-dot ${selectedSave ? "" : "muted"}"></span>${selectedSave ? escapeHtml(selectedSave.save.name) : "No save selected"}</span></div>
        </header>
        <section class="page-content">
          <div class="page-heading">
            <div><div class="eyebrow">RECRUITMENT WORKSPACE</div><h1>${activeSection}</h1><p>${descriptions[activeSection]}</p></div>
            <span class="build-label">LOCAL DATA FOUNDATION</span>
          </div>
          ${activeSection === "Overview" ? overview() : sectionView(activeSection)}
        </section>
        <footer class="footer"><span>Evidence before decoration.</span><span>Player data stays yours.</span></footer>
      </main>
    </div>`;
}

function overview(): string {
  const selected = activeSave();
  return `
    <section class="welcome-panel">
      <div class="welcome-copy">
        <div class="eyebrow">${selected ? "ACTIVE CAREER" : "YOUR NEXT STEP"}</div>
        <h2>${selected ? escapeHtml(selected.save.name) : "Start with your Football Manager data."}</h2>
        <p>${selected
          ? `${selected.datasets.length} season dataset(s) stored locally. Select Data & Saves to import another season or manage your save library.`
          : "Create a save container, then import a validated season export. Your data stays in this browser unless you choose to back it up."}</p>
        <button class="primary-button" data-section="Data & Saves">${selected ? "Manage save data" : "Create your first save"} <span aria-hidden="true">→</span></button>
      </div>
      <div class="welcome-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="pitch"><span></span><i></i><b></b></div></div>
    </section>
    <div class="section-caption"><span>WORKSPACE MODULES</span><span>Built around real save data</span></div>
    <div class="module-grid">
      ${[
        ["01", "Squad", "Depth, positional cover and player profiles", "Season-aware squad analysis."],
        ["02", "Scouting", "Role fit, candidate discovery and comparison", "Direct search and persistent decisions."],
        ["03", "Market", "Contract windows, free agents and youth", "Separate markets, clear eligibility."],
        ["04", "Intelligence", "League context, club comparison and benchmarks", "Understand performance in context."],
        ["05", "Planning", "Recruitment priorities and squad scenarios", "See the consequences of each move."],
        ["06", "Data & Saves", "Imports, data quality and backup controls", "Local storage first, cloud optional."]
      ].map(([number, title, summary, note]) => `
        <button class="module-card" data-section="${title}">
          <span class="module-top"><span class="module-number">${number}</span><span class="module-arrow">↗</span></span>
          <strong>${title}</strong><span class="module-summary">${summary}</span><small>${note}</small>
        </button>`).join("")}
    </div>
    <div class="principle-strip"><span class="principle-mark">i</span><p><strong>No demo numbers.</strong> Analysis appears only after real data has been imported, validated and stored.</p></div>`;
}

function saveLibraryView(): string {
  if (!saveLibrary.length) {
    return '<div class="empty-save-state">No saves yet. Create a save above to start organising your Football Manager seasons.</div>';
  }
  return `
    <div class="save-list">
      ${saveLibrary.map(({ save, datasets }) => `
        <article class="save-list-item ${save.id === activeSaveId ? "selected" : ""}">
          <div class="save-list-main">
            <strong>${escapeHtml(save.name)}</strong>
            <span>${save.club ? escapeHtml(save.club) + " · " : ""}${datasets.length} season dataset(s)</span>
            <small>Updated ${new Date(save.updatedAt).toLocaleDateString()}</small>
          </div>
          <button class="secondary-button compact-button" data-select-save="${save.id}">${save.id === activeSaveId ? "Selected" : "Open save"}</button>
        </article>`).join("")}
    </div>`;
}

function datasetListView(): string {
  const selected = activeSave();
  if (!selected) return '<p class="storage-footnote">Select a save to see its imported seasons.</p>';
  if (!selected.datasets.length) return '<p class="storage-footnote">No seasons imported into this save yet.</p>';
  return `
    <div class="dataset-list">
      ${selected.datasets.map((dataset) => `
        <div class="dataset-list-item">
          <div><strong>${escapeHtml(dataset.seasonLabel)}</strong><span>${dataset.playerCount.toLocaleString()} players · ${escapeHtml(dataset.fileName)}</span></div>
          <small>${new Date(dataset.importedAt).toLocaleDateString()}</small>
        </div>`).join("")}
    </div>`;
}

function importStatusView(): string {
  if (importState.status === "idle") return "";
  if (importState.status === "processing") {
    return `<section class="content-card import-result" aria-live="polite"><div class="processing-line"><span class="processing-spinner"></span><div><strong>Checking ${escapeHtml(importState.fileName)}</strong><p>Reading, fingerprinting and validating the export in a background worker.</p></div></div></section>`;
  }
  if (importState.status === "error") {
    return `<section class="content-card import-result error-result" aria-live="polite"><div class="result-heading"><div><div class="card-kicker">IMPORT CHECK FAILED</div><h2>${escapeHtml(importState.fileName)}</h2></div><span class="result-pill error-pill">Read error</span></div><p>${escapeHtml(importState.message)}</p></section>`;
  }

  const { parsed, validation, fileName, fileSize } = importState;
  const previewRows = validation.validRows.length > 0 ? validation.validRows : parsed.rows;
  const previewHeaders = ["UID", "Name", "Position", "Age", "Club", "Division"].filter((header) => parsed.headers.includes(header));
  const visibleIssues = validation.issues.slice(0, 8);
  const sizeLabel = fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
  const options = saveLibrary.map(({ save }) => `<option value="${save.id}" ${save.id === activeSaveId ? "selected" : ""}>${escapeHtml(save.name)}</option>`).join("");

  return `
    <section class="content-card import-result" aria-live="polite">
      <div class="result-heading">
        <div><div class="card-kicker">FILE VALIDATION REPORT</div><h2>${escapeHtml(fileName)}</h2><span class="file-meta">${sizeLabel} · ${escapeHtml(parsed.format)}</span></div>
        <span class="result-pill ${validation.canImport ? "success-pill" : "error-pill"}">${validation.canImport ? "Validation passed" : "Import blocked"}</span>
      </div>
      <div class="import-metrics">
        <div><strong>${parsed.headers.length}</strong><span>Columns detected</span></div>
        <div><strong>${validation.summary.sourceRows}</strong><span>Source rows</span></div>
        <div><strong>${validation.summary.validRows}</strong><span>Valid player rows</span></div>
        <div><strong>${validation.summary.invalidRows}</strong><span>Excluded rows</span></div>
      </div>
      <div class="validation-note ${validation.canImport ? "validation-note-good" : "validation-note-error"}">
        <strong>${validation.canImport ? "The file passed structural and UID checks." : "This file cannot be imported safely yet."}</strong>
        <span>${validation.canImport ? "Review the preview, choose a save and label this season before committing it to local storage." : "Resolve the reported errors and select the corrected export again."}</span>
      </div>
      ${visibleIssues.length ? `
        <div class="issue-list"><div class="issue-list-heading">Validation issues (${validation.issues.length})</div>
          ${visibleIssues.map((issue) => `<div class="issue-row"><span class="issue-marker ${issue.severity === "error" ? "issue-marker-error" : ""}"></span><div><strong>${escapeHtml(issue.code.replace(/-/g, " "))}</strong><span>${issue.line ? `Line ${issue.line}: ` : ""}${escapeHtml(issue.message)}</span></div></div>`).join("")}
          ${validation.issues.length > visibleIssues.length ? `<div class="more-issues">And ${validation.issues.length - visibleIssues.length} more issues.</div>` : ""}
        </div>` : ""}
      ${previewRows.length && previewHeaders.length ? `
        <div class="preview-heading"><strong>Player preview</strong><span>First ${Math.min(8, previewRows.length)} rows · source values</span></div>
        <div class="preview-table-wrap"><table class="preview-table"><thead><tr>${previewHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>
          ${previewRows.slice(0, 8).map((row) => `<tr>${previewHeaders.map((header) => `<td>${escapeHtml(row.values[header] ?? "") || '<span class="empty-cell">—</span>'}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>` : ""}
      ${validation.canImport ? `
        <form class="persist-import-form" data-persist-import>
          <div class="form-field"><label for="import-save">Save destination</label><select id="import-save" name="saveId" required>${options}</select></div>
          <div class="form-field"><label for="season-label">Season label</label><input id="season-label" name="seasonLabel" type="text" placeholder="e.g. 2026/27" maxlength="40" required></div>
          <button class="primary-button" type="submit" ${isPersisting || !saveLibrary.length ? "disabled" : ""}>${isPersisting ? "Saving season…" : "Save validated season"}</button>
          ${!saveLibrary.length ? '<span class="form-help">Create a save before importing a season.</span>' : '<span class="form-help">Existing seasons are protected. Duplicate files and duplicate season labels are blocked.</span>'}
        </form>` : ""}
      <p class="persistence-disclaimer">The preview is temporary until you save it. The original export remains unchanged; player rows are stored locally in IndexedDB.</p>
    </section>`;
}

function dataSavesView(): string {
  return `
    <section class="content-card save-manager-card">
      <div class="card-kicker">CAREER LIBRARY</div><h2>Your Football Manager saves</h2>
      <p>Create one container per career. Each save can hold multiple season exports, while each imported season remains a separate snapshot.</p>
      <form class="create-save-form" data-create-save>
        <div class="form-field"><label for="save-name">Save name</label><input id="save-name" name="name" type="text" maxlength="80" placeholder="e.g. Hull City Moneyball" required></div>
        <div class="form-field"><label for="save-club">Current club <span>(optional)</span></label><input id="save-club" name="club" type="text" maxlength="80" placeholder="e.g. Hull City"></div>
        <button class="primary-button" type="submit">Create save</button>
      </form>
      ${saveMessage ? `<div class="save-feedback ${saveMessageIsError ? "feedback-error" : "feedback-success"}" role="status">${escapeHtml(saveMessage)}</div>` : ""}
      <div class="save-list-heading"><strong>Saved careers</strong><span>${saveLibrary.length} total</span></div>
      ${saveLibraryView()}
    </section>
    <div class="data-layout">
      <section class="content-card import-card">
        <div class="card-kicker">FM24 DATA WORKFLOW</div><h2>Import a season export</h2>
        <p>Select the original Football Manager export. The supported format is the quoted pipe-table export identified from the supplied FM24 sample. Parsing and validation happen locally.</p>
        <label class="file-dropzone" for="fm24-file-input">
          <input id="fm24-file-input" class="file-input" type="file" accept=".csv,.txt,text/csv,text/plain" data-fm24-file>
          <span class="upload-symbol">↑</span><strong>Select FM24 export</strong><span>Choose the original .csv file · no server upload</span>
        </label>
        <div class="muted-note">A successful validation is not a saved season. Review the report and explicitly commit it to a save.</div>
      </section>
      <section class="content-card storage-card">
        <div class="card-kicker">ACTIVE SAVE</div><h2>${activeSave() ? escapeHtml(activeSave()!.save.name) : "No save selected"}</h2>
        ${activeSave() ? `<div class="storage-row"><span>Current club</span><strong>${escapeHtml(activeSave()!.save.club || "Not specified")}</strong></div><div class="storage-row"><span>Season datasets</span><strong>${activeSave()!.datasets.length}</strong></div>` : '<p class="storage-footnote">Select or create a save to begin.</p>'}
        ${datasetListView()}
        <p class="storage-footnote">Player source rows are stored in IndexedDB. The browser profile owns this data; clearing site data or changing browser/device can remove access. Backups and restore are the next data-safety milestone.</p>
      </section>
    </div>
    ${importStatusView()}
    <section class="content-card roadmap-card"><div class="card-kicker">DATA SAFETY</div><h2>Existing seasons are not overwritten</h2><p>Imports are written in batches as staged records. A season becomes visible only after all player rows have been stored and its dataset metadata is committed. Failed imports are cleaned up where possible and never replace an existing season.</p></section>`;
}

function sectionView(section: Section): string {
  if (section === "Data & Saves") return dataSavesView();
  return `
    <section class="empty-workspace content-card">
      <span class="empty-icon">◎</span><div class="card-kicker">MODULE FOUNDATION</div>
      <h2>${section} is mapped, not populated yet.</h2>
      <p>${descriptions[section]} This module will be connected to validated, persisted save data rather than filled with sample players or fabricated metrics.</p>
      <button class="secondary-button" data-section="Data & Saves">Go to Data &amp; Saves <span aria-hidden="true">→</span></button>
    </section>`;
}

function validateFileInWorker(file: File): void {
  importWorker?.terminate();
  const requestId = ++importRequestId;
  importState = { status: "processing", fileName: file.name };
  saveMessage = "";
  render();

  try {
    const worker = new Worker(new URL("./data/import/fm24-import.worker.ts", import.meta.url), { type: "module" });
    importWorker = worker;
    worker.onmessage = (event: MessageEvent<{
      type: "complete" | "error";
      requestId: number;
      fileName?: string;
      fileSize?: number;
      fingerprint?: string;
      parsed?: Fm24ParseResult;
      validation?: Fm24ValidationResult;
      message?: string;
    }>) => {
      const message = event.data;
      if (message.requestId !== importRequestId) return;
      worker.terminate();
      if (importWorker === worker) importWorker = null;
      if (message.type === "complete" && message.parsed && message.validation && message.fingerprint) {
        importState = {
          status: "complete",
          fileName: message.fileName ?? file.name,
          fileSize: message.fileSize ?? file.size,
          fingerprint: message.fingerprint,
          parsed: message.parsed,
          validation: message.validation,
        };
      } else {
        importState = { status: "error", fileName: file.name, message: message.message ?? "The file could not be processed." };
      }
      render();
    };
    worker.onerror = () => {
      worker.terminate();
      if (importWorker === worker) importWorker = null;
      importState = { status: "error", fileName: file.name, message: "The background import worker failed." };
      render();
    };
    worker.postMessage({ requestId, file });
  } catch (error) {
    importState = { status: "error", fileName: file.name, message: error instanceof Error ? error.message : "The import worker could not be started." };
    render();
  }
}

async function refreshSaveLibrary(): Promise<void> {
  try {
    await recoverInterruptedImports();
    saveLibrary = await listSaves();
    if (activeSaveId && !saveLibrary.some((entry) => entry.save.id === activeSaveId)) activeSaveId = null;
    if (!activeSaveId && saveLibrary.length) activeSaveId = saveLibrary[0].save.id;
    persistActiveSaveId(activeSaveId);
  } catch (error) {
    saveMessage = formatStorageError(error);
    saveMessageIsError = true;
  }
  render();
}

app.addEventListener("click", (event: MouseEvent) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-section], [data-select-save]");
  const next = target?.dataset.section as Section | undefined;
  if (next && sections.includes(next)) {
    activeSection = next;
    render();
    return;
  }
  const saveId = target?.dataset.selectSave;
  if (saveId) {
    activeSaveId = saveId;
    persistActiveSaveId(activeSaveId);
    saveMessage = "";
    render();
  }
});

app.addEventListener("change", (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.matches("[data-fm24-file]")) return;
  const file = target.files?.[0];
  if (file) validateFileInWorker(file);
});

app.addEventListener("submit", async (event: SubmitEvent) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  if (form.matches("[data-create-save]")) {
    event.preventDefault();
    const data = new FormData(form);
    try {
      const save = await createLocalSave(String(data.get("name") ?? ""), String(data.get("club") ?? ""));
      saveLibrary = await listSaves();
      activeSaveId = save.id;
      persistActiveSaveId(activeSaveId);
      saveMessage = `Save "${save.name}" created on this device.`;
      saveMessageIsError = false;
      form.reset();
    } catch (error) {
      saveMessage = formatStorageError(error);
      saveMessageIsError = true;
    }
    render();
    return;
  }

  if (form.matches("[data-persist-import]")) {
    event.preventDefault();
    if (importState.status !== "complete" || !importState.validation.canImport || isPersisting) return;
    const data = new FormData(form);
    const saveId = String(data.get("saveId") ?? "");
    const seasonLabel = String(data.get("seasonLabel") ?? "");
    isPersisting = true;
    saveMessage = "";
    render();
    try {
      const dataset = await persistSeasonImport({
        saveId,
        seasonLabel,
        fileName: importState.fileName,
        fileSize: importState.fileSize,
        format: importState.parsed.format,
        fingerprint: importState.fingerprint,
        rows: importState.validation.validRows,
      });
      saveLibrary = await listSaves();
      activeSaveId = saveId;
      persistActiveSaveId(activeSaveId);
      importState = { status: "idle" };
      saveMessage = `Season "${dataset.seasonLabel}" saved successfully: ${dataset.playerCount.toLocaleString()} player records stored locally.`;
      saveMessageIsError = false;
    } catch (error) {
      saveMessage = formatStorageError(error);
      saveMessageIsError = true;
    } finally {
      isPersisting = false;
    }
    render();
  }
});

void refreshSaveLibrary();
render();
