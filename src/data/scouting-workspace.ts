import {
  emptyScoutingWorkspaceState, getScoutingWorkspaceState, updateScoutingWorkspaceState, searchScoutingPlayers, getDatasetPlayers,
  type SaveWithDatasets, type ScoutingWorkspaceState, type ScoutingAnalysisSettings, type ScoutingFilterCondition, type PlayerSeasonRecord,
  type PlayerScoutingState, type ShortlistStatus, type SavedPlayerSearch,
} from "./storage/local-database";
import { FM24_ROLES, FM24_STRATA } from "../analytics/fm24-role-catalog";
import { buildFm24DofRecommendations, type Fm24DofCandidate } from "../analytics/fm24-dof-recommendations";
import { FM24_PHILOSOPHY_TEMPLATES, FM24_PHILOSOPHY_PRINCIPLES, philosophyWeightsForRole } from "../analytics/fm24-scoring";

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
  uid: string; positionEligible: boolean; listedForRole: boolean; roleScore: number | null; dofEvaluationScore: number | null;
  aerialScore: number | null; aerialAdjustmentApplied: boolean; roleCoverage: number;
  confidence: "low" | "medium" | "high"; philosophyScore: number | null;
  philosophyCoverage: number; principleScores: Array<number | null>;
  principleEvidence: Array<{ id: string; name: string; weight: number; score: number | null; metricCoverage: number; metrics: Array<{ metric: string; rawValue: number | null; percentile: number | null; available: boolean; reason?: string }> }>;
  roleFamilies: Array<{ family: string; score: number | null; weight: number; available: boolean }>;
  tacticalFit: number | null;
}
let fitByUid = new Map<string, PlayerFitSummary>();
let planningRecords: PlayerSeasonRecord[] = [];
let planningDatasetId = "";
let planningLoading = false;
let planningMessage = "";
let scorePoolMinimumMinutes = 900;
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
  return ({ name: "Player", position: "Position", club: "Club", uid: "FM UID", roleScore: "Role fit", dofEvaluationScore: "DoF role evaluation", philosophyScore: "Philosophy fit", tacticalFit: "Tactical fit" } as Record<string, string>)[field] ?? field;
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
        scorePoolMinimumMinutes = response.poolMinimumMinutes ?? 900;
        scoringStatus = "complete";
        scoringMessage = "Scores calculated for " + (response.playerCount ?? 0).toLocaleString() + " players" +
          ((response.inferredMissingLeagues ?? 0) ? "; " + response.inferredMissingLeagues + " competition(s) contain inferred missing advanced data." : ".") +
          " Estimated season progress: " + Math.round((response.seasonProgress ?? 1) * 100) + "%; reference-pool minimum: " + (response.poolMinimumMinutes ?? 900).toLocaleString() + " minutes. Scores are relative to this season's eligible position groups.";
        worker.terminate(); if (scoringWorker === worker) scoringWorker = null;
        if (["roleScore", "dofEvaluationScore", "philosophyScore", "tacticalFit"].includes(sortField)) void runSearch(render);
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
    const selectedRole = (FM24_ROLES as unknown as Array<{ id: string; type: string }>).find((role) => role.id === settings.roleId);
    const customPhilosophyWeights = selectedRole
      ? settings.customPhilosophyWeightsByRoleType?.[selectedRole.type]
      : undefined;
    worker.postMessage({
      requestId, datasetId, roleId: settings.roleId,
      philosophyTemplate: settings.philosophyTemplate,
      roleWeight: settings.roleWeight,
      customPhilosophyWeights,
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
      datasetId, query, filters, logic, sortField, sortDirection, limit: 200, scoreByUid: fitByUid,
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
  planningRecords = []; planningDatasetId = ""; planningLoading = false; planningMessage = "";
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
  const selectedRole = roles.find((role) => role.id === analysis.roleId) as (typeof roles[number] & { type?: string }) | undefined;
  const roleType = selectedRole?.type ?? "";
  const templateWeights = selectedRole && analysis.philosophyTemplate
    ? philosophyWeightsForRole(selectedRole as never, analysis.philosophyTemplate)
    : [];
  const currentWeights = analysis.customPhilosophyWeightsByRoleType?.[roleType] ?? templateWeights;
  const philosophyWeightControls = selectedRole && analysis.philosophyTemplate
    ? '<section class="scouting-philosophy-editor"><div class="scouting-philosophy-heading"><div><strong>Philosophy profile weights</strong><p>Adjust the six principles for this role family. 0 disables a principle; 3 gives it the strongest emphasis.</p></div><button type="button" class="text-button" data-reset-philosophy>Reset to template</button></div><div class="scouting-philosophy-sliders">' +
      FM24_PHILOSOPHY_PRINCIPLES.map((principle, index) => '<label><span>' + esc(principle.name) + '</span><input type="range" min="0" max="3" step="0.5" value="' + (currentWeights[index] ?? 0) + '" data-philosophy-weight="' + index + '"><output>' + (currentWeights[index] ?? 0) + '</output></label>').join("") +
      '</div></section>'
    : '';
  const sortFields = [...fieldList, "roleScore", "dofEvaluationScore", "philosophyScore", "tacticalFit"];
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
    const roleCell = scoreCell(fit?.roleScore, fit ? 'Core role score · family evidence: ' + Math.round(fit.roleCoverage * 100) + '% · ' + fit.confidence + ' confidence' : 'Role score not calculated');
    const dofCell = scoreCell(fit?.dofEvaluationScore, fit?.aerialAdjustmentApplied ? 'V1 DoF evaluation: 90% core role score + 10% aerial signal (' + fit.aerialScore + ')' : 'DoF evaluation equals the core role score; no eligible aerial adjustment was available or this role does not use it');
    const philosophyCell = scoreCell(fit?.philosophyScore, fit ? 'Philosophy evidence: ' + Math.round(fit.philosophyCoverage * 100) + '% coverage' : 'Philosophy score not calculated');
    const tacticalCell = scoreCell(fit?.tacticalFit, 'Combined tactical fit uses DoF role evaluation and philosophy fit; both require sufficient evidence');
    const principleDetails = fit?.principleScores.length
      ? '<details class="scouting-fit-details"><summary>Philosophy principles and evidence</summary><div>' +
        fit.principleEvidence.map((principle) => '<section><span>' + esc(principle.name) + ' · weight ' + principle.weight + ': <b>' + (principle.score == null ? 'Insufficient evidence' : principle.score) + '</b></span>' +
          '<small>' + principle.metrics.map((metric) => esc(metric.metric) + ': ' + (metric.percentile == null ? '—' : Math.round(metric.percentile) + 'th pct')).join(' · ') + '</small></section>').join("") +
        '</div></details>'
      : '';
    const familyDetails = fit?.roleFamilies.length
      ? '<details class="scouting-fit-details"><summary>Role evidence families</summary><div>' +
        fit.roleFamilies.map((family) => '<span title="Configured family weight: ' + family.weight + '">' + esc(family.family.replace(/_/g, " ")) + ': <b>' + (family.score == null ? '—' : family.score) + '</b></span>').join("") +
        '</div></details>'
      : '';
    return '<tr data-scouting-row="' + esc(player.uid) + '">' + cells + roleCell + dofCell + philosophyCell + tacticalCell + '<td>' + (fit && fit.positionEligible ? (fit.roleScore == null ? '<span class="score-missing">Insufficient evidence</span>' : '<span class="scouting-status">' + fit.confidence + ' confidence</span>') : fit ? '<span class="score-missing">Different position group</span>' : '<span class="score-missing">—</span>') + familyDetails + principleDetails + '</td><td><span class="scouting-status">' + esc(decision.status) + '</span><details class="scouting-player-details"><summary>Decision &amp; notes</summary><div class="scouting-player-editor">' +
      '<label>Status<select data-player-status>' + [["unreviewed","Unreviewed"],["watching","Watching"],["shortlist","Shortlist"],["reject","Reject"],["signed","Signed"],["revisit","Revisit"]].map((item) => '<option value="' + item[0] + '"' + (decision.status === item[0] ? " selected" : "") + '>' + item[1] + '</option>').join("") + '</select></label>' +
      '<label>Tags<input data-player-tags value="' + esc(decision.tags.join(", ")) + '" placeholder="e.g. pressing, value"></label>' +
      '<label>Next review<input data-player-review type="date" value="' + esc(decision.reviewDate) + '"></label>' +
      '<label>Notes<textarea data-player-note rows="2" maxlength="2000">' + esc(decision.note) + '</textarea></label>' +
      '<button type="button" class="secondary-button compact-button" data-save-player-state="' + esc(player.uid) + '">Save decision</button></div></details></td></tr>';
  }).join("");
  return '<section class="content-card scouting-workspace"><div class="card-kicker">CAREER-WIDE PLAYER DISCOVERY</div><h2>Search by role and philosophy fit</h2>' +
    '<p>Core Role Fit measures role-specific performance. DoF Role Evaluation preserves V1’s small aerial adjustment for relevant defensive roles. Philosophy Fit measures alignment with your selected playing principles. Tactical Fit combines DoF Role Evaluation and Philosophy Fit only when both have sufficient evidence.</p>' +
    '<div class="scouting-fit-controls"><label>FM24 role and duty<select data-scouting-role><option value="">Choose a role…</option>' + roleOptions + '</select></label>' +
    '<label>Club philosophy<select data-scouting-philosophy><option value="">Choose a philosophy…</option>' + philosophyOptions + '</select></label>' +
    '<label>DoF role weight<select data-scouting-role-weight><option value="0.6"' + (analysis.roleWeight === 0.6 ? ' selected' : '') + '>60% role · 40% philosophy</option><option value="0.7"' + (analysis.roleWeight === 0.7 ? ' selected' : '') + '>70% role · 30% philosophy</option><option value="0.8"' + (analysis.roleWeight === 0.8 ? ' selected' : '') + '>80% role · 20% philosophy</option></select></label></div>' +
    philosophyWeightControls +
    '<p class="scouting-score-note" data-scoring-status="' + scoringStatus + '">' + esc(scoringMessage || "Choose a role and philosophy to calculate player fit. Tactical Fit uses DoF Role Evaluation plus Philosophy Fit; its blend is a configurable starting point, not a universal formula. Scores use the full selected season as the comparison pool.") + '</p>' +
    '<div class="scouting-toolbar"><label>Season dataset<select data-scouting-dataset>' + datasetOptions + '</select></label>' +
    '<label class="scouting-query">Search players<input type="search" data-scouting-query value="' + esc(query) + '" placeholder="Name, club, position or source value"></label>' +
    '<label>Sort by<select data-scouting-sort>' + sortFields.map((field) => '<option value="' + esc(field) + '"' + (sortField === field ? " selected" : "") + '>' + esc(label(field)) + '</option>').join("") + '</select></label>' +
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
    (rows ? '<div class="player-table-wrap"><table class="player-data-table scouting-results-table"><thead><tr>' + header + '<th>Role fit</th><th>DoF eval</th><th>Philosophy</th><th>Tactical fit</th><th>Evidence</th><th>Scouting decision</th></tr></thead><tbody>' + rows + '</tbody></table></div>' :
      '<div class="player-search-empty">' + (loading ? 'Searching the selected season…' : 'No players match the current search. Check conditions or reset filters.') + '</div>') +
    '<p class="player-data-footnote">Scouting metadata is stored with this career. Imported player rows remain unchanged. Numeric comparisons exclude blank and dash values.</p></section>';
}


type DofSettings = NonNullable<ScoutingAnalysisSettings["dof"]>;
const DEFAULT_DOF_SETTINGS: DofSettings = {
  budgetMillions: null, wageThousands: null, philosophyThreshold: 50,
  requireKnownValue: true, rankingMode: "role-led", starterUid: "",
};
function dofSettings(): DofSettings {
  return { ...DEFAULT_DOF_SETTINGS, ...(analysisSettings().dof ?? {}) };
}
function parseFmMoneyMaximum(value: string | undefined): number | null {
  if (!value) return null;
  const matches = [...value.matchAll(/[€£$]\\s*([\\d,.]+)\\s*([KMB])?/gi)];
  if (!matches.length) return null;
  const values = matches.map((match) => {
    const number = Number(match[1].replace(/,/g, ""));
    const multiplier = match[2]?.toUpperCase() === "K" ? 1e3 : match[2]?.toUpperCase() === "M" ? 1e6 : match[2]?.toUpperCase() === "B" ? 1e9 : 1;
    return Number.isFinite(number) ? number * multiplier : NaN;
  }).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}
function numberField(player: PlayerSeasonRecord, key: string): number | null {
  const value = (player.rawValues[key] ?? "").replace(/,/g, "").trim();
  if (!value || value === "-" || value === "—") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function currentClubPlayers(save: SaveWithDatasets, roleId: string): PlayerSeasonRecord[] {
  const club = save.save.club.trim().toLocaleLowerCase();
  if (!club) return [];
  return planningRecords.filter((player) => player.club.trim().toLocaleLowerCase() === club && fitByUid.get(player.uid)?.listedForRole === true && (fitByUid.get(player.uid)?.roleScore ?? null) != null);
}
function formatMillions(value: number | null): string {
  return value == null ? "Unknown" : (value / 1e6).toFixed(value >= 1e7 ? 1 : 2) + "m";
}
interface DofCandidate {
  player: PlayerSeasonRecord;
  fit: PlayerFitSummary;
  age: number | null;
  minutes: number;
  value: number | null;
  wage: number | null;
  valueText: string;
  wageText: string;
  philosophyStatus: string;
  retraining: boolean;
}
function dofCandidates(save: SaveWithDatasets): { eligible: DofCandidate[]; starter: DofCandidate | null; categories: Record<string, DofCandidate[]>; valueCap: number | null } {
  const config = dofSettings();
  const byUid = new Map<string, DofCandidate>();
  const engineCandidates: Fm24DofCandidate[] = planningRecords.flatMap((player) => {
    const fit = fitByUid.get(player.uid);
    if (!fit) return [];
    const candidate: DofCandidate = {
      player, fit,
      age: numberField(player, "Age"),
      minutes: numberField(player, "Mins") ?? 0,
      value: parseFmMoneyMaximum(player.rawValues["Transfer Value"]),
      wage: parseFmMoneyMaximum(player.rawValues.Wage),
      valueText: player.rawValues["Transfer Value"] || "Unknown",
      wageText: player.rawValues.Wage || "Unknown",
      philosophyStatus: fit.philosophyScore == null ? "Philosophy evidence unavailable" : fit.philosophyScore < 50 ? "Below philosophy baseline" : fit.philosophyScore >= 70 ? "Strong philosophy fit" : "Moderate philosophy fit",
      retraining: !fit.listedForRole,
    };
    byUid.set(player.uid, candidate);
    return [{
      uid: player.uid, name: player.displayName, club: player.club,
      age: candidate.age, minutes: candidate.minutes,
      transferValue: candidate.value, transferValueLabel: candidate.valueText,
      wage: candidate.wage, wageLabel: candidate.wageText,
      notForSale: /not for sale/i.test(candidate.valueText),
      positionEligible: fit.positionEligible, listedForRole: fit.listedForRole,
      roleScore: fit.roleScore, dofEvaluationScore: fit.dofEvaluationScore,
      philosophyScore: fit.philosophyScore, tacticalFit: fit.tacticalFit,
      confidence: fit.confidence,
    }];
  });
  const recommendations = buildFm24DofRecommendations(engineCandidates, {
    currentClub: save.save.club,
    starterUid: config.starterUid,
    budget: config.budgetMillions == null ? null : config.budgetMillions * 1e6,
    wageCap: config.wageThousands == null ? null : config.wageThousands * 1e3,
    philosophyThreshold: config.philosophyThreshold,
    requireKnownValue: config.requireKnownValue,
    rankingMode: config.rankingMode,
    poolMinimumMinutes: scorePoolMinimumMinutes,
    prospectMinimumMinutes: 300,
  });
  const map = (list: Fm24DofCandidate[]) => list.map((candidate) => byUid.get(candidate.uid)!).filter(Boolean);
  return {
    eligible: map(recommendations.eligible),
    starter: recommendations.starter ? byUid.get(recommendations.starter.uid) ?? null : null,
    categories: {
      best: map(recommendations.categories.best),
      upgrades: map(recommendations.categories.upgrades),
      value: map(recommendations.categories.value),
      depth: map(recommendations.categories.depth),
      young: map(recommendations.categories.young),
    },
    valueCap: recommendations.valueCap,
  };
}
function dofTable(title: string, description: string, rows: DofCandidate[], mode: string): string {
  const body = rows.slice(0, 8).map((candidate) => {
    const fit = candidate.fit;
    const flags = [
      candidate.retraining ? '<span class="scouting-status">Retraining review</span>' : "",
      fit.confidence === "low" ? '<span class="scouting-status">Low confidence</span>' : "",
      fit.philosophyScore == null ? '<span class="scouting-status">Philosophy unverified</span>' : "",
    ].filter(Boolean).join(" ");
    const principleDetails = fit.principleEvidence.map((principle) =>
      '<span>' + esc(principle.name) + ': <b>' + (principle.score == null ? "—" : principle.score) + '</b></span>'
    ).join("");
    return '<tr><td><strong>' + esc(candidate.player.displayName) + '</strong><small>' + esc(candidate.player.position) + ' · ' + esc(candidate.player.club) + '</small>' + (flags ? '<small>' + flags + '</small>' : '') + '</td>' +
      '<td>' + (fit.roleScore ?? "—") + '<small>Core role</small></td><td><strong>' + (fit.dofEvaluationScore ?? "—") + '</strong><small>' + fit.confidence + ' confidence</small></td>' +
      '<td>' + (fit.philosophyScore ?? "—") + '<small>' + Math.round(fit.philosophyCoverage * 100) + '% evidence</small><details class="scouting-fit-details"><summary>Principles</summary><div>' + principleDetails + '</div></details></td>' +
      '<td>' + (candidate.age ?? "—") + '</td><td>' + esc(candidate.valueText) + '</td><td>' + esc(candidate.wageText) + '</td></tr>';
  }).join("");
  return '<section class="content-card dof-category"><div class="dof-category-heading"><div><h3>' + esc(title) + '</h3><p>' + esc(description) + '</p></div><span>' + rows.length + ' match(es)</span></div>' +
    (body ? '<div class="player-table-wrap"><table class="player-data-table dof-results-table"><thead><tr><th>Candidate</th><th>Role fit</th><th>DoF evaluation</th><th>Philosophy fit</th><th>Age</th><th>Value</th><th>Wage</th></tr></thead><tbody>' + body + '</tbody></table></div>' : '<p class="form-help">No candidates currently meet this category. Adjust the role, filters or financial limits.</p>') +
    (rows.length > 8 ? '<p class="form-help">Showing the top 8 of ' + rows.length + ' matches.</p>' : '') + '</section>';
}

export async function loadPlanningWorkspace(save: SaveWithDatasets | undefined, render: () => void): Promise<void> {
  if (!save || !datasetId) return;
  if (planningDatasetId === datasetId) return;
  planningLoading = true; planningMessage = "Loading the selected season for Director of Football recommendations…"; render();
  try {
    planningRecords = await getDatasetPlayers(datasetId);
    planningDatasetId = datasetId;
    planningMessage = "";
  } catch (error) {
    planningMessage = error instanceof Error ? error.message : "Could not load the selected season.";
  } finally {
    planningLoading = false; render();
  }
}

export function renderPlanningWorkspace(save: SaveWithDatasets | undefined): string {
  if (!save) return '<section class="empty-workspace content-card"><h2>Select a career first.</h2><p>Director of Football recommendations use the active career and its selected season.</p></section>';
  if (!save.datasets.length) return '<section class="empty-workspace content-card"><h2>Import a season to begin.</h2><p>Import FM24 player data before building recommendations.</p></section>';
  const analysis = analysisSettings();
  const config = dofSettings();
  const roles = FM24_ROLES as unknown as Array<{ id: string; name: string; dutyName: string; strata: string; type: string }>;
  const strata = FM24_STRATA as unknown as Record<string, { label: string }>;
  const roleOptions = Object.keys(strata).map((key) => '<optgroup label="' + esc(strata[key].label) + '">' +
    roles.filter((role) => role.strata === key).map((role) => '<option value="' + esc(role.id) + '"' + (analysis.roleId === role.id ? " selected" : "") + '>' + esc(role.name) + ' · ' + esc(role.dutyName) + '</option>').join("") + '</optgroup>').join("");
  const philosophyOptions = Object.entries(FM24_PHILOSOPHY_TEMPLATES).map(([key, template]) =>
    '<option value="' + key + '"' + (analysis.philosophyTemplate === key ? " selected" : "") + '>' + esc(template.name) + '</option>').join("");
  const selectedRole = roles.find((role) => role.id === analysis.roleId);
  const weights = selectedRole && analysis.philosophyTemplate
    ? analysis.customPhilosophyWeightsByRoleType?.[selectedRole.type] ?? philosophyWeightsForRole(selectedRole as never, analysis.philosophyTemplate)
    : [];
  const philosophyControls = selectedRole && analysis.philosophyTemplate
    ? '<div class="scouting-philosophy-editor"><div class="scouting-philosophy-heading"><div><strong>Philosophy weights</strong><p>Custom weights apply to this role family and are saved with the career.</p></div><button type="button" class="text-button" data-reset-philosophy>Reset to template</button></div><div class="scouting-philosophy-sliders">' +
      FM24_PHILOSOPHY_PRINCIPLES.map((principle, index) => '<label><span>' + esc(principle.name) + '</span><input type="range" min="0" max="3" step="0.5" value="' + (weights[index] ?? 0) + '" data-philosophy-weight="' + index + '"><output>' + (weights[index] ?? 0) + '</output></label>').join("") +
      '</div></div>' : "";
  if (planningLoading || planningDatasetId !== datasetId) return '<section class="content-card"><h2>Director of Football recommendations</h2><p>' + esc(planningMessage || "Loading selected season…") + '</p></section>';
  if (planningMessage) return '<section class="content-card"><h2>Director of Football recommendations</h2><p>' + esc(planningMessage) + '</p></section>';
  if (!save.save.club.trim()) return '<section class="content-card"><h2>Set your club first</h2><p>Choose your current club in Data & Saves. V2 uses that club to identify your current squad and compare candidates.</p></section>';
  if (!analysis.roleId || !analysis.philosophyTemplate) return '<section class="content-card"><h2>Configure the recruitment role</h2><p>Select an FM24 role/duty and a philosophy template below to calculate recommendations.</p>' +
    '<div class="scouting-fit-controls"><label>Role and duty<select data-planning-role><option value="">Choose a role…</option>' + roleOptions + '</select></label><label>Philosophy<select data-planning-philosophy><option value="">Choose a profile…</option>' + philosophyOptions + '</select></label></div></section>';
  if (scoringStatus !== "complete") return '<section class="content-card"><h2>Director of Football recommendations</h2><p>' + esc(scoringMessage || "Calculating player fit…") + '</p>' +
    '<div class="scouting-fit-controls"><label>Role and duty<select data-planning-role>' + roleOptions + '</select></label><label>Philosophy<select data-planning-philosophy>' + philosophyOptions + '</select></label></div></section>';
  const currentPlayers = currentClubPlayers(save, analysis.roleId);
  const starterOptions = currentPlayers.map((player) => '<option value="' + esc(player.uid) + '"' + (player.uid === config.starterUid ? " selected" : "") + '>' + esc(player.displayName) + ' · ' + (fitByUid.get(player.uid)?.dofEvaluationScore ?? "—") + '</option>').join("");
  const selected = dofCandidates(save);
  const starter = selected.starter;
  const thresholdOptions = [50, 60, 70].map((value) => '<option value="' + value + '"' + (config.philosophyThreshold === value ? " selected" : "") + '>' + value + ' or higher</option>').join("");
  const categoryHtml =
    dofTable("Best role fits", config.rankingMode === "balanced" ? "Balanced Tactical Fit ranking. Both role and philosophy evidence are required." : "V1-style role-led ranking. Philosophy Fit is an independent signal and tie-breaker, not silently averaged into Role Fit.", selected.categories.best, config.rankingMode) +
    dofTable("Upgrades", "At least 10 points above the selected starter, aged 22–29, with medium or high role-score confidence.", selected.categories.upgrades, config.rankingMode) +
    dofTable("Value options", selected.valueCap == null ? "Set a transfer budget to calculate the V1-style value ceiling." : "At least 3 points above the starter, within the value ceiling (" + formatMillions(selected.valueCap) + "), ranked by score improvement per estimated transfer value.", selected.categories.value, config.rankingMode) +
    dofTable("Squad depth", "Within 10 points of the starter, aged 23–31, high confidence. League-level equivalence is not inferred.", selected.categories.depth, config.rankingMode) +
    dofTable("Young targets", "Players aged 21 or under with at least 300 minutes. Ranked by overall role evaluation, not an age-adjusted score.", selected.categories.young, config.rankingMode);
  return '<section class="content-card planning-dof-workspace"><div class="card-kicker">ROLE-LED RECRUITMENT</div><h2>Director of Football recommendations</h2>' +
    '<p>Role performance and Philosophy Fit stay separate. By default, candidates rank on DoF Role Evaluation; Philosophy Score breaks ties and the threshold below can exclude measured low-fit players. Missing philosophy evidence is not treated as poor fit.</p>' +
    '<div class="scouting-fit-controls"><label>FM24 role and duty<select data-planning-role>' + roleOptions + '</select></label><label>Club philosophy<select data-planning-philosophy>' + philosophyOptions + '</select></label><label>Ranking mode<select data-planning-ranking-mode><option value="role-led"' + (config.rankingMode === "role-led" ? " selected" : "") + '>Role-led (V1 default)</option><option value="balanced"' + (config.rankingMode === "balanced" ? " selected" : "") + '>Balanced Tactical Fit</option></select></label></div>' +
    philosophyControls +
    '<div class="scouting-fit-controls dof-limits"><label>Transfer budget (millions, save currency)<input type="number" min="0" step="0.5" data-planning-budget value="' + (config.budgetMillions ?? "") + '" placeholder="No budget cap"></label>' +
    '<label>Maximum weekly wage (thousands, save currency)<input type="number" min="0" step="1" data-planning-wage value="' + (config.wageThousands ?? "") + '" placeholder="No wage cap"></label>' +
    '<label>Philosophy minimum<select data-planning-threshold><option value="50"' + (config.philosophyThreshold === 50 ? " selected" : "") + '>50 · exclude measured scores below</option><option value="60"' + (config.philosophyThreshold === 60 ? " selected" : "") + '>60 · stricter</option><option value="70"' + (config.philosophyThreshold === 70 ? " selected" : "") + '>70 · strong fit only</option><option value="none"' + (config.philosophyThreshold == null ? " selected" : "") + '>No philosophy filter</option></select></label>' +
    '<label>Compare against<select data-planning-starter><option value="">Best role-qualified player at ' + esc(save.save.club) + '</option>' + starterOptions + '</select></label></div>' +
    '<p class="scouting-score-note">' + (starter ? 'Baseline: ' + esc(starter.player.displayName) + ' · DoF evaluation ' + starter.fit.dofEvaluationScore + ' · core role ' + starter.fit.roleScore + ' · philosophy ' + (starter.fit.philosophyScore ?? "not measured") : 'No role-qualified current player found; upgrade and value thresholds are disabled.') +
    ' · ' + selected.eligible.length.toLocaleString() + ' eligible external candidates. Values and wages are taken from the imported FM24 export.</p>' +
    '<div class="dof-category-grid">' + categoryHtml + '</div>' +
    '<p class="player-data-footnote">Limitations: league strength, likely transfer acceptance, medical risk and tactical execution are not inferred from this export. Transfer value is an estimate, not a negotiated fee. Players outside their listed role position are marked for retraining review. The young-target list is not age-adjusted.</p></section>';
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
  if (target.matches("[data-reset-philosophy]")) {
    const role = (FM24_ROLES as unknown as Array<{ id: string; type: string }>).find((entry) => entry.id === analysisSettings().roleId);
    if (role) {
      const custom = { ...(analysisSettings().customPhilosophyWeightsByRoleType ?? {}) };
      delete custom[role.type];
      state.analysis = { ...analysisSettings(), customPhilosophyWeightsByRoleType: custom };
      await updateScoutingWorkspaceState(saveId, state);
      await runScoring(render);
    }
    return true;
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
  if (target instanceof HTMLSelectElement && target.matches("[data-planning-role]")) {
    state.analysis = { ...analysisSettings(), roleId: target.value };
    await updateScoutingWorkspaceState(saveId, state); await runScoring(render); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-planning-philosophy]")) {
    const current = analysisSettings();
    const role = (FM24_ROLES as unknown as Array<{ id: string; type: string }>).find((entry) => entry.id === current.roleId);
    const custom = { ...(current.customPhilosophyWeightsByRoleType ?? {}) };
    if (role) delete custom[role.type];
    state.analysis = { ...current, philosophyTemplate: target.value as ScoutingAnalysisSettings["philosophyTemplate"], customPhilosophyWeightsByRoleType: custom };
    await updateScoutingWorkspaceState(saveId, state); await runScoring(render); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-planning-starter]")) {
    const config = dofSettings();
    state.analysis = { ...analysisSettings(), dof: { ...config, starterUid: target.value } };
    await updateScoutingWorkspaceState(saveId, state); render(); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-planning-ranking-mode]")) {
    const config = dofSettings();
    state.analysis = { ...analysisSettings(), dof: { ...config, rankingMode: target.value as DofSettings["rankingMode"] } };
    await updateScoutingWorkspaceState(saveId, state); render(); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-planning-threshold]")) {
    const config = dofSettings();
    const threshold = target.value === "none" ? null : Number(target.value);
    state.analysis = { ...analysisSettings(), dof: { ...config, philosophyThreshold: threshold } };
    await updateScoutingWorkspaceState(saveId, state); render(); return true;
  }
  if (target instanceof HTMLInputElement && (target.matches("[data-planning-budget]") || target.matches("[data-planning-wage]"))) {
    const config = dofSettings();
    const parsed = target.value.trim() === "" ? null : Number(target.value);
    const safe = parsed == null ? null : Number.isFinite(parsed) ? Math.max(0, parsed) : null;
    state.analysis = { ...analysisSettings(), dof: target.matches("[data-planning-budget]")
      ? { ...config, budgetMillions: safe }
      : { ...config, wageThousands: safe } };
    await updateScoutingWorkspaceState(saveId, state); render(); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-role]")) {
    state.analysis = { ...analysisSettings(), roleId: target.value };
    await updateScoutingWorkspaceState(saveId, state); await runScoring(render); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-philosophy]")) {
    const current = analysisSettings();
    const role = (FM24_ROLES as unknown as Array<{ id: string; type: string }>).find((entry) => entry.id === current.roleId);
    const custom = { ...(current.customPhilosophyWeightsByRoleType ?? {}) };
    if (role) delete custom[role.type];
    state.analysis = { ...current, philosophyTemplate: target.value as ScoutingAnalysisSettings["philosophyTemplate"], customPhilosophyWeightsByRoleType: custom };
    await updateScoutingWorkspaceState(saveId, state); await runScoring(render); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-role-weight]")) {
    const roleWeight = Number(target.value);
    state.analysis = { ...analysisSettings(), roleWeight: Number.isFinite(roleWeight) ? Math.max(0.6, Math.min(0.8, roleWeight)) : 0.7 };
    fitByUid = new Map([...fitByUid].map(([uid, fit]) => [uid, {
      ...fit,
      tacticalFit: fit.dofEvaluationScore == null || fit.philosophyScore == null ? null
        : Math.round(fit.dofEvaluationScore * state.analysis!.roleWeight + fit.philosophyScore * (1 - state.analysis!.roleWeight)),
    }]));
    await updateScoutingWorkspaceState(saveId, state);
    if (sortField === "tacticalFit") await runSearch(render);
    return true;
  }
  if (target instanceof HTMLInputElement && target.matches("[data-philosophy-weight]")) {
    const current = analysisSettings();
    const role = (FM24_ROLES as unknown as Array<{ id: string; type: string }>).find((entry) => entry.id === current.roleId);
    if (!role || !current.philosophyTemplate) return true;
    const base = current.customPhilosophyWeightsByRoleType?.[role.type] ??
      philosophyWeightsForRole(role as never, current.philosophyTemplate);
    const weights = [...base];
    const index = Number(target.dataset.philosophyWeight);
    if (index < 0 || index >= 6) return true;
    weights[index] = Math.max(0, Math.min(3, Number(target.value)));
    state.analysis = {
      ...current,
      customPhilosophyWeightsByRoleType: { ...(current.customPhilosophyWeightsByRoleType ?? {}), [role.type]: weights },
    };
    await updateScoutingWorkspaceState(saveId, state);
    await runScoring(render);
    return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-dataset]")) {
    datasetId = target.value; planningDatasetId = ""; planningRecords = []; filters = []; query = ""; await runSearch(render); await runScoring(render); return true;
  }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-logic]")) { logic = target.value as "and" | "or"; return true; }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-sort]")) { sortField = target.value; await runSearch(render); return true; }
  if (target instanceof HTMLSelectElement && target.matches("[data-scouting-direction]")) { sortDirection = target.value as "asc" | "desc"; await runSearch(render); return true; }
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
