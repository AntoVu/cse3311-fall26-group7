import { etaMinutes, type TravelMode } from '@/routing/eta';
import { bearingDegrees } from '@/routing/geo';
import type { WalkGraph } from '@/routing/graph';
import type { RoutePlan } from '@/routing/route';
import type { Coordinate, MapNode } from '@/types/map';

/** One part of a route: the line to draw, its nodes (as in RoutePlan.pathNodes), and its length. */
export type RouteLeg = {
  path: Coordinate[];
  pathNodes: (MapNode | undefined)[];
  meters: number;
};

/**
 * A route to a building split at its door: the outdoor leg (campus map, walk or bike, GPS) and the
 * indoor leg (floor by floor, always walking). `outdoor` is null when the route starts inside the
 * building; `indoor` is null when it ends outside it (the room is not traced).
 */
export type RouteLegs = {
  outdoor: RouteLeg | null;
  indoor: RouteLeg | null;
  /** The building's node the indoor leg starts at, when the route walks in from outside. */
  entrance?: MapNode;
};

/**
 * Cuts a route where it last enters `poiId`'s indoor map. Earlier stretches through other
 * buildings (a shortcut) stay in the outdoor leg. Indoor edges are straight, so every indoor
 * point is a node and the cut lands exactly on the entrance.
 */
export function splitRoute(route: RoutePlan, graph: WalkGraph, poiId: string): RouteLegs {
  const inside = (i: number) => {
    const node = route.pathNodes[i];
    return node?.level !== undefined && node.poiId === poiId;
  };
  let cut = route.path.length;
  while (cut > 0 && inside(cut - 1)) cut--;

  if (cut === route.path.length) {
    return { outdoor: leg(route, 0, route.path.length, route.totalDistanceMeters), indoor: null };
  }

  // Edge lengths, not the drawn line: a staircase's two ends share a spot but count 20 m.
  const entrance = route.pathNodes[cut]!;
  let indoorMeters = 0;
  for (let i = route.nodeIds.lastIndexOf(entrance.id); i < route.edgeIds.length; i++) {
    indoorMeters += graph.edgeById.get(route.edgeIds[i])!.distanceMeters;
  }
  if (cut === 0) {
    return { outdoor: null, indoor: leg(route, 0, route.path.length, route.totalDistanceMeters) };
  }
  // The entrance point ends one leg and starts the next. The outdoor leg stops at the door
  // rather than going in, so its directions end with "Arrive", not "Enter".
  const outdoor = leg(route, 0, cut + 1, route.totalDistanceMeters - indoorMeters);
  outdoor.pathNodes[cut] = undefined;
  return { outdoor, indoor: leg(route, cut, route.path.length, indoorMeters), entrance };
}

function leg(route: RoutePlan, from: number, to: number, meters: number): RouteLeg {
  return { path: route.path.slice(from, to), pathNodes: route.pathNodes.slice(from, to), meters };
}

const SIDES = ['north', 'east', 'south', 'west'] as const;

/** Which side of a building a door is on, as seen from the building's center. */
export function entranceSide(door: Coordinate, center: Coordinate): (typeof SIDES)[number] {
  return SIDES[Math.round(bearingDegrees(center, door) / 90) % 4];
}

/** Minutes for each leg: the outdoor one at the chosen pace, indoors always at walking pace. */
export function legTimes(
  legs: { outdoor: { meters: number } | null; indoor: { meters: number } | null },
  mode: TravelMode
) {
  const outdoorMinutes = legs.outdoor ? etaMinutes(legs.outdoor.meters, mode) : 0;
  const indoorMinutes = legs.indoor ? etaMinutes(legs.indoor.meters, 'walking') : 0;
  return { outdoorMinutes, indoorMinutes, totalMinutes: outdoorMinutes + indoorMinutes };
}
