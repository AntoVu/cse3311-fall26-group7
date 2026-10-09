import {
  BUILDING_CENTER,
  DOOR_EDGES,
  DOOR_NODES,
  ENTRANCE_POI_ID,
  RING_EDGES,
  RING_NODES,
} from '@/routing/__fixtures__/entrance-graph';
import { INDOOR_TEST_EDGES, INDOOR_TEST_NODES, at } from '@/routing/__fixtures__/indoor-graph';
import { TEST_EDGES, TEST_NODES } from '@/routing/__fixtures__/test-graph';
import { buildGraph } from '@/routing/graph';
import { findRoute } from '@/routing/route';

const graph = buildGraph(TEST_NODES, TEST_EDGES);
const A = { lat: 32.73, lng: -97.11 };
const C = { lat: 32.7318, lng: -97.11 };

describe('findRoute', () => {
  it('returns the Route shape the app already declares', () => {
    const route = findRoute(graph, A, C)!;
    expect(route).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        nodeIds: ['A', 'D', 'C'],
        edgeIds: ['AD', 'DC'],
        totalDistanceMeters: expect.any(Number),
        etaMinutes: expect.any(Number),
      })
    );
  });

  it('draws a line that follows the sidewalk bends instead of cutting across', () => {
    const route = findRoute(graph, A, C)!;
    // Edge AD bends west before turning north; that corner has to survive into the drawing.
    expect(route.path.some((point) => point.lng < -97.1111 && point.lat < 32.7301)).toBe(true);
    expect(route.path.length).toBeGreaterThan(route.nodeIds.length);
  });

  it('starts at where you actually are and ends at the destination', () => {
    const start = { lat: 32.7299, lng: -97.11 };
    const end = { lat: 32.7319, lng: -97.11 };
    const route = findRoute(graph, start, end)!;
    expect(route.path[0]).toEqual(start);
    expect(route.path[route.path.length - 1]).toEqual(end);
  });

  it('counts the walk to and from the path, not just the path itself', () => {
    const offPath = { lat: 32.7297, lng: -97.11 };
    const onPath = findRoute(graph, A, C)!;
    const fromAfar = findRoute(graph, offPath, C)!;
    expect(fromAfar.totalDistanceMeters).toBeGreaterThan(onPath.totalDistanceMeters);
  });

  it('gives an ETA that matches the distance', () => {
    const route = findRoute(graph, A, C)!;
    expect(route.etaMinutes).toBeGreaterThan(0);
    const biked = findRoute(graph, A, C, { mode: 'biking' })!;
    expect(biked.etaMinutes).toBeLessThan(route.etaMinutes);
    expect(biked.totalDistanceMeters).toBeCloseTo(route.totalDistanceMeters, 5);
  });

  it('returns nothing when either end is nowhere near the graph', () => {
    const dallas = { lat: 32.7767, lng: -96.797 };
    expect(findRoute(graph, dallas, C)).toBeNull();
    expect(findRoute(graph, A, dallas)).toBeNull();
  });

  it('handles a start and destination that snap to the same node', () => {
    const route = findRoute(graph, { lat: 32.73001, lng: -97.11 }, { lat: 32.73002, lng: -97.11 })!;
    expect(route.nodeIds).toEqual(['A']);
    expect(route.edgeIds).toEqual([]);
    expect(route.etaMinutes).toBeGreaterThanOrEqual(0);
  });
});

describe('findRoute to a room', () => {
  const indoorGraph = buildGraph(INDOOR_TEST_NODES, INDOOR_TEST_EDGES);
  const door = INDOOR_TEST_NODES.find((node) => node.id === 'D205')!;

  it('ends at the exact node asked for, upstairs, even though snapping skips indoor nodes', () => {
    const route = findRoute(indoorGraph, at(0, -100), door.coordinate, { toNodeId: 'D205' })!;
    expect(route.nodeIds).toEqual(['O1', 'O2', 'H1a', 'H1c', 'H1b', 'S1', 'S2', 'H2a', 'H2c', 'D205']);
    expect(route.path[route.path.length - 1]).toEqual(door.coordinate);
    // 100 m outside, 50 m along floor 1, the stairs' 20 m, then 30 m and the 8 m door spur upstairs.
    expect(route.totalDistanceMeters).toBeGreaterThan(205);
    expect(route.totalDistanceMeters).toBeLessThan(215);
  });

  it('pairs every drawn point with its node, keeping both ends of the stairs', () => {
    const route = findRoute(indoorGraph, at(0, -100), door.coordinate, { toNodeId: 'D205' })!;
    expect(route.pathNodes).toHaveLength(route.path.length);
    const ids = route.pathNodes.map((node) => node?.id).filter(Boolean);
    expect(ids).toEqual(route.nodeIds);
    expect(route.pathNodes[route.pathNodes.length - 1]?.room).toBe('205');
  });

  it('leaves points between nodes, and an off-graph start, without a node', () => {
    const route = findRoute(graph, { lat: 32.7297, lng: -97.11 }, C)!;
    expect(route.pathNodes[0]).toBeUndefined();
    expect(route.pathNodes.some((node, i) => i > 0 && i < route.path.length - 1 && !node)).toBe(true);
  });
});

describe('findRoute with building entrances', () => {
  const withDoors = buildGraph([...RING_NODES, ...DOOR_NODES], [...RING_EDGES, ...DOOR_EDGES]);
  const noDoors = buildGraph(RING_NODES, RING_EDGES);
  const north = at(60, 0);

  it('wraps around the building when it can only aim for the center', () => {
    const route = findRoute(noDoors, north, BUILDING_CENTER)!;
    expect(route.nodeIds.at(-1)).toBe('S');
    expect(route.nodeIds).toContain('E');
  });

  it('ends at the nearest door by path, not the center', () => {
    const route = findRoute(withDoors, north, BUILDING_CENTER, { toPoiId: ENTRANCE_POI_ID })!;
    expect(route.nodeIds).toEqual(['A', 'N', 'EN']);
    expect(route.path.at(-1)).toEqual(DOOR_NODES[0].coordinate);
    expect(route.totalDistanceMeters).toBeCloseTo(40, 0);
  });

  it('starts at the nearest door when leaving a building', () => {
    const route = findRoute(withDoors, BUILDING_CENTER, north, { fromPoiId: ENTRANCE_POI_ID })!;
    expect(route.nodeIds).toEqual(['EN', 'N', 'A']);
    expect(route.path[0]).toEqual(DOOR_NODES[0].coordinate);
    expect(route.path.at(-1)).toEqual(north);
  });

  it('falls back to the center when the building has no doors on the map', () => {
    const plain = findRoute(noDoors, north, BUILDING_CENTER)!;
    const named = findRoute(noDoors, north, BUILDING_CENTER, { toPoiId: ENTRANCE_POI_ID })!;
    expect(named.nodeIds).toEqual(plain.nodeIds);
    expect(named.path.at(-1)).toEqual(BUILDING_CENTER);
  });
});
