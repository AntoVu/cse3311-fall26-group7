import { shortestPath } from '@/routing/dijkstra';
import { etaMinutes, type TravelMode } from '@/routing/eta';
import { distanceMeters } from '@/routing/geo';
import { snapToGraph, type WalkGraph } from '@/routing/graph';
import type { Coordinate, MapEdge, Route } from '@/types/map';

/** A Route plus the line to draw for it. */
export type RoutePlan = Route & {
  /**
   * Every point of the drawn line, from where the user actually is to where they are going.
   * Longer than `nodeIds`, because it includes each edge's bends and the walk on and off the
   * path at either end.
   */
  path: Coordinate[];
};

export type RouteOptions = {
  mode?: TravelMode;
  /** How far from the graph either end may be; see DEFAULT_SNAP_METERS. */
  maxSnapMeters?: number;
};

/** An edge's shape, oriented so it runs away from `fromNodeId`. */
function orientedShape(edge: MapEdge, fromNodeId: string, graph: WalkGraph): Coordinate[] {
  const shape = edge.path ?? [
    graph.nodeById.get(edge.fromNodeId)!.coordinate,
    graph.nodeById.get(edge.toNodeId)!.coordinate,
  ];
  // Edges are stored one way round but walked in both, so reverse the shape when going against
  // the stored direction -- otherwise the drawn line doubles back on itself.
  return edge.fromNodeId === fromNodeId ? shape : [...shape].reverse();
}

const samePoint = (a: Coordinate, b: Coordinate) => a.lat === b.lat && a.lng === b.lng;

/**
 * Plans a walk between two coordinates.
 *
 * Neither end is usually on the graph -- a building's center sits inside the building -- so
 * both snap to the nearest walkway node, and the walk on and off the path counts toward the
 * distance. Returns null when either end is too far from any walkway, or when no route joins
 * them.
 */
export function findRoute(
  graph: WalkGraph,
  from: Coordinate,
  to: Coordinate,
  options: RouteOptions = {}
): RoutePlan | null {
  const { mode = 'walking', maxSnapMeters } = options;

  const start = snapToGraph(graph, from, maxSnapMeters);
  const end = snapToGraph(graph, to, maxSnapMeters);
  if (!start || !end) return null;

  const path = shortestPath(graph, start.nodeId, end.nodeId);
  if (!path) return null;

  const line: Coordinate[] = [from];
  const append = (point: Coordinate) => {
    if (!samePoint(line[line.length - 1], point)) line.push(point);
  };

  for (let i = 0; i < path.edgeIds.length; i++) {
    const edge = graph.edgeById.get(path.edgeIds[i])!;
    for (const point of orientedShape(edge, path.nodeIds[i], graph)) append(point);
  }
  append(to);

  const totalDistanceMeters =
    start.distanceMeters + path.totalDistanceMeters + end.distanceMeters;

  return {
    id: `route-${start.nodeId}-${end.nodeId}`,
    nodeIds: path.nodeIds,
    edgeIds: path.edgeIds,
    totalDistanceMeters,
    etaMinutes: etaMinutes(totalDistanceMeters, mode),
    path: line,
  };
}

/** Straight-line distance, for ranking candidates before paying for a full route. */
export function directDistanceMeters(from: Coordinate, to: Coordinate): number {
  return distanceMeters(from, to);
}
