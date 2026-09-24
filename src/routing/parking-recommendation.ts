import {
  getParkingPermission,
  hasParkingRule,
  type ParkingPermit,
} from '@/constants/parking-permits';
import { shortestPathTree } from '@/routing/dijkstra';
import { etaMinutes, type TravelMode } from '@/routing/eta';
import { snapToGraph, type WalkGraph } from '@/routing/graph';
import type { CampusLot, Coordinate } from '@/types/map';

/**
 * Which lot to park in, given a permit and where the first class is (US-01).
 *
 * Only lots the permit may legally use at the time of arrival are offered, ranked by how far
 * the walk to class is. What this deliberately does NOT model is whether a lot will have a
 * space: there is no public feed for UTA lot occupancy (see CLAUDE.md, "Map data sources"),
 * so ranking by "likelihood of finding a spot" would mean inventing numbers. That half of
 * US-01 waits for a data source.
 */

export type LotRecommendation = {
  lot: CampusLot;
  /** Walking distance from the lot to the destination, in meters. */
  walkMeters: number;
  walkMinutes: number;
};

export type RecommendationInput = {
  permit: ParkingPermit | null;
  destination: Coordinate;
  /** When the driver will arrive; permit rules change through the day. */
  arrivalTime: Date;
  graph: WalkGraph;
  lots: CampusLot[];
  mode?: TravelMode;
  limit?: number;
};

const DEFAULT_LIMIT = 5;

export function recommendLots({
  permit,
  destination,
  arrivalTime,
  graph,
  lots,
  mode = 'walking',
  limit = DEFAULT_LIMIT,
}: RecommendationInput): LotRecommendation[] {
  if (!permit) return [];

  const destinationSnap = snapToGraph(graph, destination);
  if (!destinationSnap) return [];

  // One search out from the class reaches every lot at once; the alternative is a separate
  // search per lot, which does the same work over and over.
  const distances = shortestPathTree(graph, destinationSnap.nodeId);

  const candidates: LotRecommendation[] = [];
  for (const lot of lots) {
    // A lot nobody has identified yet has no rule, so we cannot claim it is allowed.
    if (!hasParkingRule(lot.id)) continue;
    if (getParkingPermission(permit, lot.id, arrivalTime) !== 'allowed') continue;

    const lotSnap = snapToGraph(graph, lot.coordinate);
    if (!lotSnap) continue;

    const alongPaths = distances.get(lotSnap.nodeId);
    if (alongPaths === undefined) continue;

    const walkMeters = lotSnap.distanceMeters + alongPaths + destinationSnap.distanceMeters;
    candidates.push({ lot, walkMeters, walkMinutes: etaMinutes(walkMeters, mode) });
  }

  return candidates.sort((a, b) => a.walkMeters - b.walkMeters).slice(0, limit);
}
