import {
  distanceMeters,
  metersPerDegreeLatitude,
  metersPerDegreeLongitude,
  pathLengthMeters,
} from '../../src/routing/geo.ts';
import type { Coordinate } from '../../src/types/map.ts';

/**
 * The pure half of the OpenStreetMap import: everything that turns a raw Overpass response
 * into the shapes `src/data/` holds. Kept apart from import.mts (which does the network and
 * file I/O) so this logic is unit-testable -- see __tests__/transform.test.ts.
 */

export type OsmWay = {
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
};

export type WalkwayNode = {
  id: string;
  coordinate: Coordinate;
};

export type WalkwayEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  /** Every point along the edge, ends included, so a drawn route follows the real sidewalk. */
  path: Coordinate[];
};

export type WalkwayGraph = {
  nodes: WalkwayNode[];
  edges: WalkwayEdge[];
};

export const NODE_ID_PREFIX = 'way-node-';

/** Turns a display name into something safe to embed in an id. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Point `p` relative to `origin`, in meters, x east-positive and y north-positive. */
export function toLocalMeters(origin: Coordinate, p: Coordinate): PlanarPoint {
  return {
    x: (p.lng - origin.lng) * metersPerDegreeLongitude(origin.lat),
    y: (p.lat - origin.lat) * metersPerDegreeLatitude(),
  };
}

export type PlanarPoint = { x: number; y: number };

/**
 * The point of segment `a`-`b` nearest `p`: `t` is how far along it (0 at `a`, 1 at `b`) and
 * `distance` how far `p` is from it, in the points' units.
 */
export function closestPointOnSegment(
  p: PlanarPoint,
  a: PlanarPoint,
  b: PlanarPoint
): { t: number; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return { t: 0, distance: Math.hypot(p.x - a.x, p.y - a.y) };

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return { t, distance: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) };
}

function distanceToSegment(p: PlanarPoint, a: PlanarPoint, b: PlanarPoint): number {
  return closestPointOnSegment(p, a, b).distance;
}

/**
 * Ramer-Douglas-Peucker in meters. OpenStreetMap outlines carry far more vertices than the
 * map needs at campus zoom, and every one of them is an SVG point to render.
 */
export function simplifyPath(path: Coordinate[], toleranceMeters: number): Coordinate[] {
  if (path.length <= 2) return [...path];

  const origin = path[0];
  const planar = path.map((point) => toLocalMeters(origin, point));

  const keep = new Array<boolean>(path.length).fill(false);
  keep[0] = true;
  keep[path.length - 1] = true;

  // Iterative rather than recursive: a long street can be thousands of points deep.
  const pending: [number, number][] = [[0, path.length - 1]];
  while (pending.length > 0) {
    const [first, last] = pending.pop()!;
    let furthest = -1;
    let furthestDistance = 0;

    for (let i = first + 1; i < last; i++) {
      const distance = distanceToSegment(planar[i], planar[first], planar[last]);
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthest = i;
      }
    }

    if (furthest !== -1 && furthestDistance > toleranceMeters) {
      keep[furthest] = true;
      pending.push([first, furthest], [furthest, last]);
    }
  }

  return path.filter((_, index) => keep[index]);
}

/**
 * Builds the routable walkway graph from raw OSM ways.
 *
 * OSM stores a sidewalk as a long chain of shape points, but routing only cares about
 * junctions -- somewhere you could choose to go a different way. So every run of
 * pass-through points collapses into one edge, and their coordinates ride along on
 * `edge.path` for drawing. That takes the campus graph from roughly 4,200 nodes to about a
 * thousand without losing an inch of geometry.
 *
 * A node is a junction when it has anything other than exactly two neighbors: one neighbor
 * makes it a dead end, three or more make it a fork.
 */
export function buildWalkwayGraph(
  ways: OsmWay[],
  coordinates: Map<number, Coordinate>
): WalkwayGraph {
  const adjacency = new Map<number, Set<number>>();
  const link = (a: number, b: number) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };

  for (const way of ways) {
    for (let i = 0; i + 1 < way.nodes.length; i++) {
      const a = way.nodes[i];
      const b = way.nodes[i + 1];
      // A segment is only usable when both ends came back in the export.
      if (a === b || !coordinates.has(a) || !coordinates.has(b)) continue;
      link(a, b);
      link(b, a);
    }
  }

  const isJunction = (id: number) => adjacency.get(id)!.size !== 2;
  const ids = [...adjacency.keys()].sort((a, b) => a - b);
  let starts = ids.filter(isJunction);
  // A ring with no fork anywhere has no natural starting point; anchor it arbitrarily so the
  // walk below terminates. Its one edge leaves and returns to the anchor, so it gets dropped.
  if (starts.length === 0 && ids.length > 0) starts = [ids[0]];

  const walked = new Set<string>();
  const step = (from: number, to: number) => `${from}->${to}`;
  const edges: WalkwayEdge[] = [];

  for (const start of starts) {
    for (const first of [...adjacency.get(start)!].sort((a, b) => a - b)) {
      if (walked.has(step(start, first))) continue;

      let previous = start;
      let current = first;
      const path = [coordinates.get(start)!, coordinates.get(first)!];

      while (!isJunction(current)) {
        const next = [...adjacency.get(current)!].find((candidate) => candidate !== previous);
        if (next === undefined) break;
        path.push(coordinates.get(next)!);
        previous = current;
        current = next;
        // A ring reached from its anchor comes back to where it started.
        if (current === start) break;
      }

      walked.add(step(start, first));
      walked.add(step(current, previous));

      // Leaving and returning to the same node can never shorten a route.
      if (current === start) continue;

      edges.push({
        id: `walkway-edge-${edges.length}`,
        fromNodeId: `${NODE_ID_PREFIX}${start}`,
        toNodeId: `${NODE_ID_PREFIX}${current}`,
        distanceMeters: pathLengthMeters(path),
        path,
      });
    }
  }

  const usedIds = new Set<number>();
  for (const edge of edges) {
    usedIds.add(Number(edge.fromNodeId.slice(NODE_ID_PREFIX.length)));
    usedIds.add(Number(edge.toNodeId.slice(NODE_ID_PREFIX.length)));
  }

  const nodes = [...usedIds]
    .sort((a, b) => a - b)
    .map((id) => ({ id: `${NODE_ID_PREFIX}${id}`, coordinate: coordinates.get(id)! }));

  return { nodes, edges };
}

export type ComponentResult = {
  graph: WalkwayGraph;
  droppedComponents: number;
  droppedNodeCount: number;
};

/**
 * Keeps only the biggest connected piece of the graph. OSM has a handful of stray sidewalk
 * fragments that join nothing; leaving them in means Dijkstra can be handed a start it can
 * never route out of. Dropping beats inventing connections that aren't there.
 */
export function largestComponent(graph: WalkwayGraph): ComponentResult {
  const neighbors = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!neighbors.has(edge.fromNodeId)) neighbors.set(edge.fromNodeId, []);
    if (!neighbors.has(edge.toNodeId)) neighbors.set(edge.toNodeId, []);
    neighbors.get(edge.fromNodeId)!.push(edge.toNodeId);
    neighbors.get(edge.toNodeId)!.push(edge.fromNodeId);
  }

  const seen = new Set<string>();
  const components: Set<string>[] = [];
  for (const node of graph.nodes) {
    if (seen.has(node.id)) continue;
    const component = new Set<string>([node.id]);
    const stack = [node.id];
    seen.add(node.id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const neighbor of neighbors.get(current) ?? []) {
        if (seen.has(neighbor)) continue;
        seen.add(neighbor);
        component.add(neighbor);
        stack.push(neighbor);
      }
    }
    components.push(component);
  }

  if (components.length <= 1) {
    return { graph, droppedComponents: 0, droppedNodeCount: 0 };
  }

  const biggest = components.reduce((a, b) => (b.size > a.size ? b : a));
  return {
    graph: {
      nodes: graph.nodes.filter((node) => biggest.has(node.id)),
      edges: graph.edges.filter((edge) => biggest.has(edge.fromNodeId)),
    },
    droppedComponents: components.length - 1,
    droppedNodeCount: graph.nodes.length - biggest.size,
  };
}

/**
 * Renumbers the graph to short sequential ids (`n0`, `e0`, ...).
 *
 * OSM node ids are ten digits, and each one is written twice per edge, which is most of the
 * generated file's bulk for no runtime benefit -- nothing looks a node up by OSM id. The
 * import script logs the mapping if a shape ever needs tracing back.
 */
export function compactIds(graph: WalkwayGraph): {
  graph: WalkwayGraph;
  originalNodeIds: Map<string, string>;
} {
  const shortIdOf = new Map<string, string>();
  const originalNodeIds = new Map<string, string>();

  const nodes = graph.nodes.map((node, index) => {
    const shortId = `n${index}`;
    shortIdOf.set(node.id, shortId);
    originalNodeIds.set(shortId, node.id);
    return { id: shortId, coordinate: node.coordinate };
  });

  const edges = graph.edges.map((edge, index) => ({
    ...edge,
    id: `e${index}`,
    fromNodeId: shortIdOf.get(edge.fromNodeId)!,
    toNodeId: shortIdOf.get(edge.toNodeId)!,
  }));

  return { graph: { nodes, edges }, originalNodeIds };
}

/**
 * Area-weighted center of a polygon, falling back to the average for degenerate rings.
 *
 * Works relative to the first vertex. In raw degrees each cross product is around 3,000
 * (32.7 x 97.1) and they cancel down to about 1e-8 for a building, so rounding error alone
 * moved markers a median 4.6 m and a small kiosk 447 m before this was fixed.
 */
export function polygonCenter(ring: Coordinate[]): Coordinate {
  const origin = ring[0];
  let twiceArea = 0;
  let lat = 0;
  let lng = 0;

  for (let i = 0; i < ring.length; i++) {
    const aLat = ring[i].lat - origin.lat;
    const aLng = ring[i].lng - origin.lng;
    const bLat = ring[(i + 1) % ring.length].lat - origin.lat;
    const bLng = ring[(i + 1) % ring.length].lng - origin.lng;
    const cross = aLng * bLat - bLng * aLat;
    twiceArea += cross;
    lng += (aLng + bLng) * cross;
    lat += (aLat + bLat) * cross;
  }

  // Relative to the ring's size, since a small building's area in square degrees is tiny.
  const span = Math.max(
    ...ring.map((p) => Math.abs(p.lat - origin.lat)),
    ...ring.map((p) => Math.abs(p.lng - origin.lng))
  );
  if (Math.abs(twiceArea) <= 1e-9 * span * span) {
    return {
      lat: ring.reduce((sum, p) => sum + p.lat, 0) / ring.length,
      lng: ring.reduce((sum, p) => sum + p.lng, 0) / ring.length,
    };
  }

  return {
    lat: origin.lat + lat / (3 * twiceArea),
    lng: origin.lng + lng / (3 * twiceArea),
  };
}

/**
 * Area-weighted center of several polygons treated as one place, like the two halves of the
 * Aerodynamics Research Building. Each ring's winding is ignored (OSM mixes them), and all the
 * math is relative to one shared origin for the same precision reason as `polygonCenter`.
 */
export function groupCenter(rings: Coordinate[][]): Coordinate {
  const origin = rings[0][0];
  let totalArea = 0;
  let lat = 0;
  let lng = 0;
  let span = 0;

  for (const ring of rings) {
    let twiceArea = 0;
    let ringLat = 0;
    let ringLng = 0;
    for (let i = 0; i < ring.length; i++) {
      const aLat = ring[i].lat - origin.lat;
      const aLng = ring[i].lng - origin.lng;
      const bLat = ring[(i + 1) % ring.length].lat - origin.lat;
      const bLng = ring[(i + 1) % ring.length].lng - origin.lng;
      const cross = aLng * bLat - bLng * aLat;
      twiceArea += cross;
      ringLng += (aLng + bLng) * cross;
      ringLat += (aLat + bLat) * cross;
      span = Math.max(span, Math.abs(aLat), Math.abs(aLng));
    }
    if (twiceArea === 0) continue;
    // (ringLat / 3 twiceArea) is this ring's center; weight it by |area| = |twiceArea| / 2.
    const weight = Math.abs(twiceArea);
    totalArea += weight;
    lat += (ringLat / (3 * twiceArea)) * weight;
    lng += (ringLng / (3 * twiceArea)) * weight;
  }

  if (totalArea <= 1e-9 * span * span) {
    const all = rings.flat();
    return {
      lat: all.reduce((sum, p) => sum + p.lat, 0) / all.length,
      lng: all.reduce((sum, p) => sum + p.lng, 0) / all.length,
    };
  }
  return { lat: origin.lat + lat / totalArea, lng: origin.lng + lng / totalArea };
}

/** Largest gap between consecutive points on a ring, in meters. */
export function longestSegmentMeters(ring: Coordinate[]): number {
  let longest = 0;
  for (let i = 0; i + 1 < ring.length; i++) {
    longest = Math.max(longest, distanceMeters(ring[i], ring[i + 1]));
  }
  return longest;
}
