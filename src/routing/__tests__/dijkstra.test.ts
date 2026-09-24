import { ISLAND_NODE, TEST_EDGES, TEST_NODES } from '@/routing/__fixtures__/test-graph';
import { shortestPath, shortestPathTree } from '@/routing/dijkstra';
import { buildGraph } from '@/routing/graph';

const graph = buildGraph(TEST_NODES, TEST_EDGES);

describe('shortestPath', () => {
  it('follows distance rather than counting hops', () => {
    // A-B-C and A-D-C are both two edges, but A-D-C is 120 m against 200 m.
    const result = shortestPath(graph, 'A', 'C');
    expect(result?.nodeIds).toEqual(['A', 'D', 'C']);
    expect(result?.totalDistanceMeters).toBe(120);
  });

  it('names the edges it used, in order', () => {
    expect(shortestPath(graph, 'A', 'C')?.edgeIds).toEqual(['AD', 'DC']);
  });

  it('costs nothing to stay put', () => {
    const result = shortestPath(graph, 'A', 'A');
    expect(result).toEqual({ nodeIds: ['A'], edgeIds: [], totalDistanceMeters: 0 });
  });

  it('works the same in either direction', () => {
    const there = shortestPath(graph, 'A', 'C');
    const back = shortestPath(graph, 'C', 'A');
    expect(back?.totalDistanceMeters).toBe(there?.totalDistanceMeters);
    expect(back?.nodeIds).toEqual([...there!.nodeIds].reverse());
  });

  it('takes the single edge when two nodes are joined directly', () => {
    expect(shortestPath(graph, 'A', 'B')?.nodeIds).toEqual(['A', 'B']);
    expect(shortestPath(graph, 'A', 'B')?.totalDistanceMeters).toBe(100);
  });

  it('returns nothing when there is no way through', () => {
    const withIsland = buildGraph([...TEST_NODES, ISLAND_NODE], TEST_EDGES);
    expect(shortestPath(withIsland, 'A', 'ISLAND')).toBeNull();
  });

  it('returns nothing for a node that is not in the graph', () => {
    expect(shortestPath(graph, 'A', 'nope')).toBeNull();
    expect(shortestPath(graph, 'nope', 'A')).toBeNull();
  });
});

describe('shortestPathTree', () => {
  it('measures every reachable node in one pass', () => {
    const distances = shortestPathTree(graph, 'A');
    expect(distances.get('A')).toBe(0);
    expect(distances.get('B')).toBe(100);
    expect(distances.get('D')).toBe(60);
    // Via D, not the 200 m way round through B.
    expect(distances.get('C')).toBe(120);
  });

  it('agrees with a one-to-one search', () => {
    const distances = shortestPathTree(graph, 'A');
    for (const target of ['A', 'B', 'C', 'D']) {
      expect(distances.get(target)).toBe(shortestPath(graph, 'A', target)!.totalDistanceMeters);
    }
  });

  it('leaves out what it cannot reach', () => {
    const withIsland = buildGraph([...TEST_NODES, ISLAND_NODE], TEST_EDGES);
    expect(shortestPathTree(withIsland, 'A').has('ISLAND')).toBe(false);
  });

  it('is empty for a node that is not in the graph', () => {
    expect(shortestPathTree(graph, 'nope').size).toBe(0);
  });
});
