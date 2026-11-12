import {
  FM24_PHILOSOPHY_BASE_WEIGHTS,
  FM24_ROLES,
  FM24_STAT_META,
  FM24_STRATA,
} from "./fm24-role-catalog";

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
  const divisionKey = (player.division ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const missing = missingByLeague.get(divisionKey) ?? new Set<string>();
  const unavailable = (key: string) => missing.has(key);
  const invalidateIfMissing = (target: string, dependencies: string[]) => {
    if (dependencies.some(unavailable)) stats[target] = null;
  };

  const distanceKm = parseDistanceKm(player.rawValues.Distance);
  const saves = z("Svh") + z("Svp") + z("Svt");
  const savesFaced = saves + z("Conc");
  if (stats.Svh != null && stats.Conc != null) {
    stats["Save %"] = savesFaced ? saves / savesFaced : null;
    stats["Catch rate"] = saves ? z("Svh") / saves : null;
    stats["Shots faced/90"] = per90(savesFaced, minutes);
    stats["CS/Start"] = stats.Starts ? safeDivide(stats["Clean Sheets"] ?? 0, stats.Starts) : null;
    stats["Pen save %"] = stats["Pens Faced"] ? safeDivide(stats["Pens Saved"] ?? 0, stats["Pens Faced"]) : null;
  }
  const nonPenaltyXg = stats.xG == null ? null : stats.xG - PENALTY_XG * z("Pens");
  const nonPenaltyShots = stats.Shots == null ? null : stats.Shots - z("Pens");
  stats["npxG/90"] = per90(nonPenaltyXg, minutes);
  stats["Non-pen G/90"] = stats.Gls == null ? null : per90(stats.Gls - z("Pens S"), minutes);
  stats["npG-npxG/90"] = stats["Non-pen G/90"] != null && stats["npxG/90"] != null
    ? stats["Non-pen G/90"] - stats["npxG/90"] : null;
  stats["npxG/Shot"] = nonPenaltyXg != null && nonPenaltyShots != null && nonPenaltyShots > 0 ? nonPenaltyXg / nonPenaltyShots : null;
  stats["G/SoT"] = stats.ShT ? safeDivide(stats.Gls ?? 0, stats.ShT) : null;
  stats["Long-shot share"] = stats["Shot/90"] ? safeDivide(stats["Shots Outside Box/90"] ?? null, stats["Shot/90"]) : null;
  stats["Off/90"] = p90("Off");
  stats["Pen conv"] = stats.Pens ? safeDivide(stats["Pens S"] ?? 0, stats.Pens) : null;
  stats["CCC/90"] = p90("CCC");
  stats["npxG+xA/90"] = stats["npxG/90"] != null && stats["xA/90"] != null ? stats["npxG/90"] + stats["xA/90"] : null;
  stats["G+A np/90"] = stats.Gls == null ? null : per90(stats.Gls - z("Pens S") + z("Ast"), minutes);
  stats["A-xA/90"] = stats.Ast != null && stats.xA != null ? per90(stats.Ast - stats.xA, minutes) : null;
  stats["xA/KP"] = stats["K Pas"] ? safeDivide(stats.xA ?? null, stats["K Pas"]) : null;
  stats["OP-KP share"] = stats["K Pas"] ? safeDivide(stats["OP-KP"] ?? null, stats["K Pas"]) : null;
  stats["Prog/90"] = stats["Pr passes/90"] != null || stats["Drb/90"] != null ? z("Pr passes/90") + z("Drb/90") : null;
  stats.Verticality = stats["Pas A"] ? safeDivide(stats["Pr Passes"] ?? 0, stats["Pas A"]) : null;
  stats["FA/90"] = p90("FA");
  const lost = stats["Poss Lost/90"] != null && minutes != null ? stats["Poss Lost/90"] * minutes / 90 : null;
  stats["Loss rate"] = stats["Poss Lost/90"] != null && (z("Ps A/90") + z("Drb/90")) > 0
    ? stats["Poss Lost/90"] / (z("Ps A/90") + z("Drb/90")) : null;
  stats["Passes per loss"] = lost ? safeDivide(stats["Ps C"] ?? null, lost) : null;
  stats["Tck W/90"] = p90("Tck W");
  stats["TklW+Int/90"] = stats["Tck W"] != null || stats.Itc != null ? per90(z("Tck W") + z("Itc"), minutes) : null;
  stats["K Tck share"] = stats["Tck W"] ? safeDivide(stats["K Tck"] ?? 0, stats["Tck W"]) : null;
  stats["Fls/Tck"] = stats["Tck A"] ? safeDivide(stats.Fls ?? 0, stats["Tck A"]) : null;
  stats["Errors/90"] = p90("Gl Mst");
  stats["Cards/90"] = per90(z("Yel") + z("Red"), minutes);
  stats["Fls/90"] = p90("Fls");
  stats["Def actions/90"] = per90(z("Tck W") + z("Itc") + z("Blk") + z("Clear"), minutes);
  stats["Box def/90"] = per90(z("Blk") + z("Clear") + z("Shts Blckd"), minutes);
  stats["K Hdr share"] = stats["Hdrs W/90"] ? safeDivide(stats["K Hdrs/90"] ?? null, stats["Hdrs W/90"]) : null;
  stats["Press success"] = stats["Pres A"] ? safeDivide(stats["Pres C"] ?? 0, stats["Pres A"]) : null;
  stats["Dist/90 km"] = per90(distanceKm, minutes);
  stats["Sprints/km"] = stats["Dist/90 km"] ? safeDivide(stats["Sprints/90"] ?? null, stats["Dist/90 km"]) : null;
  stats["Pres/km"] = stats["Dist/90 km"] ? safeDivide(stats["Pres A/90"] ?? null, stats["Dist/90 km"]) : null;
  stats["Start rate"] = stats.Apps ? safeDivide(stats.Starts ?? 0, stats.Apps) : null;
  stats["Mins/App"] = stats.Apps ? safeDivide(minutes, stats.Apps) : null;
  stats["PoM/Start"] = stats.Starts ? safeDivide(stats.PoM ?? 0, stats.Starts) : null;

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
  leagueFactors?: Record<string, number>;
  philosophyWeightsByRoleType?: Record<string, number[]>;
  philosophyMetricCoverage?: number;
  minimumScoreCoverage?: number;
}
export function createFm24Scorer(sourcePlayers: Fm24ScoringPlayer[], options: Fm24ScoringOptions = {}) {
  const poolMinimumMinutes = options.poolMinimumMinutes ?? DEFAULT_POOL_MINUTES;
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
      confidence: (player.minutes ?? 0) >= 2000 ? "high" : (player.minutes ?? 0) >= 1200 ? "medium" : "low",
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
    const highestWeight = Math.max(...weights);
    const coreAvailable = highestWeight > 0 && principles.some((principle) => principle.weight === highestWeight && principle.score != null);
    const coverage = totalWeight ? availableWeight / totalWeight : 0;
    const score = totalWeight && coreAvailable && coverage >= minCoverage
      ? Math.round(available.reduce((sum, principle) => sum + principle.score! * principle.weight, 0) / availableWeight) : null;
    return { score, coverage, availableWeight, totalWeight, principles, profile: customWeights ? "custom" : "v1-baseline" };
  };
  const getPercentile = (player: NormalizedFm24Player, metric: string, strata: string) =>
    metricEvidence(player, metric, strata).percentile;
  return {
    players, gaps, roles: ROLE_CATALOG, principles: PRINCIPLES,
    scoreRole, scorePhilosophy, getPercentile,
    poolMinimumMinutes,
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

export const FM24_PHILOSOPHY_PRINCIPLES = PRINCIPLES;
export const FM24_ROLE_COUNT = ROLE_CATALOG.length;
export const FM24_ROLE_MINUTES_DEFAULT = DEFAULT_POOL_MINUTES;
