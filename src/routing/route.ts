import { shortestPath } from '@/routing/dijkstra';
import { etaMinutes, type TravelMode } from '@/routing/eta';
import { distanceMeters } from '@/routing/geo';
import { snapToGraph, type WalkGraph } from '@/routing/graph';
import type { Coordinate, MapEdge, MapNode, Route } from '@/types/map';

/** A Route plus the line to draw for it. */
export type RoutePlan = Route & {
  /**
   * Every point of the drawn line, from where the user actually is to where they are going.
   * Longer than `nodeIds`, because it includes each edge's bends and the walk on and off the
   * path at either end.
   */
  path: Coordinate[];
  /**
   * The graph node at each point of `path`, or undefined between nodes (a sidewalk's bends) and
   * at an off-graph start. Same length as `path`. It is how the screen knows which points are
   * indoors and on which floor; both ends of a staircase may share a coordinate but not a node.
   */
  pathNodes: (MapNode | undefined)[];
};

export type RouteOptions = {
  mode?: TravelMode;
  /** How far from the graph either end may be; see DEFAULT_SNAP_METERS. */
  maxSnapMeters?: number;
  /**
   * End exactly at this node instead of snapping `to` onto the graph. Needed for a room: snapping
   * deliberately skips indoor nodes, so a door can only be reached by naming it.
   */
  toNodeId?: string;
  /** Start exactly at this node, the same way: how a route begins inside a room. */
  fromNodeId?: string;
  /** End at this building's nearest door by path, when it has entrances on the map. */
  toPoiId?: string;
  /** Start at this building's nearest door by path, when it has entrances on the map. */
  fromPoiId?: string;
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
 * distance. A building named by `toPoiId`/`fromPoiId` uses its doors instead, so the route
 * doesn't wrap around it to reach the center. Returns null when either end is too far from any
 * walkway, or when no route joins them.
 */
export function findRoute(
  graph: WalkGraph,
  from: Coordinate,
  to: Coordinate,
  options: RouteOptions = {}
): RoutePlan | null {
  const { mode = 'walking', maxSnapMeters, toNodeId, fromNodeId, toPoiId, fromPoiId } = options;

  const target = toNodeId ? graph.nodeById.get(toNodeId) : undefined;
  if (toNodeId && !target) return null;
  if (fromNodeId && !graph.nodeById.has(fromNodeId)) return null;

  const doorsOf = (poiId?: string) => (poiId ? graph.entrancesByPoiId.get(poiId) : undefined);
  // A starting node is treated like a building with one door.
  const fromDoors = fromNodeId ? [fromNodeId] : doorsOf(fromPoiId);
  const toDoors = target ? undefined : doorsOf(toPoiId);

  // A building's doors are the ends themselves: no walk on or off the path to count.
  const start = fromDoors
    ? { nodeId: fromDoors, distanceMeters: 0 }
    : snapToGraph(graph, from, maxSnapMeters);
  const end = target
    ? { nodeId: target.id, distanceMeters: distanceMeters(to, target.coordinate) }
    : toDoors
      ? { nodeId: toDoors, distanceMeters: 0 }
      : snapToGraph(graph, to, maxSnapMeters);
  if (!start || !end) return null;

  const path = shortestPath(graph, start.nodeId, end.nodeId);
  if (!path) return null;

  const firstNode = graph.nodeById.get(path.nodeIds[0])!;
  const line: Coordinate[] = [fromDoors ? firstNode.coordinate : from];
  const lineNodes: (MapNode | undefined)[] = [fromDoors ? firstNode : undefined];
  const append = (point: Coordinate, node?: MapNode) => {
    const last = line.length - 1;
    const lastNode = lineNodes[last];
    // The same spot twice is one point, unless it is two different nodes: the two ends of a
    // staircase sit on top of each other, and dropping one would lose the floor change.
    if (samePoint(line[last], point) && (!node || !lastNode || node === lastNode)) {
      lineNodes[last] = lastNode ?? node;
      return;
    }
    line.push(point);
    lineNodes.push(node);
  };

  for (let i = 0; i < path.edgeIds.length; i++) {
    const edge = graph.edgeById.get(path.edgeIds[i])!;
    const shape = orientedShape(edge, path.nodeIds[i], graph);
    shape.forEach((point, j) =>
      append(
        point,
        j === 0
          ? graph.nodeById.get(path.nodeIds[i])
          : j === shape.length - 1
            ? graph.nodeById.get(path.nodeIds[i + 1])
            : undefined
      )
    );
  }
  // A route that never leaves its first node still has that node.
  if (path.edgeIds.length === 0) {
    const only = graph.nodeById.get(path.nodeIds[0])!;
    append(only.coordinate, only);
  }
  if (!toDoors) append(to);

  const totalDistanceMeters =
    start.distanceMeters + path.totalDistanceMeters + end.distanceMeters;

  return {
    id: `route-${path.nodeIds[0]}-${path.nodeIds[path.nodeIds.length - 1]}`,
    nodeIds: path.nodeIds,
    edgeIds: path.edgeIds,
    totalDistanceMeters,
    etaMinutes: etaMinutes(totalDistanceMeters, mode),
    path: line,
    pathNodes: lineNodes,
  };
}

/** Straight-line distance, for ranking candidates before paying for a full route. */
export function directDistanceMeters(from: Coordinate, to: Coordinate): number {
  return distanceMeters(from, to);
}
