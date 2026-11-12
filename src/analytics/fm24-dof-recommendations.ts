/**
 * Explainable FM24 Director of Football recommendation ranking.
 *
 * Role evaluation remains the primary signal by default, with Philosophy Fit
 * used as an independent threshold and tie-breaker. Balanced ranking is an
 * explicit alternative and requires both component scores.
 */
export type Fm24DofRankingMode = "role-led" | "balanced";
export interface Fm24DofCandidate {
  uid: string;
  name: string;
  club: string;
  age: number | null;
  minutes: number;
  transferValue: number | null;
  transferValueLabel: string;
  wage: number | null;
  wageLabel: string;
  notForSale: boolean;
  positionEligible: boolean;
  listedForRole: boolean;
  roleScore: number | null;
  dofEvaluationScore: number | null;
  philosophyScore: number | null;
  tacticalFit: number | null;
  confidence: "low" | "medium" | "high";
}
export interface Fm24DofRecommendationOptions {
  currentClub: string;
  starterUid?: string;
  budget?: number | null;
  wageCap?: number | null;
  philosophyThreshold?: number | null;
  requireKnownValue?: boolean;
  rankingMode?: Fm24DofRankingMode;
  poolMinimumMinutes?: number;
  prospectMinimumMinutes?: number;
}
export interface Fm24DofRecommendations {
  starter: Fm24DofCandidate | null;
  eligible: Fm24DofCandidate[];
  categories: {
    best: Fm24DofCandidate[];
    upgrades: Fm24DofCandidate[];
    value: Fm24DofCandidate[];
    depth: Fm24DofCandidate[];
    young: Fm24DofCandidate[];
  };
  valueCap: number | null;
  depthCap: number | null;
}
const confidenceOkay = (candidate: Fm24DofCandidate): boolean => candidate.confidence !== "low";
const roleSort = (a: Fm24DofCandidate, b: Fm24DofCandidate): number =>
  (b.dofEvaluationScore ?? -1) - (a.dofEvaluationScore ?? -1) ||
  (b.philosophyScore ?? -1) - (a.philosophyScore ?? -1);
function passesFinancialAndPhilosophyFilters(
  candidate: Fm24DofCandidate,
  options: Fm24DofRecommendationOptions,
): boolean {
  if (candidate.notForSale) return false;
  if (options.budget != null) {
    if (options.requireKnownValue && candidate.transferValue == null) return false;
    if (candidate.transferValue != null && candidate.transferValue > options.budget) return false;
  }
  if (options.wageCap != null && candidate.wage != null && candidate.wage > options.wageCap) return false;
  if (options.philosophyThreshold != null && candidate.philosophyScore != null &&
      candidate.philosophyScore < options.philosophyThreshold) return false;
  return true;
}
export function buildFm24DofRecommendations(
  players: Fm24DofCandidate[],
  options: Fm24DofRecommendationOptions,
): Fm24DofRecommendations {
  const currentClub = options.currentClub.trim().toLocaleLowerCase();
  const poolMinimum = Math.max(0, options.poolMinimumMinutes ?? 900);
  const prospectMinimum = Math.max(0, options.prospectMinimumMinutes ?? 300);
  const ownPlayers = players.filter((candidate) =>
    candidate.club.trim().toLocaleLowerCase() === currentClub &&
    candidate.positionEligible && candidate.listedForRole &&
    candidate.minutes >= 450 && candidate.dofEvaluationScore != null
  );
  const starter = ownPlayers.find((candidate) => candidate.uid === options.starterUid) ??
    ownPlayers.slice().sort(roleSort)[0] ?? null;
  const external = players.filter((candidate) =>
    candidate.club.trim().toLocaleLowerCase() !== currentClub &&
    candidate.positionEligible && candidate.dofEvaluationScore != null &&
    passesFinancialAndPhilosophyFilters(candidate, options)
  );
  const eligible = external.filter((candidate) => candidate.minutes >= poolMinimum);
  const baseline = starter?.dofEvaluationScore ?? 0;
  const best = eligible.filter((candidate) =>
    options.rankingMode !== "balanced" || candidate.tacticalFit != null
  ).slice().sort(options.rankingMode === "balanced"
    ? (a, b) => (b.tacticalFit ?? -1) - (a.tacticalFit ?? -1) || roleSort(a, b)
    : roleSort);
  const upgrades = starter ? eligible.filter((candidate) =>
    candidate.dofEvaluationScore! >= baseline + 10 &&
    candidate.age != null && candidate.age >= 22 && candidate.age <= 29 &&
    confidenceOkay(candidate) &&
    (options.budget == null || candidate.transferValue == null || candidate.transferValue <= options.budget / 2)
  ).sort(roleSort) : [];
  const valueCap = options.budget == null ? null : Math.max(5e5, Math.min(3e6, options.budget * 0.15));
  const value = starter && valueCap != null ? eligible.filter((candidate) =>
    candidate.transferValue != null && candidate.transferValue <= valueCap &&
    candidate.dofEvaluationScore! >= baseline + 3 && confidenceOkay(candidate)
  ).sort((a, b) =>
    ((b.dofEvaluationScore! - baseline + 1) / Math.max(b.transferValue!, 5e5)) -
    ((a.dofEvaluationScore! - baseline + 1) / Math.max(a.transferValue!, 5e5))
  ) : [];
  const depthCap = options.budget == null ? null : Math.max(4e5, Math.min(2.5e6, options.budget * 0.12));
  const depth = starter ? eligible.filter((candidate) =>
    candidate.dofEvaluationScore! >= baseline - 10 &&
    candidate.age != null && candidate.age >= 23 && candidate.age <= 31 &&
    candidate.confidence === "high" &&
    (depthCap == null || candidate.transferValue == null || candidate.transferValue <= depthCap)
  ).sort(roleSort) : [];
  const young = external.filter((candidate) =>
    candidate.age != null && candidate.age <= 21 && candidate.minutes >= prospectMinimum
  ).sort(roleSort);
  return { starter, eligible, categories: { best, upgrades, value, depth, young }, valueCap, depthCap };
}
