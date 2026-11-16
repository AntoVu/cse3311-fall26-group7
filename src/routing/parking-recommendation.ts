import {
  getParkingPermission,
  hasParkingRule,
  type ParkingPermit,
} from '@/constants/parking-permits';
import { CROWDING_SEARCH_MINUTES, type ParkingCrowding } from '@/constants/parking-crowding';
import { shortestPathTree } from '@/routing/dijkstra';
import { estimatedParkingCrowding } from '@/routing/parking-crowding';
import { etaMinutes, type TravelMode } from '@/routing/eta';
import { snapToGraph, type WalkGraph } from '@/routing/graph';
import type { CampusLot, Coordinate } from '@/types/map';

/**
 * Which lot to park in, given a permit and where the first class is (US-01).
 *
 * Only lots the permit may legally use at the time of arrival are offered, ranked by the walk to
 * class plus the time expected to find a space there (CROWDING_SEARCH_MINUTES, from the scheduled
 * crowding estimates in parking-crowding.ts; there is no public occupancy feed).
 */

export type LotRecommendation = {
  lot: CampusLot;
  /** Walking distance from the lot to the destination, in meters. */
  walkMeters: number;
  walkMinutes: number;
  /** Estimated crowding at the arrival time. */
  crowding: ParkingCrowding;
};

export type RecommendationInput = {
  permit: ParkingPermit | null;
  destination: Coordinate;
  /** The class's building: when it has entrances on the map, walks are measured to its nearest door. */
  destinationPoiId?: string;
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
  destinationPoiId,
  arrivalTime,
  graph,
  lots,
  mode = 'walking',
  limit = DEFAULT_LIMIT,
}: RecommendationInput): LotRecommendation[] {
  if (!permit) return [];

  const doors = destinationPoiId ? graph.entrancesByPoiId.get(destinationPoiId) : undefined;
  const destinationSnap = doors
    ? { nodeId: doors, distanceMeters: 0 }
    : snapToGraph(graph, destination);
  if (!destinationSnap) return [];

  // One search out from the class (from all its doors at once) reaches every lot; the
  // alternative is a separate search per lot, which does the same work over and over.
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
    const walkMinutes = etaMinutes(walkMeters, mode);
    candidates.push({ lot, walkMeters, walkMinutes, crowding: estimatedParkingCrowding(lot.id, arrivalTime) });
  }

  const cost = (r: LotRecommendation) => r.walkMinutes + CROWDING_SEARCH_MINUTES[r.crowding];
  return candidates.sort((a, b) => cost(a) - cost(b) || a.walkMeters - b.walkMeters).slice(0, limit);
}
