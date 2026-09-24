import type { MapEdge, MapNode } from '@/types/map';

/**
 * A tiny graph with two ways to get from A to C, so tests can tell whether the search is
 * following distance or just counting hops:
 *
 *        B                A-B-C is 200 m over two edges
 *      /   \              A-D-C is 120 m over two edges
 *     A     C             so any distance-aware search picks D
 *      \   /
 *        D
 *
 * Distances are set explicitly rather than derived from the coordinates, so a change to the
 * geo maths cannot quietly move the right answer.
 */
export const TEST_NODES: MapNode[] = [
  { id: 'A', coordinate: { lat: 32.73, lng: -97.11 } },
  { id: 'B', coordinate: { lat: 32.7309, lng: -97.11 } },
  { id: 'C', coordinate: { lat: 32.7318, lng: -97.11 } },
  { id: 'D', coordinate: { lat: 32.7309, lng: -97.1112 } },
];

export const TEST_EDGES: MapEdge[] = [
  { id: 'AB', fromNodeId: 'A', toNodeId: 'B', distanceMeters: 100, walkable: true },
  { id: 'BC', fromNodeId: 'B', toNodeId: 'C', distanceMeters: 100, walkable: true },
  {
    id: 'AD',
    fromNodeId: 'A',
    toNodeId: 'D',
    distanceMeters: 60,
    walkable: true,
    // A bend, so tests can check the drawn shape follows the edge rather than cutting across.
    path: [
      { lat: 32.73, lng: -97.11 },
      { lat: 32.73, lng: -97.1112 },
      { lat: 32.7309, lng: -97.1112 },
    ],
  },
  { id: 'DC', fromNodeId: 'D', toNodeId: 'C', distanceMeters: 60, walkable: true },
];

/** An island with no edge joining it to the graph above. */
export const ISLAND_NODE: MapNode = {
  id: 'ISLAND',
  coordinate: { lat: 32.74, lng: -97.12 },
};
