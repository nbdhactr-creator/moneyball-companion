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
    const leftScore = left?.listedForRole && left.score != null ? left.score : -1;
    const rightScore = right?.listedForRole && right.score != null ? right.score : -1;
    return rightScore - leftScore || a.displayName.localeCompare(b.displayName);
  });
}
export function topRoleFit<T extends SearchablePlayer>(
  players: T[],
  fits: ReadonlyMap<string, RoleFitValue>,
): T | null {
  return [...players].filter((player) => {
    const fit = fits.get(player.uid);
    return fit?.listedForRole === true && fit.score != null;
  }).sort((a, b) => {
    const scoreA = fits.get(a.uid)!.score!;
    const scoreB = fits.get(b.uid)!.score!;
    return scoreB - scoreA || a.displayName.localeCompare(b.displayName);
  })[0] ?? null;
}
