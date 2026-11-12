import { getDatasetPlayers } from "../data/storage/local-database";
import {
  createFm24Scorer,
  combineTacticalFit,
  philosophyWeightsForRole,
  type Fm24PhilosophyTemplate,
} from "../analytics/fm24-scoring";

interface ScoreRequest {
  requestId: number;
  datasetId: string;
  roleId: string;
  philosophyTemplate: Fm24PhilosophyTemplate | "";
  roleWeight: number;
}
interface ScoreResult {
  uid: string;
  positionEligible: boolean;
  roleScore: number | null;
  dofEvaluationScore: number | null;
  aerialScore: number | null;
  aerialAdjustmentApplied: boolean;
  roleCoverage: number;
  confidence: "low" | "medium" | "high";
  philosophyScore: number | null;
  philosophyCoverage: number;
  principleScores: Array<number | null>;
  roleFamilies: Array<{ family: string; score: number | null; weight: number; available: boolean }>;
  tacticalFit: number | null;
}
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ScoreRequest>) => void) | null;
  postMessage(message: unknown): void;
};

workerScope.onmessage = async (event: MessageEvent<ScoreRequest>) => {
  const request = event.data;
  try {
    workerScope.postMessage({ requestId: request.requestId, phase: "loading" });
    const records = await getDatasetPlayers(request.datasetId);
    const source = records.map((record) => ({
      uid: record.uid,
      displayName: record.displayName,
      position: record.position,
      club: record.club,
      division: record.rawValues.Division ?? "",
      rawValues: record.rawValues,
    }));
    const scorer = createFm24Scorer(source);
    const role = scorer.roles.find((entry) => entry.id === request.roleId);
    if (!role) throw new Error("Choose a valid FM24 role and duty.");

    workerScope.postMessage({ requestId: request.requestId, phase: "scoring", playerCount: records.length });
    const philosophyWeights = request.philosophyTemplate
      ? philosophyWeightsForRole(role, request.philosophyTemplate)
      : undefined;
    const scores: ScoreResult[] = scorer.players.map((player) => {
      const roleResult = scorer.scoreRole(player, role);
      const dofResult = scorer.scoreDofEvaluation(player, role);
      const philosophyResult = request.philosophyTemplate
        ? scorer.scorePhilosophy(player, role, philosophyWeights)
        : null;
      const tactical = philosophyResult
        ? combineTacticalFit(roleResult, philosophyResult, request.roleWeight)
        : null;
      return {
        uid: player.uid ?? "",
        positionEligible: roleResult.families.length > 0,
        roleScore: roleResult.score,
        dofEvaluationScore: dofResult.score,
        aerialScore: dofResult.aerialScore,
        aerialAdjustmentApplied: dofResult.aerialAdjustmentApplied,
        roleCoverage: roleResult.coverage,
        confidence: roleResult.confidence,
        philosophyScore: philosophyResult?.score ?? null,
        philosophyCoverage: philosophyResult?.coverage ?? 0,
        principleScores: philosophyResult?.principles.map((principle) => principle.score) ?? [],
        roleFamilies: roleResult.families.map((family) => ({
          family: family.family, score: family.score, weight: family.configuredWeight, available: family.available,
        })),
        tacticalFit: tactical?.score ?? null,
      };
    });
    workerScope.postMessage({
      requestId: request.requestId,
      phase: "complete",
      scores,
      playerCount: records.length,
      inferredMissingLeagues: [...scorer.gaps.keys()].length,
      seasonProgress: scorer.seasonProgress,
      poolMinimumMinutes: scorer.poolMinimumMinutes,
    });
  } catch (error) {
    workerScope.postMessage({
      requestId: request.requestId,
      phase: "error",
      message: error instanceof Error ? error.message : "Could not calculate FM24 scores.",
    });
  }
};
