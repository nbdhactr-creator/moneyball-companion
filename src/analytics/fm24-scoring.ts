import {
  FM24_PHILOSOPHY_BASE_WEIGHTS,
  FM24_ROLES,
  FM24_STAT_META,
  FM24_STRATA,
} from "./fm24-role-catalog.ts";

export interface Fm24ScoringPlayer {
  uid?: string;
  displayName?: string;
  position: string;
  club?: string;
  division?: string;
  rawValues: Record<string, string>;
}
export interface Fm24Role {
  id: string; type: string; name: string; duty: string; dutyName: string;
  strata: string; slots: string[]; w: Record<string, number>;
  desc?: string; tpl?: string;
}
export interface Fm24MetricMeta {
  group: string; direction: number; derived: boolean; floor: [string, number] | null;
}
export interface NormalizedFm24Player extends Fm24ScoringPlayer {
  minutes: number | null;
  stats: Record<string, number | null>;
  positionSlots: Set<string>;
  inferredMissingByLeague: string[];
}
export interface MetricEvidence {
  metric: string; rawValue: number | null; percentile: number | null;
  configuredWeight: number; available: boolean; reason?: string;
}
export interface RoleFamilyEvidence {
  family: string; configuredWeight: number; score: number | null;
  available: boolean; metrics: MetricEvidence[];
}
export interface Fm24RoleScore {
  score: number | null; coverage: number; availableWeight: number; totalWeight: number;
  coreFamilyAvailable: boolean; confidence: "low" | "medium" | "high";
  minutes: number | null; families: RoleFamilyEvidence[];
}
export interface PhilosophyPrinciple {
  id: string; name: string; description: string; phase: "in-possession" | "out-of-possession" | "physical";
  metrics: string[];
}
export interface PhilosophyPrincipleEvidence {
  id: string; name: string; weight: number; score: number | null;
  metricCoverage: number; metrics: MetricEvidence[];
}
export interface Fm24PhilosophyScore {
  score: number | null; coverage: number; availableWeight: number; totalWeight: number;
  principles: PhilosophyPrincipleEvidence[]; profile: "v1-baseline" | "custom";
}
export interface Fm24DofEvaluation {
  score: number | null;
  displayScore: number | null;
  coreRoleScore: number | null;
  aerialScore: number | null;
  aerialAdjustmentApplied: boolean;
  sampleAdjusted: boolean;
}
export interface TacticalFitScore {
  score: number | null; roleScore: number | null; philosophyScore: number | null;
  roleWeight: number; philosophyWeight: number; status: "complete" | "incomplete";
}

const ROLE_CATALOG = FM24_ROLES as unknown as Fm24Role[];
const STAT_META = FM24_STAT_META as unknown as Record<string, Fm24MetricMeta>;
const STRATA = FM24_STRATA as unknown as Record<string, { label: string; slots: string[] }>;
const DEFAULT_POOL_MINUTES = 900;
const MIN_REFERENCE_POOL = 10;
const MIN_COVERAGE = 0.6;
const PENALTY_XG = 0.79;

const PRINCIPLES: PhilosophyPrinciple[] = [
  { id: "keep", name: "Keep the ball", phase: "in-possession", description: "Retain possession and protect the ball under pressure.", metrics: ["Pas %", "Loss rate"] },
  { id: "avail", name: "Always available", phase: "in-possession", description: "Offer passing options and participate in circulation.", metrics: ["Ps A/90"] },
  { id: "hurt", name: "Move it to hurt", phase: "in-possession", description: "Progress play and create opportunities to threaten goal.", metrics: ["Pr passes/90", "OP-KP/90", "xA/90", "Drb/90"] },
  { id: "win", name: "Win it back quickly", phase: "out-of-possession", description: "Apply pressure, regain possession and disrupt opposition circulation.", metrics: ["Pres A/90", "Pres C/90", "Poss Won/90"] },
  { id: "front", name: "Defend on the front foot", phase: "out-of-possession", description: "Anticipate, challenge and defend proactively.", metrics: ["Int/90", "Tck R", "Hdr %"] },
  { id: "int", name: "Intensity", phase: "physical", description: "Sustain repeat actions and physical output across a match.", metrics: ["Dist/90 km", "Sprints/90"] },
];

const STAT_FAMILIES: Record<string, string[]> = {
  chance_creation: ["OP-KP/90", "K Ps/90", "Ch C/90", "CCC/90", "xA/90", "Asts/90", "npxG+xA/90", "G+A np/90", "A-xA/90", "xA/KP", "OP-KP share"],
  shot_threat: ["npxG/90", "xG/90", "Shot/90", "ShT/90", "Shots Outside Box/90"],
  goal_output: ["Non-pen G/90", "Gls/90"],
  finishing_efficiency: ["npG-npxG/90", "npxG/Shot", "G/SoT", "Shot %", "Conv %", "Pen conv", "Long-shot share"],
  progression: ["Pr passes/90", "Prog/90", "Verticality", "FA/90"],
  dribbling: ["Drb/90"],
  passing_volume: ["Ps A/90", "Ps C/90"],
  possession_security: ["Pas %", "Loss rate", "Passes per loss", "Poss Lost/90"],
  ball_winning: ["Tck W/90", "Tck/90", "TklW+Int/90", "Poss Won/90", "Int/90", "K Tck/90"],
  tackle_quality: ["Tck R", "K Tck share", "Fls/Tck"],
  aerial_volume: ["Hdrs W/90", "K Hdrs/90", "Aer A/90"],
  aerial_quality: ["Hdr %", "K Hdr share", "Hdrs L/90"],
  pressing_volume: ["Pres A/90", "Pres/km"],
  pressing_outcome: ["Pres C/90", "Press success"],
  crossing_volume: ["OP-Crs C/90", "OP-Crs A/90", "Cr C/90"],
  crossing_quality: ["OP-Cr %", "Cr C/A"],
  box_defence: ["Box def/90", "Clr/90", "Blk/90", "Shts Blckd/90", "Def actions/90"],
  physical_engine: ["Sprints/90", "Dist/90 km", "Sprints/km"],
  goalkeeper_shot_stopping: ["xGP/90", "Save %", "Con/90"],
  goalkeeper_claiming: ["Catch rate"],
  goalkeeper_clean_sheets: ["CS/Start"],
  goalkeeper_penalties: ["Pen save %"],
  error_rate: ["Errors/90"],
  discipline: ["Cards/90", "Fls/90"],
  offside_risk: ["Off/90"],
};
const FAMILY_BY_STAT = new Map<string, string>();
for (const [family, metrics] of Object.entries(STAT_FAMILIES)) {
  for (const metric of metrics) if (!FAMILY_BY_STAT.has(metric)) FAMILY_BY_STAT.set(metric, family);
}
function familyOf(metric: string): string { return FAMILY_BY_STAT.get(metric) ?? "single:" + metric; }

const DERIVED_DEPENDENCIES: Record<string, string[]> = {
  "npxG/90": ["xG"], "Non-pen G/90": ["Gls"], "npG-npxG/90": ["xG", "Gls"],
  "npxG/Shot": ["xG", "Shots"], "npxG+xA/90": ["xG", "xA/90"],
  "G+A np/90": ["Gls", "Ast"], "A-xA/90": ["Ast", "xA"],
  "xA/KP": ["xA", "K Pas"], "OP-KP share": ["OP-KP", "K Pas"],
  "Prog/90": ["Pr passes/90", "Drb/90"], "Verticality": ["Pr Passes", "Pas A"],
  "Loss rate": ["Poss Lost/90", "Ps A/90"], "Passes per loss": ["Poss Lost/90", "Ps C"],
  "Tck W/90": ["Tck W"], "TklW+Int/90": ["Tck W", "Itc"], "K Tck share": ["Tck W"],
  "Fls/Tck": ["Tck A"], "Errors/90": ["Gl Mst"], "Cards/90": ["Yel", "Red"],
  "Fls/90": ["Fls"], "Def actions/90": ["Tck W", "Itc", "Blk", "Clear"],
  "Box def/90": ["Blk", "Clear", "Shts Blckd"], "K Hdr share": ["Hdrs W/90"],
  "Press success": ["Pres A", "Pres C"], "Dist/90 km": ["Distance"],
  "Sprints/km": ["Distance", "Sprints/90"], "Pres/km": ["Distance", "Pres A/90"],
  "CCC/90": ["CCC"], "Off/90": ["Off"], "FA/90": ["FA"],
};
const ADVANCED_RAW_FIELDS = [
  "xG", "xG/90", "xG-OP", "xA", "xA/90", "OP-KP", "OP-KP/90", "K Pas", "K Ps/90",
  "Ch C/90", "CCC", "Pres A", "Pres A/90", "Pres C", "Pres C/90", "Pr Passes",
  "Pr passes/90", "Sprints/90", "Distance", "Poss Won/90", "Poss Lost/90", "Drb",
  "Drb/90", "Int/90", "Itc", "Tck A", "Tck W", "Tck/90", "Hdrs A", "Hdrs",
  "Aer A/90", "Hdrs W/90", "OP-Crs A", "OP-Crs A/90", "OP-Crs C", "OP-Crs C/90",
  "Clear", "Clr/90", "Blk", "Blk/90", "Ps A/90", "Pas A", "Ps C", "Ps C/90",
];

function parseNumber(value: string | undefined): number | null {
  if (value == null) return null;
  const cleaned = value.replace(/,/g, "").replace(/%/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "—") return null;
  const match = cleaned.match(/^[+-]?(?:\d+\.?\d*|\.\d+)/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}
function parseDistanceKm(value: string | undefined): number | null {
  if (!value) return null;
  const number = parseNumber(value);
  if (number == null) return null;
  const unit = value.toLowerCase().match(/(km|mi)\b/)?.[1];
  if (unit === "km") return number;
  if (unit === "mi") return number * 1.609344;
  // A bare distance has no trustworthy unit; do not silently label it as kilometres.
  return null;
}
function safeDivide(numerator: number | null, denominator: number | null): number | null {
  return numerator == null || denominator == null || denominator === 0 ? null : numerator / denominator;
}
function per90(value: number | null, minutes: number | null): number | null {
  return value == null || minutes == null || minutes <= 0 ? null : value / minutes * 90;
}
function zero(value: number | null): number { return value ?? 0; }

function positionSlots(position: string): Set<string> {
  const result = new Set<string>();
  const segments = position.split(/,\s*(?![^()]*\))/);
  for (const segment of segments) {
    const match = segment.trim().match(/^([A-Z/]+)\s*(?:\(([RLC]+)\))?$/i);
    if (!match) continue;
    const base = match[1].toUpperCase();
    if (base === "GK" || base === "DM") { result.add(base); continue; }
    const sides = (match[2] || "C").toUpperCase();
    for (const part of base.split("/")) for (const side of sides) result.add(part + "-" + side);
  }
  return result;
}
function isInStrata(player: Pick<NormalizedFm24Player, "positionSlots">, strata: string): boolean {
  return (STRATA[strata]?.slots ?? []).some((slot) => player.positionSlots.has(slot));
}
function normalisePlayer(player: Fm24ScoringPlayer, missingByLeague: Map<string, Set<string>>): NormalizedFm24Player {
  const stats: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(player.rawValues)) stats[key] = parseNumber(value);
  const minutes = stats.Mins ?? null;
  const p90 = (key: string) => per90(stats[key] ?? null, minutes);
  const z = (key: string) => zero(stats[key] ?? null);
  const has = (...keys: string[]) => keys.every((key) => stats[key] != null);
  const divisionKey = (player.division ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const missing = missingByLeague.get(divisionKey) ?? new Set<string>();
  const unavailable = (key: string) => missing.has(key);
  const invalidateIfMissing = (target: string, dependencies: string[]) => {
    if (dependencies.some(unavailable)) stats[target] = null;
  };

  const distanceKm = parseDistanceKm(player.rawValues.Distance);
  const saves = has("Svh", "Svp", "Svt") ? z("Svh") + z("Svp") + z("Svt") : null;
  const savesFaced = saves != null && has("Conc") ? saves + z("Conc") : null;
  stats._saves = saves;
  stats._saves_faced = savesFaced;
  if (savesFaced != null && saves != null) {
    stats["Save %"] = savesFaced > 0 ? saves / savesFaced : null;
    stats["Catch rate"] = saves > 0 ? z("Svh") / saves : null;
    stats["Shots faced/90"] = per90(savesFaced, minutes);
  }
  stats["CS/Start"] = has("Clean Sheets", "Starts") && z("Starts") > 0 ? safeDivide(z("Clean Sheets"), z("Starts")) : null;
  stats["Pen save %"] = has("Pens Saved", "Pens Faced") && z("Pens Faced") > 0 ? safeDivide(z("Pens Saved"), z("Pens Faced")) : null;
  const nonPenaltyXg = has("xG", "Pens") ? z("xG") - PENALTY_XG * z("Pens") : null;
  const nonPenaltyShots = has("Shots", "Pens") ? z("Shots") - z("Pens") : null;
  stats._npshots = nonPenaltyShots;
  stats["npxG/90"] = per90(nonPenaltyXg, minutes);
  stats["Non-pen G/90"] = has("Gls", "Pens S") ? per90(z("Gls") - z("Pens S"), minutes) : null;
  stats["npG-npxG/90"] = stats["Non-pen G/90"] != null && stats["npxG/90"] != null
    ? stats["Non-pen G/90"] - stats["npxG/90"] : null;
  stats["npxG/Shot"] = nonPenaltyXg != null && nonPenaltyShots != null && nonPenaltyShots > 0 ? nonPenaltyXg / nonPenaltyShots : null;
  stats["G/SoT"] = has("Gls", "ShT") && z("ShT") > 0 ? safeDivide(z("Gls"), z("ShT")) : null;
  stats["Long-shot share"] = has("Shots Outside Box/90", "Shot/90") && z("Shot/90") > 0 ? safeDivide(z("Shots Outside Box/90"), z("Shot/90")) : null;
  stats["Off/90"] = p90("Off");
  stats["Pen conv"] = has("Pens", "Pens S") && z("Pens") > 0 ? safeDivide(z("Pens S"), z("Pens")) : null;
  stats["CCC/90"] = p90("CCC");
  stats["npxG+xA/90"] = stats["npxG/90"] != null && stats["xA/90"] != null ? stats["npxG/90"] + stats["xA/90"] : null;
  stats["G+A np/90"] = has("Gls", "Pens S", "Ast") ? per90(z("Gls") - z("Pens S") + z("Ast"), minutes) : null;
  stats["A-xA/90"] = has("Ast", "xA") ? per90(z("Ast") - z("xA"), minutes) : null;
  stats["xA/KP"] = has("xA", "K Pas") && z("K Pas") > 0 ? safeDivide(z("xA"), z("K Pas")) : null;
  stats["OP-KP share"] = has("OP-KP", "K Pas") && z("K Pas") > 0 ? safeDivide(z("OP-KP"), z("K Pas")) : null;
  stats["Prog/90"] = has("Pr passes/90", "Drb/90") ? z("Pr passes/90") + z("Drb/90") : null;
  stats.Verticality = has("Pr Passes", "Pas A") && z("Pas A") > 0 ? safeDivide(z("Pr Passes"), z("Pas A")) : null;
  stats["FA/90"] = p90("FA");
  const lost = has("Poss Lost/90") && minutes != null ? z("Poss Lost/90") * minutes / 90 : null;
  stats["Loss rate"] = has("Poss Lost/90", "Ps A/90", "Drb/90") && (z("Ps A/90") + z("Drb/90")) > 0
    ? z("Poss Lost/90") / (z("Ps A/90") + z("Drb/90")) : null;
  stats["Passes per loss"] = lost != null && lost > 0 && has("Ps C") ? safeDivide(z("Ps C"), lost) : null;
  stats["Tck W/90"] = p90("Tck W");
  stats["TklW+Int/90"] = has("Tck W", "Itc") ? per90(z("Tck W") + z("Itc"), minutes) : null;
  stats["K Tck share"] = has("K Tck", "Tck W") && z("Tck W") > 0 ? safeDivide(z("K Tck"), z("Tck W")) : null;
  stats["Fls/Tck"] = has("Fls", "Tck A") && z("Tck A") > 0 ? safeDivide(z("Fls"), z("Tck A")) : null;
  stats["Errors/90"] = p90("Gl Mst");
  stats["Cards/90"] = has("Yel", "Red") ? per90(z("Yel") + z("Red"), minutes) : null;
  stats["Fls/90"] = p90("Fls");
  stats["Def actions/90"] = has("Tck W", "Itc", "Blk", "Clear") ? per90(z("Tck W") + z("Itc") + z("Blk") + z("Clear"), minutes) : null;
  stats["Box def/90"] = has("Blk", "Clear", "Shts Blckd") ? per90(z("Blk") + z("Clear") + z("Shts Blckd"), minutes) : null;
  stats["K Hdr share"] = has("Hdrs W/90", "K Hdrs/90") && z("Hdrs W/90") > 0 ? safeDivide(z("K Hdrs/90"), z("Hdrs W/90")) : null;
  stats["Press success"] = has("Pres A", "Pres C") && z("Pres A") > 0 ? safeDivide(z("Pres C"), z("Pres A")) : null;
  stats["Dist/90 km"] = per90(distanceKm, minutes);
  stats["Sprints/km"] = has("Sprints/90") && stats["Dist/90 km"] != null && stats["Dist/90 km"] > 0 ? safeDivide(z("Sprints/90"), stats["Dist/90 km"]) : null;
  stats["Pres/km"] = has("Pres A/90") && stats["Dist/90 km"] != null && stats["Dist/90 km"] > 0 ? safeDivide(z("Pres A/90"), stats["Dist/90 km"]) : null;
  stats["Start rate"] = has("Apps", "Starts") && z("Apps") > 0 ? safeDivide(z("Starts"), z("Apps")) : null;
  stats["Mins/App"] = has("Apps", "Mins") && z("Apps") > 0 ? safeDivide(z("Mins"), z("Apps")) : null;
  stats["PoM/Start"] = has("PoM", "Starts") && z("Starts") > 0 ? safeDivide(z("PoM"), z("Starts")) : null;

  for (const [target, dependencies] of Object.entries(DERIVED_DEPENDENCIES)) invalidateIfMissing(target, dependencies);
  // A league-wide absence of an advanced source field is treated as missing, not as genuine zero.
  for (const field of missing) stats[field] = null;
  for (const [target, dependencies] of Object.entries(DERIVED_DEPENDENCIES)) invalidateIfMissing(target, dependencies);

  return {
    ...player, minutes, stats, positionSlots: positionSlots(player.position ?? ""),
    inferredMissingByLeague: [...missing],
  };
}

function detectLeagueMissingFields(players: Fm24ScoringPlayer[]): Map<string, Set<string>> {
  const byLeague = new Map<string, Fm24ScoringPlayer[]>();
  const globalNonZero = new Map<string, number>();
  for (const player of players) {
    const division = player.division ?? "";
    const key = division.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (!byLeague.has(key)) byLeague.set(key, []);
    byLeague.get(key)!.push(player);
    const minutes = parseNumber(player.rawValues.Mins);
    if (minutes == null || minutes < 90) continue;
    for (const field of ADVANCED_RAW_FIELDS) {
      const value = parseNumber(player.rawValues[field]);
      if (value != null && value !== 0) globalNonZero.set(field, (globalNonZero.get(field) ?? 0) + 1);
    }
  }
  const gaps = new Map<string, Set<string>>();
  for (const [league, rows] of byLeague) {
    if (!league) continue;
    const eligible = rows.filter((player) => (parseNumber(player.rawValues.Mins) ?? 0) >= 90);
    const totalMinutes = eligible.reduce((sum, player) => sum + (parseNumber(player.rawValues.Mins) ?? 0), 0);
    if (eligible.length < 10 || totalMinutes < 15000) continue;
    const missing = new Set<string>();
    for (const field of ADVANCED_RAW_FIELDS) {
      if (eligible.some((player) => parseNumber(player.rawValues[field]) != null && parseNumber(player.rawValues[field]) !== 0)) continue;
      if ((globalNonZero.get(field) ?? 0) >= 50) missing.add(field);
    }
    if (missing.size) gaps.set(league, missing);
  }
  return gaps;
}

function leagueFactorFor(division: string | undefined, factors?: Record<string, number>): number {
  if (!division || !factors) return 1;
  const key = division.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const match = Object.entries(factors).find(([name]) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === key);
  if (!match) return 1;
  const factor = match[1];
  return Number.isFinite(factor) ? Math.max(0.25, Math.min(3, factor)) : 1;
}
function metricValue(player: NormalizedFm24Player, metric: string, leagueFactors?: Record<string, number>): number | null {
  const value = player.stats[metric] ?? null;
  if (value == null) return null;
  // V1 adjusts rate/volume metrics only. Percentages and efficiency rates stay untouched.
  return /\/90\b/.test(metric) ? value * leagueFactorFor(player.division, leagueFactors) : value;
}
function floorSatisfied(player: NormalizedFm24Player, metric: string): boolean {
  const floor = STAT_META[metric]?.floor;
  if (!floor) return true;
  const value = player.stats[floor[0]];
  return value != null && value >= floor[1];
}
function shrinkScore(score: number | null, minutes: number | null, highConfidenceMinutes: number, enabled: boolean): number | null {
  if (score == null || !enabled) return score;
  const weight = Math.min(1, Math.sqrt(Math.max(0, minutes ?? 0) / Math.max(1, highConfidenceMinutes)));
  return Math.round(50 + (score - 50) * weight);
}

function percentile(value: number, sorted: number[], direction: number): number | null {
  if (sorted.length < MIN_REFERENCE_POOL) return null;
  let low = 0, high = sorted.length;
  while (low < high) { const mid = (low + high) >>> 1; if (sorted[mid] < value) low = mid + 1; else high = mid; }
  const below = low;
  low = below; high = sorted.length;
  while (low < high) { const mid = (low + high) >>> 1; if (sorted[mid] <= value) low = mid + 1; else high = mid; }
  const rank = (below + 0.5 * (low - below)) / sorted.length * 100;
  return Math.round((direction < 0 ? 100 - rank : rank) * 10) / 10;
}

export interface Fm24ScoringOptions {
  poolMinimumMinutes?: number;
  seasonProgress?: 0.25 | 0.5 | 0.75 | 1;
  leagueFactors?: Record<string, number>;
  philosophyWeightsByRoleType?: Record<string, number[]>;
  philosophyMetricCoverage?: number;
  minimumScoreCoverage?: number;
  shrinkSmallSamples?: boolean;
}
export function inferFm24SeasonProgress(sourcePlayers: Fm24ScoringPlayer[]): 0.25 | 0.5 | 0.75 | 1 {
  const minutes = sourcePlayers.map((player) => parseNumber(player.rawValues.Mins) ?? 0)
    .filter((value) => value > 0).sort((a, b) => b - a).slice(0, 50);
  if (!minutes.length) return 1;
  const reference = minutes[Math.min(25, minutes.length - 1)] ?? 0;
  const ratio = reference / 4400;
  return ratio >= 0.85 ? 1 : ratio >= 0.6 ? 0.75 : ratio >= 0.35 ? 0.5 : 0.25;
}
export function createFm24Scorer(sourcePlayers: Fm24ScoringPlayer[], options: Fm24ScoringOptions = {}) {
  const seasonProgress = options.seasonProgress ?? inferFm24SeasonProgress(sourcePlayers);
  const poolMinimumMinutes = options.poolMinimumMinutes ?? Math.max(600, Math.round(DEFAULT_POOL_MINUTES * seasonProgress));
  const highConfidenceMinutes = Math.round(2000 * seasonProgress);
  const mediumConfidenceMinutes = Math.round(1200 * seasonProgress);
  const minCoverage = options.minimumScoreCoverage ?? MIN_COVERAGE;
  const gaps = detectLeagueMissingFields(sourcePlayers);
  const players = sourcePlayers.map((player) => normalisePlayer(player, gaps));
  const percentilePools = new Map<string, number[]>();
  const poolFor = (strata: string, metric: string): number[] => {
    const key = strata + "|" + metric;
    const cached = percentilePools.get(key);
    if (cached) return cached;
    const values = players
      .filter((player) => (player.minutes ?? 0) >= poolMinimumMinutes && isInStrata(player, strata) && floorSatisfied(player, metric))
      .map((player) => metricValue(player, metric, options.leagueFactors))
      .filter((value): value is number => value != null)
      .sort((a, b) => a - b);
    percentilePools.set(key, values);
    return values;
  };
  const metricEvidence = (player: NormalizedFm24Player, metric: string, strata: string, weight = 1): MetricEvidence => {
    const rawValue = metricValue(player, metric, options.leagueFactors);
    if (rawValue == null) return { metric, rawValue: null, percentile: null, configuredWeight: weight, available: false, reason: "Metric is not present or could not be derived." };
    if (!floorSatisfied(player, metric)) return { metric, rawValue, percentile: null, configuredWeight: weight, available: false, reason: "Minimum attempt/sample requirement not met." };
    const score = percentile(rawValue, poolFor(strata, metric), STAT_META[metric]?.direction ?? 1);
    return { metric, rawValue, percentile: score, configuredWeight: weight, available: score != null, reason: score == null ? "Fewer than 10 eligible players in the comparison group." : undefined };
  };
  const scoreRole = (player: NormalizedFm24Player, roleOrId: Fm24Role | string): Fm24RoleScore => {
    const role = typeof roleOrId === "string" ? ROLE_CATALOG.find((item) => item.id === roleOrId) : roleOrId;
    if (!role) throw new Error("Unknown FM24 role/duty identifier.");
    if (!isInStrata(player, role.strata)) return {
      score: null, coverage: 0, availableWeight: 0, totalWeight: 0, coreFamilyAvailable: false,
      confidence: "low", minutes: player.minutes, families: [],
    };
    const groups = new Map<string, Array<{ metric: string; weight: number }>>();
    for (const [metric, weight] of Object.entries(role.w)) {
      const family = familyOf(metric);
      if (!groups.has(family)) groups.set(family, []);
      groups.get(family)!.push({ metric, weight });
    }
    const families: RoleFamilyEvidence[] = [];
    let totalWeight = 0, availableWeight = 0, weightedScore = 0;
    let highestWeight = -Infinity, coreFamilyAvailable = false;
    for (const [family, metrics] of groups) {
      const familyWeight = Math.max(...metrics.map((entry) => entry.weight));
      totalWeight += familyWeight;
      const evidence = metrics.map((entry) => metricEvidence(player, entry.metric, role.strata, entry.weight));
      const available = evidence.filter((entry) => entry.percentile != null);
      if (familyWeight > highestWeight) { highestWeight = familyWeight; coreFamilyAvailable = available.length > 0; }
      else if (familyWeight === highestWeight && available.length) coreFamilyAvailable = true;
      const familyScore = available.length
        ? available.reduce((sum, entry) => sum + (entry.percentile! * entry.configuredWeight), 0) /
          available.reduce((sum, entry) => sum + entry.configuredWeight, 0)
        : null;
      if (familyScore != null) {
        availableWeight += familyWeight;
        weightedScore += familyScore * familyWeight;
      }
      families.push({ family, configuredWeight: familyWeight, score: familyScore == null ? null : Math.round(familyScore), available: familyScore != null, metrics: evidence });
    }
    const coverage = totalWeight ? availableWeight / totalWeight : 0;
    const score = totalWeight && coreFamilyAvailable && coverage >= minCoverage
      ? Math.round(weightedScore / availableWeight) : null;
    return {
      score, coverage, availableWeight, totalWeight, coreFamilyAvailable,
      confidence: (player.minutes ?? 0) >= highConfidenceMinutes ? "high" : (player.minutes ?? 0) >= mediumConfidenceMinutes ? "medium" : "low",
      minutes: player.minutes, families,
    };
  };
  const scorePhilosophy = (
    player: NormalizedFm24Player,
    roleOrId: Fm24Role | string,
    customWeights?: number[],
  ): Fm24PhilosophyScore => {
    const role = typeof roleOrId === "string" ? ROLE_CATALOG.find((item) => item.id === roleOrId) : roleOrId;
    if (!role) throw new Error("Unknown FM24 role/duty identifier.");
    if (!isInStrata(player, role.strata)) return { score: null, coverage: 0, availableWeight: 0, totalWeight: 0, principles: [], profile: customWeights ? "custom" : "v1-baseline" };
    const baseWeights = options.philosophyWeightsByRoleType?.[role.type] ?? FM24_PHILOSOPHY_BASE_WEIGHTS[role.type as keyof typeof FM24_PHILOSOPHY_BASE_WEIGHTS] ?? [2, 2, 2, 2, 1, 2];
    const weights = customWeights ?? [...baseWeights];
    if (weights.length !== PRINCIPLES.length || weights.some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 3)) {
      throw new Error("Philosophy weights must contain six values from 0 to 3.");
    }
    const principleCoverage = options.philosophyMetricCoverage ?? 0.6;
    const principles: PhilosophyPrincipleEvidence[] = PRINCIPLES.map((principle, index) => {
      const metrics = principle.metrics.map((metric) => metricEvidence(player, metric, role.strata));
      const available = metrics.filter((entry) => entry.percentile != null);
      const coverage = principle.metrics.length ? available.length / principle.metrics.length : 0;
      const minimumMetrics = Math.max(1, Math.ceil(principle.metrics.length * principleCoverage));
      const score = available.length >= minimumMetrics
        ? Math.round(available.reduce((sum, entry) => sum + entry.percentile!, 0) / available.length) : null;
      return { id: principle.id, name: principle.name, weight: weights[index], score, metricCoverage: coverage, metrics };
    });
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const available = principles.filter((principle) => principle.weight > 0 && principle.score != null);
    const availableWeight = available.reduce((sum, principle) => sum + principle.weight, 0);
    const coverage = totalWeight ? availableWeight / totalWeight : 0;
    const score = totalWeight && coverage >= minCoverage
      ? Math.round(available.reduce((sum, principle) => sum + principle.score! * principle.weight, 0) / availableWeight) : null;
    return { score, coverage, availableWeight, totalWeight, principles, profile: customWeights ? "custom" : "v1-baseline" };
  };
  const getPercentile = (player: NormalizedFm24Player, metric: string, strata: string) =>
    metricEvidence(player, metric, strata).percentile;
  const scoreDofEvaluation = (player: NormalizedFm24Player, roleOrId: Fm24Role | string, suppliedCoreScore?: number | null): Fm24DofEvaluation => {
    const role = typeof roleOrId === "string" ? ROLE_CATALOG.find((item) => item.id === roleOrId) : roleOrId;
    if (!role) throw new Error("Unknown FM24 role/duty identifier.");
    const coreRoleScore = suppliedCoreScore === undefined ? scoreRole(player, role).score : suppliedCoreScore;
    if (coreRoleScore == null || !["DC", "DLR", "WB", "DM"].includes(role.strata)) {
      const displayScore = shrinkScore(coreRoleScore, player.minutes, highConfidenceMinutes, options.shrinkSmallSamples ?? false);
      return { score: coreRoleScore, displayScore, coreRoleScore, aerialScore: null, aerialAdjustmentApplied: false, sampleAdjusted: displayScore !== coreRoleScore };
    }
    const aerialQuality = getPercentile(player, "Hdr %", role.strata);
    const aerialOutput = ["Hdrs W/90", "K Hdrs/90"]
      .map((metric) => getPercentile(player, metric, role.strata))
      .filter((value): value is number => value != null);
    if (aerialQuality == null || !aerialOutput.length) {
      return { score: coreRoleScore, coreRoleScore, aerialScore: null, aerialAdjustmentApplied: false };
    }
    const aerialScore = Math.round((aerialQuality + aerialOutput.reduce((sum, value) => sum + value, 0) / aerialOutput.length) / 2);
    const score = Math.round(coreRoleScore * 0.9 + aerialScore * 0.1);
    const displayScore = shrinkScore(score, player.minutes, highConfidenceMinutes, options.shrinkSmallSamples ?? false);
    return {
      score, displayScore, coreRoleScore, aerialScore, aerialAdjustmentApplied: true,
      sampleAdjusted: displayScore !== score,
    };
  };
  return {
    players, gaps, roles: ROLE_CATALOG, principles: PRINCIPLES,
    scoreRole, scorePhilosophy, scoreDofEvaluation, getPercentile,
    poolMinimumMinutes, seasonProgress, highConfidenceMinutes, mediumConfidenceMinutes,
  };
}

/**
 * A combined tactical-fit indicator for DoF sorting. The component scores remain
 * visible and independent. Missing evidence is never silently replaced with zero
 * or a neutral 50; incomplete combinations return null.
 *
 * The 70/30 split is a transparent product default, not a scientific constant.
 * Callers may expose the roleWeight setting to the user.
 */
export function combineTacticalFit(
  role: Fm24RoleScore,
  philosophy: Fm24PhilosophyScore,
  roleWeight = 0.7,
): TacticalFitScore {
  const boundedRoleWeight = Math.max(0.5, Math.min(0.9, roleWeight));
  const philosophyWeight = 1 - boundedRoleWeight;
  const complete = role.score != null && philosophy.score != null;
  return {
    score: complete ? Math.round(role.score! * boundedRoleWeight + philosophy.score! * philosophyWeight) : null,
    roleScore: role.score, philosophyScore: philosophy.score,
    roleWeight: boundedRoleWeight, philosophyWeight, status: complete ? "complete" : "incomplete",
  };
}


export type Fm24PhilosophyTemplate = "possession" | "counter" | "direct" | "balanced" | "lowblock" | "wing" | "positional" | "press" | "physical";
export const FM24_PHILOSOPHY_TEMPLATES: Record<Fm24PhilosophyTemplate, { name: string; description: string }> = {
  possession: { name: "Possession", description: "Keep the ball, play through the lines and win it back early." },
  counter: { name: "Counter-press", description: "Win it back high and fast. Intensity and pressing over control." },
  direct: { name: "Direct", description: "Get the ball forward quickly. Runners, duels and threat over patient build-up." },
  balanced: { name: "Balanced", description: "Every principle counts the same in every role that uses it." },
  lowblock: { name: "Low block and counter", description: "Defend deep and compact, then break at pace. Defending and forward passing over keeping the ball." },
  wing: { name: "Wing play", description: "Width, runs down the flanks and a threat in the air. Wide players carry the ball forward; strikers win headers." },
  positional: { name: "Positional play", description: "Possession with a purpose: secure, always an option and progressing the ball through the lines." },
  press: { name: "High-intensity press", description: "Hunt the ball high up the pitch for ninety minutes. Pressing and running above everything." },
  physical: { name: "Physical", description: "Win the duels, the headers and the second balls, and outrun the opposition." },
};

export function philosophyWeightsForRole(
  roleOrId: Fm24Role | string,
  template: Fm24PhilosophyTemplate,
): number[] {
  const role = typeof roleOrId === "string" ? ROLE_CATALOG.find((item) => item.id === roleOrId) : roleOrId;
  if (!role) throw new Error("Unknown FM24 role/duty identifier.");
  const base = [...(FM24_PHILOSOPHY_BASE_WEIGHTS[role.type as keyof typeof FM24_PHILOSOPHY_BASE_WEIGHTS] ?? [2, 2, 2, 2, 1, 2])];
  const cap = (value: number) => Math.max(0, Math.min(3, value));
  switch (template) {
    case "possession": return base;
    case "counter": return [cap(base[0] - 1), base[1], base[2], cap(base[3] + 1), base[4], cap(base[5] + 1)];
    case "direct": return [cap(base[0] - 2), cap(base[1] - 1), cap(base[2] + 1), base[3], base[4], cap(base[5] + 1)];
    case "balanced": return base.map((weight) => weight ? 2 : 0);
    case "lowblock": return role.strata === "GK" ? base : [cap(base[0] - 2), cap(base[1] - 1), cap(base[2] + 1), cap(base[3] - 1), cap(base[4] + 1), base[5]];
    case "wing":
      if (role.strata === "GK") return base;
      if (["DLR", "WB", "MLR", "AMLR"].includes(role.strata)) return [base[0], cap(base[1] + 1), cap(base[2] + 1), base[3], base[4], cap(base[5] + 1)];
      if (role.strata === "ST") return [cap(base[0] - 1), base[1], base[2], base[3], cap(base[4] + 2), base[5]];
      return [base[0], base[1], cap(base[2] + 1), base[3], base[4], base[5]];
    case "positional":
      return role.strata === "GK"
        ? [cap(base[0] + 1), cap(base[1] + 1), base[2], base[3], base[4], base[5]]
        : [cap(base[0] + 1), cap(base[1] + 1), cap(base[2] + 1), base[3], base[4], cap(base[5] - 1)];
    case "press":
      return role.strata === "GK" ? base : [cap(base[0] - 1), base[1], base[2], cap(Math.max(2, base[3] + 1)), cap(base[4] + 1), 3];
    case "physical":
      return role.strata === "GK" ? base : [cap(base[0] - 1), base[1], base[2], cap(base[3] + 1), cap(base[4] + 2), cap(base[5] + 2)];
  }
}

export const FM24_PHILOSOPHY_PRINCIPLES = PRINCIPLES;
export const FM24_ROLE_COUNT = ROLE_CATALOG.length;
export const FM24_ROLE_MINUTES_DEFAULT = DEFAULT_POOL_MINUTES;
