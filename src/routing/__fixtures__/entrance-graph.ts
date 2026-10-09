import { at } from '@/routing/__fixtures__/indoor-graph';
import { distanceMeters } from '@/routing/geo';
import type { MapEdge, MapNode } from '@/types/map';

/**
 * A building (40 m square, centered on 0,0) ringed by a sidewalk, with a door on its north and
 * south walls. Its center is a meter closer to the south sidewalk, so snapping the center sends a
 * walker from the north all the way around: the bug entrances fix.
 *
 *              A (60, 0)
 *              |
 *         W -- N (25, 0) -- E          EN at (20, 0) joins N; ES at (-20, 0) joins S
 *              S (-24, 0)
 */
export const ENTRANCE_POI_ID = 'academic-door-hall';
export const BUILDING_CENTER = at(0, 0);

export const RING_NODES: MapNode[] = [
  { id: 'A', coordinate: at(60, 0) },
  { id: 'N', coordinate: at(25, 0) },
  { id: 'E', coordinate: at(0, 25) },
  { id: 'S', coordinate: at(-24, 0) },
  { id: 'W', coordinate: at(0, -25) },
];
export const DOOR_NODES: MapNode[] = [
  { id: 'EN', coordinate: at(20, 0), entranceOf: ENTRANCE_POI_ID },
  { id: 'ES', coordinate: at(-20, 0), entranceOf: ENTRANCE_POI_ID },
];

const byId = new Map([...RING_NODES, ...DOOR_NODES].map((node) => [node.id, node]));
const edge = (from: string, to: string): MapEdge => ({
  id: `${from}-${to}`,
  fromNodeId: from,
  toNodeId: to,
  distanceMeters: distanceMeters(byId.get(from)!.coordinate, byId.get(to)!.coordinate),
  walkable: true,
});

export const RING_EDGES: MapEdge[] = [
  edge('A', 'N'),
  edge('N', 'E'),
  edge('E', 'S'),
  edge('S', 'W'),
  edge('W', 'N'),
];
export const DOOR_EDGES: MapEdge[] = [edge('EN', 'N'), edge('ES', 'S')];
