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
