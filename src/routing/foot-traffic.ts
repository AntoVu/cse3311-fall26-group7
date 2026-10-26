import { etaMinutes, type TravelMode } from '@/routing/eta';
import { formatDuration } from '@/routing/format';
import { metersPerDegreeLatitude, metersPerDegreeLongitude } from '@/routing/geo';
import type { GraphStep, WalkGraph } from '@/routing/graph';
import type { Coordinate } from '@/types/map';

/**
 * Foot-traffic avoidance (US-03, UC-04): known busy places at known busy times. There is no live
 * crowd data (the inception document rules out real-time monitoring), so the zones and their
 * peaks are estimates kept in constants/foot-traffic.ts.
 *
 * Avoiding works through the search's edge cost: an outdoor walkway inside an active zone costs
 * CROWD_COST_FACTOR times its length, so a route detours when the way round is cheaper than the
 * crowd, and still walks through when it isn't. Distances and ETAs stay the meters walked.
 */

/** Busy on these weekdays (0 = Sunday, like Date.getDay()), from startMinute until endMinute. */
export type CrowdPeak = { days: number[]; startMinute: number; endMinute: number };

export type CrowdZone = {
  id: string;
  /** Where, in words: "the Central Library". */
  name: string;
  /** The building it is centered on, as a POI id, so a map re-import can't move it. */
  poiId: string;
  radiusMeters: number;
  peaks: CrowdPeak[];
};

/** How many times its length a crowded walkway costs. 4: a 50 m crowd is worth a 150 m detour. */
export const CROWD_COST_FACTOR = 4;

export function activeCrowdZones(zones: CrowdZone[], now: Date): CrowdZone[] {
  const minute = now.getHours() * 60 + now.getMinutes();
  return zones.filter((zone) =>
    zone.peaks.some(
      (peak) => peak.days.includes(now.getDay()) && minute >= peak.startMinute && minute < peak.endMinute
    )
  );
}

/** Meters from `point` to the segment a-b, on a flat projection around `point` (fine at campus scale). */
function segmentMeters(point: Coordinate, a: Coordinate, b: Coordinate): number {
  const kx = metersPerDegreeLongitude(point.lat);
  const ky = metersPerDegreeLatitude();
  const ax = (a.lng - point.lng) * kx;
  const ay = (a.lat - point.lat) * ky;
  const dx = (b.lng - a.lng) * kx;
  const dy = (b.lat - a.lat) * ky;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function edgeShape(graph: WalkGraph, edgeId: string): Coordinate[] | null {
  const edge = graph.edgeById.get(edgeId);
  const from = edge && graph.nodeById.get(edge.fromNodeId);
  const to = edge && graph.nodeById.get(edge.toNodeId);
  // The zones are outdoors: hallways under them stay as they are.
  if (!edge || !from || !to || from.level !== undefined || to.level !== undefined) return null;
  return edge.path ?? [from.coordinate, to.coordinate];
}

function passesThrough(shape: Coordinate[], center: Coordinate, radiusMeters: number): boolean {
  if (shape.length === 1) return segmentMeters(center, shape[0], shape[0]) <= radiusMeters;
  return shape.some((point, i) => i > 0 && segmentMeters(center, shape[i - 1], point) <= radiusMeters);
}

/** Every outdoor edge that runs through one of `zones`. A zone whose building is gone is skipped. */
export function crowdedEdgeIds(
  graph: WalkGraph,
  zones: CrowdZone[],
  centerOf: (poiId: string) => Coordinate | undefined
): Set<string> {
  const crowded = new Set<string>();
  const circles = zones.flatMap((zone) => {
    const center = centerOf(zone.poiId);
    return center ? [{ center, radiusMeters: zone.radiusMeters }] : [];
  });
  if (circles.length === 0) return crowded;
  for (const edgeId of graph.edgeById.keys()) {
    const shape = edgeShape(graph, edgeId);
    if (shape && circles.some((c) => passesThrough(shape, c.center, c.radiusMeters))) crowded.add(edgeId);
  }
  return crowded;
}

/** The search's edge cost with `crowded` edges made dearer (SearchOptions.edgeCost). */
export function crowdCost(crowded: ReadonlySet<string>, factor = CROWD_COST_FACTOR): (step: GraphStep) => number {
  return (step) => (crowded.has(step.edgeId) ? step.costMeters * factor : step.costMeters);
}

/** Which of `zones` a route's edges walk through. */
export function zonesOnRoute(
  edgeIds: string[],
  zones: CrowdZone[],
  graph: WalkGraph,
  centerOf: (poiId: string) => Coordinate | undefined
): CrowdZone[] {
  return zones.filter((zone) => {
    const center = centerOf(zone.poiId);
    return (
      !!center &&
      edgeIds.some((id) => {
        const shape = edgeShape(graph, id);
        return !!shape && passesThrough(shape, center, zone.radiusMeters);
      })
    );
  });
}

/** What a route's crowd check found (usePlaceRoute). */
export type CrowdReport = { busy: CrowdZone[]; through: CrowdZone[]; avoided: CrowdZone[]; extraMeters: number };

/** One line on what Avoid crowds is doing for this walk (UC-04: say when going around adds time). */
export function crowdNote(
  avoiding: boolean,
  crowds: CrowdReport,
  mode: TravelMode
): string {
  const names = (zones: CrowdZone[]) => zones.map((zone) => zone.name).join(' and ');
  if (crowds.busy.length === 0) return 'No busy areas right now.';
  if (avoiding && crowds.avoided.length > 0) {
    const extra = crowds.extraMeters > 0 ? `, +${formatDuration(etaMinutes(crowds.extraMeters, mode))}` : '';
    return `Going around ${names(crowds.avoided)} (busy now)${extra}.`;
  }
  if (crowds.through.length > 0) {
    return avoiding
      ? `No way around ${names(crowds.through)}, busy now.`
      : `Passes ${names(crowds.through)}, busy now.`;
  }
  return `Busy now: ${names(crowds.busy)}. This walk stays clear.`;
}
