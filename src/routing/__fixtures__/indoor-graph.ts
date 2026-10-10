import { distanceMeters, metersPerDegreeLatitude, metersPerDegreeLongitude } from '@/routing/geo';
import type { Coordinate, MapEdge, MapNode } from '@/types/map';

/**
 * A two-floor building with one outdoor approach, shaped like what the indoor import makes:
 *
 *   floor 1:  O1 ------ O2 -- H1a ---- H1c -- H1b - S1        door 105 is north of H1c
 *   floor 2:                                  H2a - S2 ... H2c   door 205 is south of H2c
 *
 * Walking in from O1 heads east the whole way, so door 105 is on the left and 205 on the right.
 * Office 105A has no hallway door: a connecting door (C105) north of 105 is the only way in.
 * Positions are meters (north, east) from a spot on campus.
 */
export const INDOOR_POI_ID = 'academic-test-hall';

const ORIGIN = { lat: 32.73, lng: -97.11 };
export const at = (north: number, east: number): Coordinate => ({
  lat: ORIGIN.lat + north / metersPerDegreeLatitude(),
  lng: ORIGIN.lng + east / metersPerDegreeLongitude(ORIGIN.lat),
});

const indoor = (id: string, north: number, east: number, level: string, extra: Partial<MapNode> = {}) =>
  ({ id, coordinate: at(north, east), poiId: INDOOR_POI_ID, level, ...extra }) satisfies MapNode;

export const INDOOR_TEST_NODES: MapNode[] = [
  { id: 'O1', coordinate: at(0, -100) },
  { id: 'O2', coordinate: at(0, 0) },
  indoor('H1a', 0, 10, '1'),
  indoor('H1c', 0, 40, '1'),
  indoor('H1b', 0, 50, '1'),
  indoor('D105', 8, 40, '1', { room: '105' }),
  indoor('C105', 11, 40, '1'),
  indoor('R105A', 14, 40, '1', { room: '105A' }),
  indoor('S1', 2, 50, '1', { connector: 'stairs' }),
  indoor('S2', 2, 50, '2', { connector: 'stairs' }),
  indoor('H2a', 0, 50, '2'),
  indoor('H2c', 0, 80, '2'),
  indoor('D205', -8, 80, '2', { room: '205' }),
];

const byId = new Map(INDOOR_TEST_NODES.map((node) => [node.id, node]));
const edge = (from: string, to: string, meters?: number): MapEdge => ({
  id: `${from}-${to}`,
  fromNodeId: from,
  toNodeId: to,
  distanceMeters: meters ?? distanceMeters(byId.get(from)!.coordinate, byId.get(to)!.coordinate),
  walkable: true,
});

export const INDOOR_TEST_EDGES: MapEdge[] = [
  edge('O1', 'O2'),
  edge('O2', 'H1a'),
  edge('H1a', 'H1c'),
  edge('H1c', 'H1b'),
  edge('H1c', 'D105'),
  edge('D105', 'C105'),
  edge('C105', 'R105A'),
  edge('H1b', 'S1'),
  edge('S1', 'S2', 20),
  edge('S2', 'H2a'),
  edge('H2a', 'H2c'),
  edge('H2c', 'D205'),
];
