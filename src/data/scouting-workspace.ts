import {
  emptyScoutingWorkspaceState, getScoutingWorkspaceState, updateScoutingWorkspaceState, searchScoutingPlayers,
  type SaveWithDatasets, type ScoutingWorkspaceState, type ScoutingFilterCondition, type PlayerSeasonRecord,
  type PlayerScoutingState, type ShortlistStatus, type SavedPlayerSearch,
} from "./storage/local-database";

let saveId = "";
let state: ScoutingWorkspaceState = emptyScoutingWorkspaceState();
let datasetId = "";
let query = "";
let filters: ScoutingFilterCondition[] = [];
let logic: "and" | "or" = "and";
let sortField = "name";
let sortDirection: "asc" | "desc" = "asc";
let results: PlayerSeasonRecord[] = [];
let total = 0;
let message = "";
let loading = false;
let requestToken = 0;
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
  if (results[0]) Object.keys(results[0].rawValues).forEach((field) => output.add(field));
  return [...output];
}
function columns(): string[] {
  return state.columnsByDataset[datasetId]?.length ? state.columnsByDataset[datasetId] : defaultColumns;
}
function playerState(uid: string): PlayerScoutingState {
  return state.players[uid] ?? { status: "watching", note: "", tags: [], reviewDate: "", updatedAt: "" };
}
function saveState(render: () => void): void {
  if (!saveId) return;
  void updateScoutingWorkspaceState(saveId, state).then(() => {
    message = "Scouting workspace saved to this career.";
    render();
  }).catch((error: unknown) => {
    message = error instanceof Error ? error.message : "Could not save scouting workspace.";
    render();
  });
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
    results = response.players; total = response.total;
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

export async function loadScoutingWorkspace(nextSaveId: string, nextDatasetId = ""): Promise<void> {
  saveId = nextSaveId;
  state = emptyScoutingWorkspaceState();
  datasetId = nextDatasetId;
  filters = []; query = ""; results = []; total = 0; message = "";
  if (!saveId) return;
  try { state = await getScoutingWorkspaceState(saveId); }
  catch (error) { message = error instanceof Error ? error.message : "Could not load scouting workspace."; }
  if (datasetId) {
    try { const initial = await searchScoutingPlayers({ datasetId, limit: 200, sortField: "name" }); results = initial.players; total = initial.total; }
    catch (error) { message = error instanceof Error ? error.message : "Could not load players."; }
  }
}

export function renderScoutingWorkspace(save: SaveWithDatasets | undefined): string {
  if (!save) return '<section class="empty-workspace content-card"><div class="card-kicker">SCOUTING WORKSPACE</div><h2>Select a career first.</h2><p>Scouting searches and decisions are stored inside the active career.</p></section>';
  if (!save.datasets.length) return '<section class="empty-workspace content-card"><div class="card-kicker">SCOUTING WORKSPACE</div><h2>Import a season to begin.</h2><p>Search and filters use only your imported player records.</p></section>';
  if (!save.datasets.some((entry) => entry.id === datasetId)) datasetId = save.datasets[0].id;
  const fieldList = fields();
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
    const cells = columns().map((field) => {
      const value = fieldValue(player, field);
      return '<td>' + (field === "name" ? '<strong>' + esc(value) + '</strong>' : esc(value.trim() ? value : "—")) + '</td>';
    }).join("");
    return '<tr data-scouting-row="' + esc(player.uid) + '">' + cells + '<td><span class="scouting-status">' + esc(decision.status) + '</span><details class="scouting-player-details"><summary>Decision &amp; notes</summary><div class="scouting-player-editor">' +
      '<label>Status<select data-player-status>' + [["watching","Watching"],["shortlist","Shortlist"],["reject","Reject"],["signed","Signed"],["revisit","Revisit"]].map((item) => '<option value="' + item[0] + '"' + (decision.status === item[0] ? " selected" : "") + '>' + item[1] + '</option>').join("") + '</select></label>' +
      '<label>Tags<input data-player-tags value="' + esc(decision.tags.join(", ")) + '" placeholder="e.g. pressing, value"></label>' +
      '<label>Next review<input data-player-review type="date" value="' + esc(decision.reviewDate) + '"></label>' +
      '<label>Notes<textarea data-player-note rows="2" maxlength="2000">' + esc(decision.note) + '</textarea></label>' +
      '<button type="button" class="secondary-button compact-button" data-save-player-state="' + esc(player.uid) + '">Save decision</button></div></details></td></tr>';
  }).join("");
  return '<section class="content-card scouting-workspace"><div class="card-kicker">CAREER-WIDE PLAYER DISCOVERY</div><h2>Search the imported player database</h2>' +
    '<p>Search any text in a season, combine source-field conditions, and keep scouting decisions with this career. Missing values are not treated as zero.</p>' +
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
    (rows ? '<div class="player-table-wrap"><table class="player-data-table scouting-results-table"><thead><tr>' + header + '<th>Scouting decision</th></tr></thead><tbody>' + rows + '</tbody></table></div>' :
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
    sortField = saved.sortField; sortDirection = saved.sortDirection;
    await runSearch(render); return true;
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
    state.players[target.dataset.savePlayerState] = { status: status ?? "watching", note, tags, reviewDate, updatedAt: new Date().toISOString() };
    await updateScoutingWorkspaceState(saveId, state); message = "Scouting decision saved to this career."; render(); return true;
  }
  return false;
}

export async function handleScoutingWorkspaceChange(target: HTMLElement, render: () => void): Promise<boolean> {
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-dataset]")) {
    datasetId = target.value; filters = []; query = ""; await runSearch(render); return true;
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
