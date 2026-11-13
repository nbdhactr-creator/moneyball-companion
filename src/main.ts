import "./styles.css";
import "./scouting.css";
import "./squad.css";
import type { Fm24ParseResult, Fm24ValidationResult } from "./data/import/fm24-pipe-parser";
import {
  createSave as createLocalSave,
  formatStorageError,
  listSaves,
  persistSeasonImport,
  recoverInterruptedImports,
  searchPlayersInDataset,
  getPlayerHistory,
  type SaveWithDatasets,
  type PlayerSeasonRecord,
  type PlayerSeasonHistoryEntry,
} from "./data/storage/local-database";
import { createSaveBackup, restoreSaveBackup } from "./data/storage/save-backup";
import { loadScoutingWorkspace, renderScoutingWorkspace, renderPlanningWorkspace, loadPlanningWorkspace, handleScoutingWorkspaceClick, handleScoutingWorkspaceChange, refreshScoutingAnalysisSettings } from "./data/scouting-workspace";
import { renderSquadWorkspace, handleSquadWorkspaceClick, handleSquadWorkspaceChange, handleSquadWorkspaceInput, handleSquadWorkspacePointerDown, handleSquadWorkspacePointerMove, handleSquadWorkspacePointerUp } from "./data/squad-workspace";

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
let isBackingUp = false;
let isRestoring = false;
let squadDatasetId = "";
let squadSortField = "name";
let squadSortDirection: "asc" | "desc" = "asc";
let playerSearchQuery = "";
let playerSearchViewMode: "rows" | "cards" = "rows";
let playerSearchResults: PlayerSeasonRecord[] = [];
let selectedPlayerUid: string | null = null;
let playerHistory: PlayerSeasonHistoryEntry[] = [];
let historyComparePreviousId = "";
let historyCompareCurrentId = "";
let playerSearchMessage = "";
let isSearchingPlayers = false;
let isLoadingPlayerHistory = false;
let playerSearchRequestId = 0;
let playerHistoryRequestId = 0;

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


function resetPlayerWorkspace(): void {
  playerSearchRequestId += 1;
  playerHistoryRequestId += 1;
  squadDatasetId = "";
  playerSearchQuery = "";
  playerSearchResults = [];
  selectedPlayerUid = null;
  playerHistory = [];
  historyComparePreviousId = "";
  historyCompareCurrentId = "";
  playerSearchMessage = "";
  isSearchingPlayers = false;
  isLoadingPlayerHistory = false;
}

function displayRawValue(value: string | undefined): string {
  if (value === undefined || value.trim() === "" || value.trim() === "-") return "—";
  return value;
}

function playerProfileView(): string {
  if (!selectedPlayerUid) return "";
  const present = playerHistory.filter((entry) => entry.player);
  const latestPlayer = [...present].reverse()[0]?.player;
  if (!latestPlayer) return '<section class="content-card"><p>' + escapeHtml(playerSearchMessage || "This player has no season records in the active career.") + '</p><button class="secondary-button" data-player-back>Back to player search</button></section>';
  const previous = playerHistory.find((entry) => entry.dataset.id === historyComparePreviousId);
  const current = playerHistory.find((entry) => entry.dataset.id === historyCompareCurrentId) ?? playerHistory[playerHistory.length - 1];
  const previousLabel = previous?.dataset.seasonLabel ?? "Earlier season";
  const currentLabel = current?.dataset.seasonLabel ?? "Latest season";
  const sourcePlayers = [previous?.player, current?.player].filter((player): player is PlayerSeasonRecord => Boolean(player));
  const fields = [...new Set(sourcePlayers.flatMap((player) => Object.keys(player.rawValues)))].sort((a, b) => a.localeCompare(b));
  const profilePlayer = current?.player ?? latestPlayer;
  const valueFor = (candidates: string[]): string => {
    const key = Object.keys(profilePlayer.rawValues).find((field) => candidates.includes(field.trim().toLocaleLowerCase()));
    return key ? displayRawValue(profilePlayer.rawValues[key]) : "—";
  };
  const facts = [
    ["Age", ["age", "age (years)"]], ["Nationality", ["nationality", "nation"]],
    ["Division", ["division", "league"]], ["Height", ["height"]],
    ["Preferred foot", ["preferred foot", "foot"]], ["Value", ["transfer value", "value"]],
    ["Wage", ["wage", "salary"]], ["Contract expiry", ["contract expiry", "contract end"]],
  ].map(([label, candidates]) => ({ label: String(label), value: valueFor(candidates as string[]) })).filter((fact) => fact.value !== "—");
  const statGroups = [
    { title: "Attacking", fields: ["apps", "starts", "minutes", "goals", "assists", "xg", "xa", "shots", "key passes"] },
    { title: "Possession", fields: ["pass completion", "passes completed", "passes attempted", "progressive passes", "dribbles", "crosses"] },
    { title: "Defending", fields: ["tackles", "interceptions", "clearances", "blocks", "aerials won"] },
    { title: "Goalkeeping", fields: ["clean sheets", "save percentage", "saves", "goals conceded"] },
  ];
  const statSections = statGroups.map((group) => {
    const rows = fields.filter((field) => group.fields.some((candidate) => field.toLocaleLowerCase().includes(candidate)))
      .map((field) => '<div class="profile-source-stat"><span>' + escapeHtml(field) + '</span><strong>' + escapeHtml(displayRawValue(profilePlayer.rawValues[field])) + '</strong></div>').join("");
    return rows ? '<section class="profile-stat-group"><h4>' + group.title + '</h4><div>' + rows + '</div></section>' : "";
  }).join("");
  const historyRows = [...playerHistory].reverse().map((entry) =>
    '<div class="player-history-item ' + (entry.dataset.id === current?.dataset.id ? "is-current" : "") + '"><div><strong>' +
    escapeHtml(entry.dataset.seasonLabel) + '</strong><small>' +
    (entry.player ? (entry.player.club ? escapeHtml(entry.player.club) + " · " : "") + escapeHtml(entry.player.position || "Position not supplied") : "Player not present in this export") +
    '</small></div><span class="player-presence ' + (entry.player ? "present" : "absent") + '">' +
    (entry.player ? "Present" : "Not present") + '</span></div>').join("");
  const previousOptions = playerHistory.filter((entry) => entry.dataset.id !== historyCompareCurrentId)
    .map((entry) => '<option value="' + entry.dataset.id + '"' + (entry.dataset.id === historyComparePreviousId ? " selected" : "") + '>' + escapeHtml(entry.dataset.seasonLabel) + '</option>').join("");
  const currentOptions = playerHistory.map((entry) =>
    '<option value="' + entry.dataset.id + '"' + (entry.dataset.id === historyCompareCurrentId ? " selected" : "") + '>' + escapeHtml(entry.dataset.seasonLabel) + '</option>').join("");
  const comparison = previous && current
    ? '<p class="player-comparison-note">Compare two imported snapshots. A dash means blank or unavailable; zero remains zero. “Not present” means no player row existed in that export.</p><div class="player-table-wrap"><table class="player-data-table"><thead><tr><th>Source field</th><th>' + escapeHtml(previousLabel) + '</th><th>' + escapeHtml(currentLabel) + '</th></tr></thead><tbody>' +
      fields.map((field) => '<tr><th>' + escapeHtml(field) + '</th><td>' + (previous.player ? escapeHtml(displayRawValue(previous.player.rawValues[field])) : '<span class="not-present-value">Not present</span>') + '</td><td>' + (current.player ? escapeHtml(displayRawValue(current.player.rawValues[field])) : '<span class="not-present-value">Not present</span>') + '</td></tr>').join("") +
      '</tbody></table></div>'
    : '<p class="player-comparison-note">' + (playerHistory.length < 2 ? "Only one season has been imported for this career. Comparison will become available when another season is added." : "Choose an earlier season above to compare it with the selected season.") + '</p><div class="player-table-wrap"><table class="player-data-table single-season-table"><thead><tr><th>Source field</th><th>' + escapeHtml(currentLabel) + '</th></tr></thead><tbody>' +
      fields.map((field) => '<tr><th>' + escapeHtml(field) + '</th><td>' + escapeHtml(displayRawValue(current?.player?.rawValues[field])) + '</td></tr>').join("") +
      '</tbody></table></div>';
  return '<section class="player-profile-card">' +
    '<div class="player-profile-toolbar"><button class="text-button" data-player-back>← Back to player search</button><span class="card-kicker">PLAYER DOSSIER · FM UID ' + escapeHtml(selectedPlayerUid) + '</span></div>' +
    '<header class="player-profile-hero"><div class="player-avatar" aria-hidden="true">' + escapeHtml((profilePlayer.displayName || "P").trim().charAt(0).toUpperCase()) + '</div><div class="player-profile-identity"><div class="card-kicker">CAREER PLAYER RECORD</div><h2>' + escapeHtml(profilePlayer.displayName) + '</h2><p>' + escapeHtml(profilePlayer.position || "Position not supplied") + (profilePlayer.club ? " · " + escapeHtml(profilePlayer.club) : "") + '</p><span>Selected season: ' + escapeHtml(currentLabel) + '</span></div><div class="player-profile-season-count"><strong>' + present.length + '/' + playerHistory.length + '</strong><span>seasons present</span></div></header>' +
    (facts.length ? '<section class="profile-facts-grid" aria-label="Player information">' + facts.map((fact) => '<div><span>' + escapeHtml(fact.label) + '</span><strong>' + escapeHtml(fact.value) + '</strong></div>').join("") + '</section>' : "") +
    (statSections ? '<section class="player-history-section"><div class="player-section-heading"><strong>Season performance snapshot</strong><span>Original exported statistics · ' + escapeHtml(currentLabel) + '</span></div><div class="profile-stat-groups">' + statSections + '</div></section>' : "") +
    '<div class="player-history-section"><div class="player-section-heading"><strong>Career timeline</strong><span>' + present.length + ' of ' + playerHistory.length + ' imported seasons</span></div><div class="player-history-list">' + historyRows + '</div></div>' +
    '<div class="player-history-section"><div class="player-section-heading"><strong>Season comparison</strong><span>Original imported values · no calculated scores</span></div><div class="player-comparison-controls"><div class="form-field"><label for="history-previous">Earlier season</label><select id="history-previous" data-history-previous ' + (playerHistory.length < 2 ? "disabled" : "") + '><option value="">Choose earlier season</option>' + previousOptions + '</select></div><div class="form-field"><label for="history-current">Selected season</label><select id="history-current" data-history-current>' + currentOptions + '</select></div></div>' + comparison + '</div>' +
    '<details class="profile-raw-data"><summary>All source fields (' + fields.length + ')</summary><p>Unmodified values from the selected export. Missing values remain unavailable; zero is preserved.</p><div class="player-table-wrap"><table class="player-data-table"><thead><tr><th>Source field</th><th>' + escapeHtml(currentLabel) + '</th></tr></thead><tbody>' + fields.map((field) => '<tr><th>' + escapeHtml(field) + '</th><td>' + escapeHtml(displayRawValue(profilePlayer.rawValues[field])) + '</td></tr>').join("") + '</tbody></table></div></details>' +
    '<p class="player-data-footnote">This dossier presents source data and career history. No role score, percentile, league adjustment or performance judgement is fabricated when the required analysis is unavailable.</p></section>';
}

function squadPlayersView(): string {
  const selected = activeSave();
  if (!selected) return '<section class="empty-workspace content-card"><span class="empty-icon">◎</span><div class="card-kicker">SQUAD WORKSPACE</div><h2>Select or create a career first.</h2><p>Player search and season history use the real datasets stored in your selected career.</p><button class="secondary-button" data-section="Data & Saves">Go to Data &amp; Saves →</button></section>';
  if (!selected.datasets.length) return '<section class="empty-workspace content-card"><span class="empty-icon">◎</span><div class="card-kicker">SQUAD WORKSPACE</div><h2>No season data in this career yet.</h2><p>Import an FM24 export before searching players.</p><button class="secondary-button" data-section="Data & Saves">Import season data →</button></section>';
  if (!selected.datasets.some((dataset) => dataset.id === squadDatasetId)) squadDatasetId = selected.datasets[0].id;
  if (selectedPlayerUid) return isLoadingPlayerHistory ? '<section class="content-card"><div class="processing-line"><span class="processing-spinner"></span><div><strong>Loading player history</strong><p>Reading this player across the active career.</p></div></div></section>' : playerProfileView();
  const options = selected.datasets.map((dataset) => '<option value="' + dataset.id + '"' + (dataset.id === squadDatasetId ? " selected" : "") + '>' + escapeHtml(dataset.seasonLabel) + ' · ' + dataset.playerCount.toLocaleString() + ' players</option>').join("");
  const squadSortHeader = (field: string, title: string) => {
    const active = squadSortField === field;
    const indicator = active ? (squadSortDirection === "asc" ? "↑" : "↓") : "↕";
    return '<th aria-sort="' + (active ? (squadSortDirection === "asc" ? "ascending" : "descending") : "none") + '"><button type="button" class="table-sort-button' + (active ? " is-active" : "") + '" data-squad-sort-field="' + field + '" aria-label="Sort by ' + title + '">' + title + '<span aria-hidden="true">' + indicator + '</span></button></th>';
  };
  const resultRows = playerSearchResults.map((player) =>
    '<tr class="player-result-row" data-player-uid="' + escapeHtml(player.uid) + '"><td><button class="player-name-button" type="button">' + escapeHtml(player.displayName) + '</button></td><td>' + escapeHtml(player.position || "—") + '</td><td>' + escapeHtml(player.club || "—") + '</td><td class="uid-cell">' + escapeHtml(player.uid) + '</td></tr>').join("");
  const resultCards = playerSearchResults.map((player) =>
    '<button class="player-result-card" type="button" data-player-uid="' + escapeHtml(player.uid) + '"><span class="player-result-card-top"><span class="player-avatar" aria-hidden="true">' +
    escapeHtml((player.displayName || "P").trim().charAt(0).toUpperCase()) + '</span><span class="player-result-open">Open profile ↗</span></span><strong>' +
    escapeHtml(player.displayName) + '</strong><span>' + escapeHtml(player.position || "Position not supplied") + '</span><small>' +
    escapeHtml(player.club || "Club not supplied") + ' · UID ' + escapeHtml(player.uid) + '</small></button>').join("");
  return '<section class="content-card squad-search-card"><div class="card-kicker">CAREER PLAYER DATABASE</div><h2>Find a player and inspect their dossier</h2><p>Search the selected season, then open any result to see the player’s imported data and history across this career.</p>' +
    '<div class="squad-search-controls"><div class="form-field"><label for="squad-dataset">Season dataset</label><select id="squad-dataset" data-squad-dataset>' + options + '</select></div><form class="player-search-form" data-player-search><div class="form-field"><label for="player-search-query">Player name</label><input id="player-search-query" name="query" type="search" maxlength="100" value="' + escapeHtml(playerSearchQuery) + '" placeholder="Start typing a player name"></div><button class="primary-button" type="submit" ' + (isSearchingPlayers ? "disabled" : "") + '>' + (isSearchingPlayers ? "Searching…" : "Search players") + '</button></form></div>' +
    '<div class="player-search-toolbar"><div class="player-search-meta"><span>Indexed search · first 100 matches · ' + escapeHtml(selected.datasets.find((dataset) => dataset.id === squadDatasetId)?.seasonLabel ?? "") + '</span><span>' + (playerSearchResults.length ? playerSearchResults.length + " result(s)" : "") + '</span></div><div class="player-view-toggle" role="group" aria-label="Player results layout"><button type="button" data-player-view="rows" class="' + (playerSearchViewMode === "rows" ? "active" : "") + '" aria-pressed="' + (playerSearchViewMode === "rows") + '">Rows</button><button type="button" data-player-view="cards" class="' + (playerSearchViewMode === "cards" ? "active" : "") + '" aria-pressed="' + (playerSearchViewMode === "cards") + '">Cards</button></div></div>' +
    (playerSearchMessage ? '<p class="player-search-message" role="status">' + escapeHtml(playerSearchMessage) + '</p>' : "") +
    (playerSearchResults.length ? (playerSearchViewMode === "rows" ? '<div class="player-table-wrap"><table class="player-data-table player-results-table"><thead><tr>' + squadSortHeader("name", "Player") + squadSortHeader("position", "Position") + squadSortHeader("club", "Club") + squadSortHeader("uid", "FM UID") + '</tr></thead><tbody>' + resultRows + '</tbody></table></div>' : '<div class="player-results-grid">' + resultCards + '</div>') :
      '<div class="player-search-empty">' + (isSearchingPlayers ? "Searching the selected season…" : "Search for a player to open their career dossier. The search reads the selected season only.") + '</div>') +
    '</section><p class="player-data-footnote">Player identity is matched only by FM UID within this career. Names are used for finding players, never for merging them. Select a row or card to open the profile.</p>';
}

async function runPlayerSearch(): Promise<void> {
  const selected = activeSave();
  if (!selected || !squadDatasetId) return;
  const requestId = ++playerSearchRequestId;
  const saveId = selected.save.id;
  const datasetId = squadDatasetId;
  const query = playerSearchQuery;
  isSearchingPlayers = true;
  playerSearchMessage = "";
  render();
  try {
    const results = await searchPlayersInDataset(datasetId, query, 100, squadSortField, squadSortDirection);
    if (requestId !== playerSearchRequestId || activeSaveId !== saveId || squadDatasetId !== datasetId) return;
    playerSearchResults = results;
    playerSearchMessage = results.length
      ? `Showing up to 100 matches for "${query || "all players"}".`
      : "No players matched this name prefix in the selected season. Try another spelling or select a different season.";
  } catch (error) {
    if (requestId !== playerSearchRequestId || activeSaveId !== saveId || squadDatasetId !== datasetId) return;
    playerSearchResults = [];
    playerSearchMessage = formatStorageError(error);
  } finally {
    if (requestId === playerSearchRequestId) {
      isSearchingPlayers = false;
      render();
    }
  }
}

async function openPlayerHistory(uid: string): Promise<void> {
  if (!activeSaveId) return;
  const requestId = ++playerHistoryRequestId;
  const saveId = activeSaveId;
  selectedPlayerUid = uid;
  isLoadingPlayerHistory = true;
  playerHistory = [];
  playerSearchMessage = "";
  render();
  try {
    const history = await getPlayerHistory(saveId, uid);
    if (requestId !== playerHistoryRequestId || activeSaveId !== saveId) return;
    playerHistory = history;
    historyCompareCurrentId = history[history.length - 1]?.dataset.id ?? "";
    historyComparePreviousId = history.length > 1 ? history[history.length - 2].dataset.id : "";
  } catch (error) {
    if (requestId !== playerHistoryRequestId || activeSaveId !== saveId) return;
    playerSearchMessage = formatStorageError(error);
  } finally {
    if (requestId === playerHistoryRequestId) {
      isLoadingPlayerHistory = false;
      render();
    }
  }
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
  const previewHeaders = ["UID", "Name", "Position", "Age", "Club", "Division"]
    .map((candidate) => parsed.headers.find((header) => header.toLowerCase() === candidate.toLowerCase()))
    .filter((header): header is string => Boolean(header));
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
        <p>Select the original Football Manager export. Supported formats are FM24 pipe-table exports and HTML table exports containing a UID column. Parsing and validation happen locally.</p>
        <label class="file-dropzone" for="fm24-file-input">
          <input id="fm24-file-input" class="file-input" type="file" accept=".csv,.txt,.html,.htm,text/csv,text/plain,text/html,application/xhtml+xml" data-fm24-file>
          <span class="upload-symbol">↑</span><strong>Select FM24 export</strong><span>Choose an FM24 .csv, .txt, .html or .htm export · no server upload</span>
        </label>
        <div class="muted-note">A successful validation is not a saved season. Review the report and explicitly commit it to a save.</div>
      </section>
      <section class="content-card storage-card">
        <div class="card-kicker">ACTIVE SAVE</div><h2>${activeSave() ? escapeHtml(activeSave()!.save.name) : "No save selected"}</h2>
        ${activeSave() ? `<div class="storage-row"><span>Current club</span><strong>${escapeHtml(activeSave()!.save.club || "Not specified")}</strong></div><div class="storage-row"><span>Season datasets</span><strong>${activeSave()!.datasets.length}</strong></div>` : '<p class="storage-footnote">Select or create a save to begin.</p>'}
        ${datasetListView()}
        <p class="storage-footnote">Player source rows are stored in IndexedDB. The browser profile owns this data; clearing site data or changing browser/device can remove access. Keep a backup somewhere outside this browser.</p>
      </section>
    </div>
    <section class="content-card backup-card">
      <div class="card-kicker">PORTABLE DATA SAFETY</div><h2>Backup &amp; restore</h2>
      <p>Export the active career, including every committed season and its original player rows, as a versioned JSON backup. Restore always creates a separate career; it never replaces your existing saves.</p>
      <div class="backup-actions">
        <form data-export-backup>
          <button class="primary-button" type="submit" ${!activeSave() || isBackingUp || isRestoring ? "disabled" : ""}>${isBackingUp ? "Preparing backup…" : "Download active career backup"}</button>
          <span class="form-help">${activeSave() ? `${activeSave()!.datasets.length} committed season dataset(s) included.` : "Select a career to create a backup."}</span>
        </form>
        <form class="restore-backup-form" data-restore-backup>
          <div class="form-field"><label for="restore-backup-file">Restore a backup file</label><input id="restore-backup-file" name="backupFile" type="file" accept=".json,application/json" required></div>
          <button class="secondary-button" type="submit" ${isRestoring || isBackingUp ? "disabled" : ""}>${isRestoring ? "Validating and restoring…" : "Restore as a new career"}</button>
          <span class="form-help">The backup is checked before anything is written. Existing careers remain untouched.</span>
        </form>
      </div>
    </section>
    ${importStatusView()}
    <section class="content-card roadmap-card"><div class="card-kicker">DATA SAFETY</div><h2>Existing seasons are not overwritten</h2><p>Imports are written in batches as staged records. A season becomes visible only after all player rows have been stored and its dataset metadata is committed. Failed imports are cleaned up where possible and never replace an existing season.</p></section>`;
}

function squadView(): string {
  if (activeSave() && activeSave()!.datasets.length && !squadDatasetId) squadDatasetId = activeSave()!.datasets[0].id;
  return renderSquadWorkspace(activeSave(), squadDatasetId, squadPlayersView(), render);
}

function sectionView(section: Section): string {
  if (section === "Data & Saves") return dataSavesView();
  if (section === "Squad") return squadView();
  if (section === "Scouting") return renderScoutingWorkspace(activeSave());
  if (section === "Planning") return renderPlanningWorkspace(activeSave());
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
    await loadScoutingWorkspace(activeSaveId ?? "", activeSave()?.datasets[0]?.id ?? "", render);
  } catch (error) {
    saveMessage = formatStorageError(error);
    saveMessageIsError = true;
  }
  render();
}

app.addEventListener("input", (event: Event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.matches("[data-squad-player-search]")) {
    handleSquadWorkspaceInput(target);
  }
});
app.addEventListener("pointerdown", (event: PointerEvent) => {
  handleSquadWorkspacePointerDown(event);
});
app.addEventListener("pointermove", (event: PointerEvent) => {
  handleSquadWorkspacePointerMove(event);
});
app.addEventListener("pointerup", (event: PointerEvent) => {
  void handleSquadWorkspacePointerUp(event, render);
});
app.addEventListener("pointercancel", (event: PointerEvent) => {
  void handleSquadWorkspacePointerUp(event, render);
});

app.addEventListener("click", (event: MouseEvent) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-section], [data-select-save], [data-player-uid], [data-player-back], [data-add-filter], [data-remove-filter], [data-scouting-reset], [data-scouting-search], [data-save-search], [data-apply-saved-search], [data-delete-search], [data-save-player-state], [data-reset-philosophy], [data-scouting-sort-field], [data-dof-sort-field], [data-squad-sort-field], [data-squad-tab], [data-tactic-slot]");
  if (target?.dataset.squadTab || target?.dataset.tacticSlot) { void handleSquadWorkspaceClick(target, render); return; }
  if (target?.dataset.squadSortField) {
    const field = target.dataset.squadSortField;
    if (squadSortField === field) {
      if (squadSortDirection === "asc") squadSortDirection = "desc";
      else { squadSortField = "name"; squadSortDirection = "asc"; }
    } else { squadSortField = field; squadSortDirection = "asc"; }
    void runPlayerSearch();
    return;
  }
  if (target) void handleScoutingWorkspaceClick(target, render).then((handled) => { if (handled) render(); });
  const next = target?.dataset.section as Section | undefined;
  if (next && sections.includes(next)) {
    activeSection = next;
    if (next === "Planning") { void refreshScoutingAnalysisSettings(render); void loadPlanningWorkspace(activeSave(), render); }
    if (next === "Scouting") void refreshScoutingAnalysisSettings(render);
    render();
    return;
  }
  if (target?.hasAttribute("data-player-back")) {
    playerHistoryRequestId += 1;
    isLoadingPlayerHistory = false;
    selectedPlayerUid = null;
    playerHistory = [];
    render();
    return;
  }
  const playerUid = target?.dataset.playerUid;
  if (playerUid) {
    void openPlayerHistory(playerUid);
    return;
  }
  const saveId = target?.dataset.selectSave;
  if (saveId) {
    resetPlayerWorkspace();
    activeSaveId = saveId;
    persistActiveSaveId(activeSaveId);
    void loadScoutingWorkspace(saveId, saveLibrary.find((entry) => entry.save.id === saveId)?.datasets[0]?.id ?? "", render).then(render);
    saveMessage = "";
    render();
  }
});

app.addEventListener("change", (event: Event) => {
  const target = event.target;
  if (target instanceof HTMLElement) {
    void handleSquadWorkspaceChange(target, render);
    void handleScoutingWorkspaceChange(target, render).then((handled) => { if (handled) render(); });
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-history-previous]")) {
    historyComparePreviousId = target.value;
    if (historyComparePreviousId && historyComparePreviousId === historyCompareCurrentId) {
      historyCompareCurrentId = playerHistory.find((entry) => entry.dataset.id !== historyComparePreviousId)?.dataset.id ?? "";
    }
    render();
    return;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-history-current]")) {
    historyCompareCurrentId = target.value;
    if (historyComparePreviousId && historyComparePreviousId === historyCompareCurrentId) {
      historyComparePreviousId = [...playerHistory].reverse().find((entry) => entry.dataset.id !== historyCompareCurrentId)?.dataset.id ?? "";
    }
    render();
    return;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-squad-dataset]")) {
    playerSearchRequestId += 1;
    playerHistoryRequestId += 1;
    isSearchingPlayers = false;
    isLoadingPlayerHistory = false;
    squadDatasetId = target.value;
    playerSearchResults = [];
    playerSearchMessage = "";
    selectedPlayerUid = null;
    playerHistory = [];
    render();
    return;
  }
  if (!(target instanceof HTMLInputElement) || !target.matches("[data-fm24-file]")) return;
  const file = target.files?.[0];
  if (file) validateFileInWorker(file);
});

app.addEventListener("submit", async (event: SubmitEvent) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  if (form.matches("[data-player-search]")) {
    event.preventDefault();
    const data = new FormData(form);
    playerSearchQuery = String(data.get("query") ?? "").trim();
    void runPlayerSearch();
    return;
  }

  if (form.matches("[data-export-backup]")) {
    event.preventDefault();
    if (!activeSaveId || isBackingUp || isRestoring) return;
    isBackingUp = true;
    saveMessage = "";
    render();
    try {
      const backup = await createSaveBackup(activeSaveId);
      const blob = new Blob([backup], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const saveName = activeSave()?.save.name ?? "moneyball-career";
      const safeName = saveName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "moneyball-career";
      link.href = url;
      link.download = safeName + "-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      saveMessage = "Career backup downloaded. Store a copy outside this browser, such as on another drive or cloud storage.";
      saveMessageIsError = false;
    } catch (error) {
      saveMessage = formatStorageError(error);
      saveMessageIsError = true;
    } finally {
      isBackingUp = false;
      render();
    }
    return;
  }

  if (form.matches("[data-restore-backup]")) {
    event.preventDefault();
    if (isRestoring || isBackingUp) return;
    const fileInput = form.querySelector<HTMLInputElement>('input[name="backupFile"]');
    const file = fileInput?.files?.[0];
    if (!file) {
      saveMessage = "Choose a Moneyball Companion backup file first.";
      saveMessageIsError = true;
      render();
      return;
    }
    if (!window.confirm("Restore this backup as a separate career? Your existing careers and seasons will not be replaced.")) return;
    isRestoring = true;
    saveMessage = "";
    render();
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const restored = await restoreSaveBackup(parsed);
      saveLibrary = await listSaves();
      resetPlayerWorkspace();
      activeSaveId = restored.id;
      persistActiveSaveId(activeSaveId);
      await loadScoutingWorkspace(restored.id, saveLibrary.find((entry) => entry.save.id === restored.id)?.datasets[0]?.id ?? "", render);
      saveMessage = '"' + restored.name + '" restored successfully. Your original career remains unchanged.';
      saveMessageIsError = false;
    } catch (error) {
      saveMessage = formatStorageError(error);
      saveMessageIsError = true;
    } finally {
      isRestoring = false;
      render();
    }
    return;
  }

  if (form.matches("[data-create-save]")) {
    event.preventDefault();
    const data = new FormData(form);
    try {
      const save = await createLocalSave(String(data.get("name") ?? ""), String(data.get("club") ?? ""));
      saveLibrary = await listSaves();
      resetPlayerWorkspace();
      activeSaveId = save.id;
      persistActiveSaveId(activeSaveId);
      await loadScoutingWorkspace(save.id, "", render);
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
      resetPlayerWorkspace();
      activeSaveId = saveId;
      squadDatasetId = dataset.id;
      await loadScoutingWorkspace(saveId, dataset.id, render);
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
