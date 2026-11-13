import { getDatasetPlayers } from "../data/storage/local-database";
import { createFm24Scorer } from "./fm24-scoring";

interface Request { requestId: number; datasetId: string; roleId: string; }
const scope = self as unknown as { onmessage: ((event: MessageEvent<Request>) => void) | null; postMessage(message: unknown): void };

scope.onmessage = async (event: MessageEvent<Request>) => {
  const { requestId, datasetId, roleId } = event.data;
  try {
    scope.postMessage({ requestId, phase: "loading" });
    const records = await getDatasetPlayers(datasetId);
    const source = records.map((record) => ({
      uid: record.uid, displayName: record.displayName, position: record.position,
      club: record.club, division: record.rawValues.Division ?? "", rawValues: record.rawValues,
    }));
    const scorer = createFm24Scorer(source);
    const role = scorer.roles.find((entry) => entry.id === roleId);
    if (!role) throw new Error("Choose a valid FM24 role and duty.");
    const scores = scorer.players.map((player) => {
      const result = scorer.scoreRole(player, role);
      return {
        uid: player.uid ?? "", score: result.score, coverage: result.coverage,
        confidence: result.confidence, minutes: result.minutes,
        positionEligible: result.families.length > 0,
        listedForRole: role.slots.some((slot) => player.positionSlots.has(slot)),
      };
    });
    scope.postMessage({
      requestId, phase: "complete", roleId, scores, playerCount: records.length,
      seasonProgress: scorer.seasonProgress, poolMinimumMinutes: scorer.poolMinimumMinutes,
    });
  } catch (error) {
    scope.postMessage({ requestId, phase: "error", message: error instanceof Error ? error.message : "Could not calculate role fit." });
  }
};
