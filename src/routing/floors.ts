import type { Coordinate, MapNode } from '@/types/map';

/** Floors as people say them: "B" is below "1". */
export function floorRank(level: string): number {
  return level === 'B' ? -1 : Number.parseFloat(level) || 0;
}

/** A building's traced floors, bottom to top. Empty when it has no indoor map. */
export function buildingLevels(nodes: MapNode[], poiId: string): string[] {
  const levels = new Set<string>();
  for (const node of nodes) if (node.poiId === poiId && node.level !== undefined) levels.add(node.level);
  return [...levels].sort((a, b) => floorRank(a) - floorRank(b));
}

/**
 * The parts of a route to draw at full strength while one floor of a building is shown: the
 * outdoor walk and that floor, as separate lines wherever another floor comes between. Floors of
 * other buildings the route passes through stay in, since only one building's floor is shown.
 */
export function routeOnFloor(
  path: Coordinate[],
  pathNodes: (MapNode | undefined)[],
  poiId: string,
  level: string
): Coordinate[][] {
  const pieces: Coordinate[][] = [];
  let piece: Coordinate[] = [];
  path.forEach((point, i) => {
    const node = pathNodes[i];
    const elsewhere = node?.level !== undefined && node.poiId === poiId && node.level !== level;
    if (!elsewhere) {
      piece.push(point);
      return;
    }
    if (piece.length > 1) pieces.push(piece);
    piece = [];
  });
  if (piece.length > 1) pieces.push(piece);
  return pieces;
}
