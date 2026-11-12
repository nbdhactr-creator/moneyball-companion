import "./styles.css";
import type { Fm24ParseResult, Fm24ValidationResult } from "./data/import/fm24-pipe-parser";

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
      parsed: Fm24ParseResult;
      validation: Fm24ValidationResult;
    };

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root was not found.");

let activeSection: Section = "Overview";
let importState: ImportState = { status: "idle" };
let importWorker: Worker | null = null;
let importRequestId = 0;

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => replacements[character] ?? character);
}

function render(): void {
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
          <span class="version">EARLY FOUNDATION · 0.1</span>
        </div>
      </aside>

      <main class="main-panel">
        <header class="topbar">
          <div class="breadcrumb"><span>Moneyball Companion</span><span class="crumb-divider">/</span><strong>${activeSection}</strong></div>
          <div class="topbar-right"><span class="save-chip"><span class="status-dot muted"></span>No save loaded</span></div>
        </header>
        <section class="page-content">
          <div class="page-heading">
            <div><div class="eyebrow">RECRUITMENT WORKSPACE</div><h1>${activeSection}</h1><p>${descriptions[activeSection]}</p></div>
            <span class="build-label">FOUNDATION BUILD</span>
          </div>
          ${activeSection === "Overview" ? overview() : sectionView(activeSection)}
        </section>
        <footer class="footer"><span>Evidence before decoration.</span><span>Player data stays yours.</span></footer>
      </main>
    </div>`;
}

function overview(): string {
  return `
    <section class="welcome-panel">
      <div class="welcome-copy">
        <div class="eyebrow">YOUR NEXT STEP</div>
        <h2>Start with your Football Manager data.</h2>
        <p>Import a save export to unlock squad analysis, role evaluation and recruitment markets. Your first workspace can stay entirely local.</p>
        <button class="primary-button" data-section="Data & Saves">Open Data &amp; Saves <span aria-hidden="true">→</span></button>
      </div>
      <div class="welcome-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="pitch"><span></span><i></i><b></b></div></div>
    </section>
    <div class="section-caption"><span>WORKSPACE MODULES</span><span>Ready to be built in sequence</span></div>
    <div class="module-grid">
      ${[
        ["01", "Squad", "Depth, positional cover and player profiles", "Users start with their own squad data."],
        ["02", "Scouting", "Role fit, candidate discovery and comparison", "Evidence-led player evaluation."],
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
    <div class="principle-strip"><span class="principle-mark">i</span><p><strong>No demo numbers.</strong> This workspace will not invent player rankings or squad metrics. Analysis appears only after real data has been imported and validated.</p></div>`;
}

function importStatusView(): string {
  if (importState.status === "idle") return "";
  if (importState.status === "processing") {
    return `
      <section class="content-card import-result" aria-live="polite">
        <div class="processing-line"><span class="processing-spinner"></span><div><strong>Checking ${escapeHtml(importState.fileName)}</strong><p>Reading and validating the export in a background worker.</p></div></div>
      </section>`;
  }
  if (importState.status === "error") {
    return `
      <section class="content-card import-result error-result" aria-live="polite">
        <div class="result-heading"><div><div class="card-kicker">IMPORT CHECK FAILED</div><h2>${escapeHtml(importState.fileName)}</h2></div><span class="result-pill error-pill">Read error</span></div>
        <p>${escapeHtml(importState.message)}</p>
      </section>`;
  }

  const { parsed, validation, fileName, fileSize } = importState;
  const previewRows = validation.validRows.length > 0 ? validation.validRows : parsed.rows;
  const previewHeaders = ["UID", "Name", "Position", "Age", "Club", "Division"].filter((header) => parsed.headers.includes(header));
  const visibleIssues = validation.issues.slice(0, 8);
  const sizeLabel = fileSize < 1024 * 1024
    ? `${(fileSize / 1024).toFixed(1)} KB`
    : `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;

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
        <span>${validation.canImport ? "The next stage will add field normalisation and local persistence." : "Resolve the reported errors and select the corrected export again."}</span>
      </div>
      ${visibleIssues.length ? `
        <div class="issue-list">
          <div class="issue-list-heading">Validation issues (${validation.issues.length})</div>
          ${visibleIssues.map((issue) => `
            <div class="issue-row"><span class="issue-marker ${issue.severity === "error" ? "issue-marker-error" : ""}"></span><div><strong>${escapeHtml(issue.code.replace(/-/g, " "))}</strong><span>${issue.line ? `Line ${issue.line}: ` : ""}${escapeHtml(issue.message)}</span></div></div>`).join("")}
          ${validation.issues.length > visibleIssues.length ? `<div class="more-issues">And ${validation.issues.length - visibleIssues.length} more issues.</div>` : ""}
        </div>` : ""}
      ${previewRows.length && previewHeaders.length ? `
        <div class="preview-heading"><strong>Player preview</strong><span>First ${Math.min(8, previewRows.length)} rows · source values</span></div>
        <div class="preview-table-wrap"><table class="preview-table"><thead><tr>${previewHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>
          ${previewRows.slice(0, 8).map((row) => `<tr>${previewHeaders.map((header) => `<td>${escapeHtml(row.values[header] ?? "") || '<span class="empty-cell">—</span>'}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>` : ""}
      <p class="persistence-disclaimer">Preview only. Nothing has been saved to this browser yet. Do not close the page expecting this file to be stored.</p>
    </section>`;
}

function dataSavesView(): string {
  return `
    <div class="data-layout">
      <section class="content-card import-card">
        <div class="card-kicker">FM24 DATA WORKFLOW</div><h2>Validate a player export</h2>
        <p>Select the original Football Manager export. The first supported format is the quoted pipe-table export identified from your sample. The file is processed locally in your browser.</p>
        <label class="file-dropzone" for="fm24-file-input">
          <input id="fm24-file-input" class="file-input" type="file" accept=".csv,.txt,text/csv,text/plain" data-fm24-file>
          <span class="upload-symbol">↑</span>
          <strong>Select FM24 export</strong>
          <span>Choose the original .csv file · no upload to a server</span>
        </label>
        <div class="muted-note">Your original file is not modified or sent to GitHub. This stage validates only; permanent saving is not implemented yet.</div>
      </section>
      <section class="content-card storage-card">
        <div class="card-kicker">LOCAL STORAGE</div><h2>Designed for large saves</h2>
        <div class="storage-row"><span>Player and season data</span><strong>IndexedDB · planned</strong></div>
        <div class="storage-row"><span>Large imports</span><strong>Background worker</strong></div>
        <div class="storage-row"><span>Facepack images</span><strong>Local folder reference</strong></div>
        <div class="storage-row"><span>Cloud sync</span><strong>Optional · planned</strong></div>
        <p class="storage-footnote">Your facepack remains in its original folder. The app will not copy facepack binaries into the repository or cloud by default.</p>
      </section>
    </div>
    ${importStatusView()}
    <section class="content-card roadmap-card"><div class="card-kicker">DATA SAFETY</div><h2>Validation comes before persistence</h2><p>Player identity, row structure and missing-value handling must be checked before a dataset can be saved. This preview does not create a save or modify existing data.</p></section>`;
}

function sectionView(section: Section): string {
  if (section === "Data & Saves") return dataSavesView();
  return `
    <section class="empty-workspace content-card">
      <span class="empty-icon">◎</span><div class="card-kicker">MODULE FOUNDATION</div>
      <h2>${section} is mapped, not populated yet.</h2>
      <p>${descriptions[section]} This module will be connected to validated save data rather than filled with sample players or fabricated metrics.</p>
      <button class="secondary-button" data-section="Data & Saves">Go to Data &amp; Saves <span aria-hidden="true">→</span></button>
    </section>`;
}

function validateFileInWorker(file: File): void {
  importWorker?.terminate();
  const requestId = ++importRequestId;
  importState = { status: "processing", fileName: file.name };
  render();

  try {
    const worker = new Worker(new URL("./data/import/fm24-import.worker.ts", import.meta.url), { type: "module" });
    importWorker = worker;

    worker.onmessage = (event: MessageEvent<{
      type: "complete" | "error";
      requestId: number;
      fileName?: string;
      fileSize?: number;
      parsed?: Fm24ParseResult;
      validation?: Fm24ValidationResult;
      message?: string;
    }>) => {
      const message = event.data;
      if (message.requestId !== importRequestId) return;

      worker.terminate();
      if (importWorker === worker) importWorker = null;

      if (message.type === "complete" && message.parsed && message.validation) {
        importState = {
          status: "complete",
          fileName: message.fileName ?? file.name,
          fileSize: message.fileSize ?? file.size,
          parsed: message.parsed,
          validation: message.validation,
        };
      } else {
        importState = {
          status: "error",
          fileName: file.name,
          message: message.message ?? "The file could not be processed.",
        };
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
    importState = {
      status: "error",
      fileName: file.name,
      message: error instanceof Error ? error.message : "The import worker could not be started.",
    };
    render();
  }
}

app.addEventListener("click", (event: MouseEvent) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-section]");
  const next = target?.dataset.section as Section | undefined;
  if (next && sections.includes(next)) {
    activeSection = next;
    render();
  }
});

app.addEventListener("change", (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.matches("[data-fm24-file]")) return;
  const file = target.files?.[0];
  if (file) validateFileInWorker(file);
});

render();
