import {
  emptyScoutingWorkspaceState, getScoutingWorkspaceState, updateScoutingWorkspaceState, searchScoutingPlayers,
  type SaveWithDatasets, type ScoutingWorkspaceState, type ScoutingAnalysisSettings, type ScoutingFilterCondition, type PlayerSeasonRecord,
  type PlayerScoutingState, type ShortlistStatus, type SavedPlayerSearch,
} from "./storage/local-database";
import { FM24_ROLES, FM24_STRATA } from "../analytics/fm24-role-catalog";
import { FM24_PHILOSOPHY_TEMPLATES } from "../analytics/fm24-scoring";

let saveId = "";
let state: ScoutingWorkspaceState = emptyScoutingWorkspaceState();
let datasetId = "";
let query = "";
let filters: ScoutingFilterCondition[] = [];
let logic: "and" | "or" = "and";
let sortField = "name";
let sortDirection: "asc" | "desc" = "asc";
let results: PlayerSeasonRecord[] = [];
let sourceFields: string[] = [];
let total = 0;
let message = "";
let loading = false;
let requestToken = 0;
interface PlayerFitSummary {
  uid: string; positionEligible: boolean; roleScore: number | null; roleCoverage: number;
  confidence: "low" | "medium" | "high"; philosophyScore: number | null;
  philosophyCoverage: number; principleScores: Array<number | null>;
  roleFamilies: Array<{ family: string; score: number | null; weight: number; available: boolean }>;
  tacticalFit: number | null;
}
let fitByUid = new Map<string, PlayerFitSummary>();
let scoringWorker: Worker | null = null;
let scoringRequestToken = 0;
let scoringStatus: "idle" | "loading" | "scoring" | "complete" | "error" = "idle";
let scoringMessage = "";
const defaultColumns = ["name", "position", "club", "Age", "Division"];

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
function fieldValue(player: PlayerSeasonRecord, field: string): string {
  if (field === "name") return player.displayName;
  if (field === "position") return player.position;
  if (field === "club") return player.club;
  if (field === "uid") return player.uid;
  return player.rawValues[field] ?? "";
}
function label(field: string): string {
  return ({ name: "Player", position: "Position", club: "Club", uid: "FM UID" } as Record<string, string>)[field] ?? field;
}
function fields(): string[] {
  const output = new Set<string>(["name", "position", "club", "uid"]);
  sourceFields.forEach((field) => output.add(field));
  if (results[0]) Object.keys(results[0].rawValues).forEach((field) => output.add(field));
  return [...output];
}
function columns(): string[] {
  const available = new Set(fields());
  const stored = state.columnsByDataset[datasetId]?.filter((field) => available.has(field));
  if (stored?.length) return stored;
  const defaults = defaultColumns.filter((field) => available.has(field));
  return defaults.length ? defaults : ["name"];
}
function playerState(uid: string): PlayerScoutingState {
  return state.players[uid] ?? { status: "unreviewed", note: "", tags: [], reviewDate: "", updatedAt: "" };
}
function analysisSettings() {
  return state.analysis ?? { roleId: "", philosophyTemplate: "" as const, roleWeight: 0.7 };
}
function stopScoringWorker(): void {
  scoringRequestToken += 1;
  scoringWorker?.terminate();
  scoringWorker = null;
}
async function runScoring(render: () => void): Promise<void> {
  const settings = analysisSettings();
  if (!datasetId || !settings.roleId) {
    stopScoringWorker(); fitByUid = new Map(); scoringStatus = "idle";
    scoringMessage = settings.roleId ? "Select a philosophy profile to complete Tactical Fit." : "Choose an FM24 role and duty to calculate role fit.";
    render(); return;
  }
  stopScoringWorker();
  const requestId = scoringRequestToken;
  fitByUid = new Map(); scoringStatus = "loading";
  scoringMessage = "Loading the full season to build position-specific reference groups…";
  render();
  try {
    const worker = new Worker(new URL("../analytics/fm24-scoring.worker.ts", import.meta.url), { type: "module" });
    scoringWorker = worker;
    worker.onmessage = (event: MessageEvent<{ requestId: number; phase: string; scores?: PlayerFitSummary[]; playerCount?: number; inferredMissingLeagues?: number; seasonProgress?: number; poolMinimumMinutes?: number; message?: string }>) => {
      const response = event.data;
      if (response.requestId !== requestId || requestId !== scoringRequestToken) return;
      if (response.phase === "loading") {
        scoringStatus = "loading";
        scoringMessage = "Loading the full season to build position-specific reference groups…";
      } else if (response.phase === "scoring") {
        scoringStatus = "scoring";
        scoringMessage = "Calculating role and philosophy fit across " + (response.playerCount ?? 0).toLocaleString() + " players…";
      } else if (response.phase === "complete") {
        fitByUid = new Map((response.scores ?? []).map((score) => [score.uid, score]));
        scoringStatus = "complete";
        scoringMessage = "Scores calculated for " + (response.playerCount ?? 0).toLocaleString() + " players" +
          ((response.inferredMissingLeagues ?? 0) ? "; " + response.inferredMissingLeagues + " competition(s) contain inferred missing advanced data." : ".") +
          " Estimated season progress: " + Math.round((response.seasonProgress ?? 1) * 100) + "%; reference-pool minimum: " + (response.poolMinimumMinutes ?? 900).toLocaleString() + " minutes. Scores are relative to this season's eligible position groups.";
        worker.terminate(); if (scoringWorker === worker) scoringWorker = null;
      } else if (response.phase === "error") {
        scoringStatus = "error"; scoringMessage = response.message ?? "Scoring failed.";
        worker.terminate(); if (scoringWorker === worker) scoringWorker = null;
      }
      render();
    };
    worker.onerror = () => {
      if (requestId !== scoringRequestToken) return;
      scoringStatus = "error"; scoringMessage = "The scoring worker stopped unexpectedly. Your imported data is unchanged.";
      worker.terminate(); if (scoringWorker === worker) scoringWorker = null; render();
    };
    worker.postMessage({
      requestId, datasetId, roleId: settings.roleId,
      philosophyTemplate: settings.philosophyTemplate,
      roleWeight: settings.roleWeight,
    });
  } catch (error) {
    scoringStatus = "error";
    scoringMessage = error instanceof Error ? error.message : "Could not start the scoring worker.";
    render();
  }
}

async function runSearch(render: () => void): Promise<void> {
  if (!datasetId) return;
  const token = ++requestToken;
  loading = true; message = ""; render();
  try {
    const response = await searchScoutingPlayers({
      datasetId, query, filters, logic, sortField, sortDirection, limit: 200,
    });
    if (token !== requestToken) return;
    results = response.players; total = response.total; sourceFields = response.fields;
    message = total > results.length
      ? "Showing the first " + results.length + " of " + total.toLocaleString() + " matches. Refine the search to narrow the list."
      : total ? "Search complete. All matching records are shown." : "No matches. Blank and dash values are excluded from numeric comparisons.";
  } catch (error) {
    if (token !== requestToken) return;
    results = []; total = 0;
    message = error instanceof Error ? error.message : "Player search failed.";
  } finally {
    if (token === requestToken) { loading = false; render(); }
  }
}

export async function loadScoutingWorkspace(nextSaveId: string, nextDatasetId = "", onUpdate?: () => void): Promise<void> {
  stopScoringWorker();
  saveId = nextSaveId;
  state = emptyScoutingWorkspaceState();
  datasetId = nextDatasetId;
  fitByUid = new Map(); scoringStatus = "idle"; scoringMessage = "";
  filters = []; query = ""; results = []; total = 0; message = "";
  if (!saveId) return;
  try {
    const stored = await getScoutingWorkspaceState(saveId);
    state = { ...emptyScoutingWorkspaceState(), ...stored, analysis: stored.analysis ?? emptyScoutingWorkspaceState().analysis };
  } catch (error) { message = error instanceof Error ? error.message : "Could not load scouting workspace."; }
  if (datasetId) {
    try { const initial = await searchScoutingPlayers({ datasetId, limit: 200, sortField: "name" }); results = initial.players; total = initial.total; sourceFields = initial.fields; }
    catch (error) { message = error instanceof Error ? error.message : "Could not load players."; }
    if (onUpdate) await runScoring(onUpdate);
  }
}

export function renderScoutingWorkspace(save: SaveWithDatasets | undefined): string {
  if (!save) return '<section class="empty-workspace content-card"><div class="card-kicker">SCOUTING WORKSPACE</div><h2>Select a career first.</h2><p>Scouting searches and decisions are stored inside the active career.</p></section>';
  if (!save.datasets.length) return '<section class="empty-workspace content-card"><div class="card-kicker">SCOUTING WORKSPACE</div><h2>Import a season to begin.</h2><p>Search and filters use only your imported player records.</p></section>';
  if (!save.datasets.some((entry) => entry.id === datasetId)) datasetId = save.datasets[0].id;
  const fieldList = fields();
  const analysis = analysisSettings();
  const roles = FM24_ROLES as unknown as Array<{ id: string; name: string; dutyName: string; strata: string }>;
  const strata = FM24_STRATA as unknown as Record<string, { label: string }>;
  const roleOptions = Object.keys(strata).map((key) => '<optgroup label="' + esc(strata[key].label) + '">' +
    roles.filter((role) => role.strata === key).map((role) => '<option value="' + esc(role.id) + '"' + (analysis.roleId === role.id ? " selected" : "") + '>' + esc(role.name) + ' · ' + esc(role.dutyName) + '</option>').join("") +
    '</optgroup>').join("");
  const philosophyOptions = Object.entries(FM24_PHILOSOPHY_TEMPLATES).map(([key, template]) =>
    '<option value="' + key + '"' + (analysis.philosophyTemplate === key ? " selected" : "") + '>' + esc(template.name) + '</option>').join("");
  const datasetOptions = save.datasets.map((entry) => '<option value="' + esc(entry.id) + '"' + (entry.id === datasetId ? " selected" : "") + '>' + esc(entry.seasonLabel) + ' · ' + entry.playerCount.toLocaleString() + ' players</option>').join("");
  const filterRows = filters.map((filter) => {
    const operators = [["contains","contains"],["equals","equals"],["gt","greater than"],["gte","at least"],["lt","less than"],["lte","at most"],["is-empty","is empty"],["is-not-empty","is not empty"]];
    return '<div class="scouting-filter-row" data-filter-row="' + esc(filter.id) + '">' +
      '<select data-filter-field="' + esc(filter.id) + '" aria-label="Filter field">' + fieldList.map((field) => '<option value="' + esc(field) + '"' + (filter.field === field ? " selected" : "") + '>' + esc(label(field)) + '</option>').join("") + '</select>' +
      '<select data-filter-operator="' + esc(filter.id) + '" aria-label="Filter operator">' + operators.map((entry) => '<option value="' + entry[0] + '"' + (filter.operator === entry[0] ? " selected" : "") + '>' + entry[1] + '</option>').join("") + '</select>' +
      '<input data-filter-value="' + esc(filter.id) + '" aria-label="Filter value" value="' + esc(filter.value) + '" placeholder="Value"' + (filter.operator.startsWith("is-") ? " disabled" : "") + '>' +
      '<button type="button" class="text-button" data-remove-filter="' + esc(filter.id) + '">Remove</button></div>';
  }).join("");
  const savedOptions = state.savedSearches.map((entry) => '<option value="' + esc(entry.id) + '">' + esc(entry.name) + '</option>').join("");
  const columnOptions = fieldList.map((field) => '<label class="scouting-column-option"><input type="checkbox" data-scouting-column value="' + esc(field) + '"' + (columns().includes(field) ? " checked" : "") + '> ' + esc(label(field)) + '</label>').join("");
  const header = columns().map((field) => '<th>' + esc(label(field)) + '</th>').join("");
  const rows = results.map((player) => {
    const decision = playerState(player.uid);
    const fit = fitByUid.get(player.uid);
    const cells = columns().map((field) => {
      const value = fieldValue(player, field);
      return '<td>' + (field === "name" ? '<button class="player-name-button" data-player-uid="' + esc(player.uid) + '">' + esc(value) + '</button>' : esc(value.trim() ? value : "—")) + '</td>';
    }).join("");
    const scoreCell = (value: number | null | undefined, title: string) => '<td class="scouting-score-cell" title="' + esc(title) + '">' + (value == null ? '<span class="score-missing">—</span>' : '<strong>' + value + '</strong>') + '</td>';
    const roleCell = scoreCell(fit?.roleScore, fit ? 'Role-family evidence: ' + Math.round(fit.roleCoverage * 100) + '% · ' + fit.confidence + ' confidence' : 'Role score not calculated');
    const philosophyCell = scoreCell(fit?.philosophyScore, fit ? 'Philosophy evidence: ' + Math.round(fit.philosophyCoverage * 100) + '% coverage' : 'Philosophy score not calculated');
    const tacticalCell = scoreCell(fit?.tacticalFit, 'Combined tactical fit requires both role and philosophy evidence');
    const principleDetails = fit?.principleScores.length
      ? '<details class="scouting-fit-details"><summary>Philosophy principles</summary><div>' +
        fit.principleScores.map((score, index) => '<span>' + esc(["Keep the ball", "Availability", "Progression", "Regains", "Front-foot defending", "Intensity"][index]) + ': <b>' + (score == null ? '—' : score) + '</b></span>').join("") +
        '</div></details>'
      : '';
    const familyDetails = fit?.roleFamilies.length
      ? '<details class="scouting-fit-details"><summary>Role evidence families</summary><div>' +
        fit.roleFamilies.map((family) => '<span title="Configured family weight: ' + family.weight + '">' + esc(family.family.replace(/_/g, " ")) + ': <b>' + (family.score == null ? '—' : family.score) + '</b></span>').join("") +
        '</div></details>'
      : '';
    return '<tr data-scouting-row="' + esc(player.uid) + '">' + cells + roleCell + philosophyCell + tacticalCell + '<td>' + (fit && fit.positionEligible ? (fit.roleScore == null ? '<span class="score-missing">Insufficient evidence</span>' : '<span class="scouting-status">' + fit.confidence + ' confidence</span>') : fit ? '<span class="score-missing">Different position group</span>' : '<span class="score-missing">—</span>') + familyDetails + principleDetails + '</td><td><span class="scouting-status">' + esc(decision.status) + '</span><details class="scouting-player-details"><summary>Decision &amp; notes</summary><div class="scouting-player-editor">' +
      '<label>Status<select data-player-status>' + [["unreviewed","Unreviewed"],["watching","Watching"],["shortlist","Shortlist"],["reject","Reject"],["signed","Signed"],["revisit","Revisit"]].map((item) => '<option value="' + item[0] + '"' + (decision.status === item[0] ? " selected" : "") + '>' + item[1] + '</option>').join("") + '</select></label>' +
      '<label>Tags<input data-player-tags value="' + esc(decision.tags.join(", ")) + '" placeholder="e.g. pressing, value"></label>' +
      '<label>Next review<input data-player-review type="date" value="' + esc(decision.reviewDate) + '"></label>' +
      '<label>Notes<textarea data-player-note rows="2" maxlength="2000">' + esc(decision.note) + '</textarea></label>' +
      '<button type="button" class="secondary-button compact-button" data-save-player-state="' + esc(player.uid) + '">Save decision</button></div></details></td></tr>';
  }).join("");
  return '<section class="content-card scouting-workspace"><div class="card-kicker">CAREER-WIDE PLAYER DISCOVERY</div><h2>Search by role and philosophy fit</h2>' +
    '<p>Role Fit measures role-specific performance. Philosophy Fit measures alignment with your selected playing principles. Tactical Fit combines them only when both have sufficient evidence.</p>' +
    '<div class="scouting-fit-controls"><label>FM24 role and duty<select data-scouting-role><option value="">Choose a role…</option>' + roleOptions + '</select></label>' +
    '<label>Club philosophy<select data-scouting-philosophy><option value="">Choose a philosophy…</option>' + philosophyOptions + '</select></label>' +
    '<label>Role weight<select data-scouting-role-weight><option value="0.6"' + (analysis.roleWeight === 0.6 ? ' selected' : '') + '>60% role · 40% philosophy</option><option value="0.7"' + (analysis.roleWeight === 0.7 ? ' selected' : '') + '>70% role · 30% philosophy</option><option value="0.8"' + (analysis.roleWeight === 0.8 ? ' selected' : '') + '>80% role · 20% philosophy</option></select></label></div>' +
    '<p class="scouting-score-note" data-scoring-status="' + scoringStatus + '">' + esc(scoringMessage || "Choose a role and philosophy to calculate player fit. Scores use the full selected season as the comparison pool.") + '</p>' +
    '<div class="scouting-toolbar"><label>Season dataset<select data-scouting-dataset>' + datasetOptions + '</select></label>' +
    '<label class="scouting-query">Search players<input type="search" data-scouting-query value="' + esc(query) + '" placeholder="Name, club, position or source value"></label>' +
    '<label>Sort by<select data-scouting-sort>' + fieldList.map((field) => '<option value="' + esc(field) + '"' + (sortField === field ? " selected" : "") + '>' + esc(label(field)) + '</option>').join("") + '</select></label>' +
    '<label>Order<select data-scouting-direction><option value="asc"' + (sortDirection === "asc" ? " selected" : "") + '>Ascending</option><option value="desc"' + (sortDirection === "desc" ? " selected" : "") + '>Descending</option></select></label></div>' +
    '<div class="scouting-filter-panel"><div class="scouting-panel-heading"><strong>Filter conditions</strong><span>Combine conditions with</span><select data-scouting-logic><option value="and"' + (logic === "and" ? " selected" : "") + '>AND</option><option value="or"' + (logic === "or" ? " selected" : "") + '>OR</option></select></div>' +
    (filterRows || '<p class="form-help">No filters applied. Add a condition to narrow the results.</p>') +
    '<div class="scouting-actions"><button type="button" class="secondary-button compact-button" data-add-filter>Add condition</button><button type="button" class="text-button" data-scouting-reset>Reset filters</button><button type="button" class="primary-button" data-scouting-search' + (loading ? ' disabled' : '') + '>' + (loading ? 'Searching…' : 'Apply search') + '</button></div></div>' +
    '<div class="scouting-saved-searches"><label>Saved searches<select data-scouting-saved-select><option value="">Choose a saved search</option>' + savedOptions + '</select></label>' +
    '<button type="button" class="secondary-button compact-button" data-apply-saved-search>Load</button><input data-scouting-search-name maxlength="60" placeholder="Name this search">' +
    '<button type="button" class="secondary-button compact-button" data-save-search>Save current search</button><button type="button" class="text-button" data-delete-search>Delete selected</button></div>' +
    '<details class="scouting-columns-panel"><summary>Visible columns</summary><div class="scouting-columns-grid">' + columnOptions + '</div></details>' +
    '<div class="player-search-meta"><span>' + total.toLocaleString() + ' matching player(s) · showing ' + results.length + ' · max 200</span></div>' +
    (message ? '<p class="player-search-message" role="status">' + esc(message) + '</p>' : '') +
    (rows ? '<div class="player-table-wrap"><table class="player-data-table scouting-results-table"><thead><tr>' + header + '<th>Role fit</th><th>Philosophy</th><th>Tactical fit</th><th>Evidence</th><th>Scouting decision</th></tr></thead><tbody>' + rows + '</tbody></table></div>' :
      '<div class="player-search-empty">' + (loading ? 'Searching the selected season…' : 'No players match the current search. Check conditions or reset filters.') + '</div>') +
    '<p class="player-data-footnote">Scouting metadata is stored with this career. Imported player rows remain unchanged. Numeric comparisons exclude blank and dash values.</p></section>';
}

export async function handleScoutingWorkspaceClick(target: HTMLElement, render: () => void): Promise<boolean> {
  if (target.hasAttribute("data-add-filter")) {
    const field = fields().find((entry) => entry !== "uid") ?? "name";
    filters.push({ id: crypto.randomUUID(), field, operator: "contains", value: "" }); render(); return true;
  }
  if (target.dataset.removeFilter) { filters = filters.filter((entry) => entry.id !== target.dataset.removeFilter); render(); return true; }
  if (target.hasAttribute("data-scouting-reset")) { query = ""; filters = []; await runSearch(render); return true; }
  if (target.hasAttribute("data-scouting-search")) {
    query = document.querySelector<HTMLInputElement>("[data-scouting-query]")?.value.trim() ?? "";
    await runSearch(render); return true;
  }
  if (target.hasAttribute("data-save-search")) {
    const name = document.querySelector<HTMLInputElement>("[data-scouting-search-name]")?.value.trim() ?? "";
    if (!name) { message = "Enter a name before saving this search."; render(); return true; }
    const selectedColumns = [...document.querySelectorAll<HTMLInputElement>("[data-scouting-column]:checked")].map((input) => input.value);
    const saved: SavedPlayerSearch = { id: crypto.randomUUID(), name, datasetId, query, logic, filters: structuredClone(filters), columns: selectedColumns, sortField, sortDirection, updatedAt: new Date().toISOString() };
    state.savedSearches = [...state.savedSearches.filter((entry) => entry.name.toLocaleLowerCase() !== name.toLocaleLowerCase()), saved];
    await updateScoutingWorkspaceState(saveId, state); message = 'Saved search "' + name + '".'; render(); return true;
  }
  if (target.hasAttribute("data-apply-saved-search")) {
    const id = document.querySelector<HTMLSelectElement>("[data-scouting-saved-select]")?.value;
    const saved = state.savedSearches.find((entry) => entry.id === id);
    if (!saved) { message = "Choose a saved search first."; render(); return true; }
    datasetId = saved.datasetId; query = saved.query; logic = saved.logic; filters = structuredClone(saved.filters);
    state.columnsByDataset[datasetId] = saved.columns;
    sortField = saved.sortField; sortDirection = saved.sortDirection;
    await runSearch(render); await runScoring(render); return true;
  }
  if (target.hasAttribute("data-delete-search")) {
    const id = document.querySelector<HTMLSelectElement>("[data-scouting-saved-select]")?.value;
    if (!id) { message = "Choose a saved search to delete."; render(); return true; }
    state.savedSearches = state.savedSearches.filter((entry) => entry.id !== id);
    await updateScoutingWorkspaceState(saveId, state); message = "Saved search deleted."; render(); return true;
  }
  if (target.dataset.savePlayerState) {
    const row = target.closest<HTMLElement>("[data-scouting-row]");
    if (!row) return true;
    const status = row.querySelector<HTMLSelectElement>("[data-player-status]")?.value as ShortlistStatus | undefined;
    const note = row.querySelector<HTMLTextAreaElement>("[data-player-note]")?.value ?? "";
    const tags = (row.querySelector<HTMLInputElement>("[data-player-tags]")?.value ?? "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
    const reviewDate = row.querySelector<HTMLInputElement>("[data-player-review]")?.value ?? "";
    state.players[target.dataset.savePlayerState] = { status: status ?? "unreviewed", note, tags, reviewDate, updatedAt: new Date().toISOString() };
    await updateScoutingWorkspaceState(saveId, state); message = "Scouting decision saved to this career."; render(); return true;
  }
  return false;
}

export async function handleScoutingWorkspaceChange(target: HTMLElement, render: () => void): Promise<boolean> {
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-role]")) {
    state.analysis = { ...analysisSettings(), roleId: target.value };
    await updateScoutingWorkspaceState(saveId, state); await runScoring(render); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-philosophy]")) {
    state.analysis = { ...analysisSettings(), philosophyTemplate: target.value as ScoutingAnalysisSettings["philosophyTemplate"] };
    await updateScoutingWorkspaceState(saveId, state); await runScoring(render); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-role-weight]")) {
    const roleWeight = Number(target.value);
    state.analysis = { ...analysisSettings(), roleWeight: Number.isFinite(roleWeight) ? Math.max(0.6, Math.min(0.8, roleWeight)) : 0.7 };
    fitByUid = new Map([...fitByUid].map(([uid, fit]) => [uid, {
      ...fit,
      tacticalFit: fit.roleScore == null || fit.philosophyScore == null ? null
        : Math.round(fit.roleScore * state.analysis!.roleWeight + fit.philosophyScore * (1 - state.analysis!.roleWeight)),
    }]));
    await updateScoutingWorkspaceState(saveId, state); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-dataset]")) {
    datasetId = target.value; filters = []; query = ""; await runSearch(render); await runScoring(render); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-logic]")) { logic = target.value as "and" | "or"; return true; }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-sort]")) { sortField = target.value; return true; }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-direction]")) { sortDirection = target.value as "asc" | "desc"; return true; }
  if (target instanceof HTMLSelectElement && target.dataset.filterField) {
    filters = filters.map((entry) => entry.id === target.dataset.filterField ? { ...entry, field: target.value } : entry); return true;
  }
  if (target instanceof HTMLSelectElement && target.dataset.filterOperator) {
    filters = filters.map((entry) => entry.id === target.dataset.filterOperator ? { ...entry, operator: target.value as ScoutingFilterCondition["operator"] } : entry); render(); return true;
  }
  if (target instanceof HTMLInputElement && target.dataset.filterValue) {
    filters = filters.map((entry) => entry.id === target.dataset.filterValue ? { ...entry, value: target.value } : entry); return true;
  }
  if (target instanceof HTMLInputElement && target.matches("[data-scouting-column]")) {
    const selected = [...document.querySelectorAll<HTMLInputElement>("[data-scouting-column]:checked")].map((input) => input.value);
    state.columnsByDataset[datasetId] = selected.length ? selected : ["name"];
    await updateScoutingWorkspaceState(saveId, state); return true;
  }
  return false;
}
