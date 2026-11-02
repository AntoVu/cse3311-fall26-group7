import { etaMinutes, type TravelMode } from '@/routing/eta';
import { formatDuration } from '@/routing/format';
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

export type CrowdBounds = { north: number; south: number; west: number; east: number };

export type CrowdZone = {
  id: string;
  /** Where, in words: "the Central Library". */
  name: string;
  /** The busy stretch of walkway outdoors, as a north-up box in true lat/lng. */
  bounds: CrowdBounds;
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

/** Whether segment a-b touches `box` (Liang-Barsky clipping, in degrees: the box is axis-aligned). */
function segmentInBox(a: Coordinate, b: Coordinate, box: CrowdBounds): boolean {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  let enter = 0;
  let leave = 1;
  for (const [p, q] of [[-dx, a.lng - box.west], [dx, box.east - a.lng], [-dy, a.lat - box.south], [dy, box.north - a.lat]]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    if (p < 0) enter = Math.max(enter, q / p);
    else leave = Math.min(leave, q / p);
    if (enter > leave) return false;
  }
  return true;
}

function edgeShape(graph: WalkGraph, edgeId: string): Coordinate[] | null {
  const edge = graph.edgeById.get(edgeId);
  const from = edge && graph.nodeById.get(edge.fromNodeId);
  const to = edge && graph.nodeById.get(edge.toNodeId);
  // The zones are outdoors: hallways under them stay as they are.
  if (!edge || !from || !to || from.level !== undefined || to.level !== undefined) return null;
  return edge.path ?? [from.coordinate, to.coordinate];
}

function passesThrough(shape: Coordinate[], box: CrowdBounds): boolean {
  if (shape.length === 1) return segmentInBox(shape[0], shape[0], box);
  return shape.some((point, i) => i > 0 && segmentInBox(shape[i - 1], point, box));
}

/** Every outdoor edge that runs through one of `zones`. */
export function crowdedEdgeIds(graph: WalkGraph, zones: CrowdZone[]): Set<string> {
  const crowded = new Set<string>();
  if (zones.length === 0) return crowded;
  for (const edgeId of graph.edgeById.keys()) {
    const shape = edgeShape(graph, edgeId);
    if (shape && zones.some((z) => passesThrough(shape, z.bounds))) crowded.add(edgeId);
  }
  return crowded;
}

/** The search's edge cost with `crowded` edges made dearer (SearchOptions.edgeCost). */
export function crowdCost(crowded: ReadonlySet<string>, factor = CROWD_COST_FACTOR): (step: GraphStep) => number {
  return (step) => (crowded.has(step.edgeId) ? step.costMeters * factor : step.costMeters);
}

/** Which of `zones` a route's edges walk through. */
export function zonesOnRoute(edgeIds: string[], zones: CrowdZone[], graph: WalkGraph): CrowdZone[] {
  return zones.filter((zone) =>
    edgeIds.some((id) => {
      const shape = edgeShape(graph, id);
      return !!shape && passesThrough(shape, zone.bounds);
    })
  );
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
