export interface SearchablePlayer {
  uid: string;
  displayName: string;
  position: string;
}
export interface RoleFitValue {
  score: number | null;
  coverage: number;
  confidence: "low" | "medium" | "high";
  listedForRole: boolean;
  positionEligible: boolean;
}
export function rankPlayersForRole<T extends SearchablePlayer>(
  players: T[],
  query: string,
  position: string,
  fits: ReadonlyMap<string, RoleFitValue>,
): T[] {
  const term = query.trim().toLocaleLowerCase();
  const selectedPosition = position.trim().toLocaleLowerCase();
  return players.filter((player) => {
    const matchesQuery = !term || [player.displayName, player.position, player.uid]
      .some((value) => value.toLocaleLowerCase().includes(term));
    const matchesPosition = !selectedPosition || player.position.toLocaleLowerCase().includes(selectedPosition);
    return matchesQuery && matchesPosition;
  }).sort((a, b) => {
    const left = fits.get(a.uid);
    const right = fits.get(b.uid);
    const leftScore = left?.listedForRole && left.positionEligible && left.score != null ? left.score : -1;
    const rightScore = right?.listedForRole && right.positionEligible && right.score != null ? right.score : -1;
    return rightScore - leftScore || a.displayName.localeCompare(b.displayName) || a.uid.localeCompare(b.uid);
  });
}
export function topRoleFit<T extends SearchablePlayer>(
  players: T[],
  fits: ReadonlyMap<string, RoleFitValue>,
): T | null {
  return [...players].filter((player) => {
    const fit = fits.get(player.uid);
    return fit?.listedForRole === true && fit.positionEligible === true && fit.score != null;
  }).sort((a, b) => {
    const scoreA = fits.get(a.uid)!.score!;
    const scoreB = fits.get(b.uid)!.score!;
    return scoreB - scoreA || a.displayName.localeCompare(b.displayName) || a.uid.localeCompare(b.uid);
  })[0] ?? null;
}
