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

describe('edges that cost more than they measure', () => {
  // DC through a room: 60 m to walk, priced at 300 m, so the 200 m way round through B wins.
  const priced = (cost: number) =>
    buildGraph(TEST_NODES, TEST_EDGES.map((e) => (e.id === 'DC' ? { ...e, costMeters: cost } : e)));

  it('avoids an edge whose cost outweighs its saving', () => {
    const result = shortestPath(priced(300), 'A', 'C');
    expect(result?.nodeIds).toEqual(['A', 'B', 'C']);
    expect(result?.totalDistanceMeters).toBe(200);
  });

  it('still takes a costly edge that is worth it, and reports the real distance', () => {
    // 60 + 90 = 150 of cost beats 200, but the walk is still 120 m.
    const result = shortestPath(priced(90), 'A', 'C');
    expect(result?.nodeIds).toEqual(['A', 'D', 'C']);
    expect(result?.totalDistanceMeters).toBe(120);
  });

  it('takes a costly edge when it is the only way', () => {
    // D-A-B-C: 260 of cost beats 300.
    expect(shortestPath(priced(300), 'D', 'C')?.totalDistanceMeters).toBe(260);
    const onlyWay = buildGraph(TEST_NODES, [
      { id: 'DC', fromNodeId: 'D', toNodeId: 'C', distanceMeters: 60, costMeters: 300, walkable: true },
    ]);
    expect(shortestPath(onlyWay, 'D', 'C')?.totalDistanceMeters).toBe(60);
  });

  it('gives the tree the real distance along the cheapest way', () => {
    expect(shortestPathTree(priced(90), 'A').get('C')).toBe(120);
    expect(shortestPathTree(priced(300), 'A').get('C')).toBe(200);
  });
});

describe('several starts or ends', () => {
  it('stops at whichever target is nearest', () => {
    // From A, D (60 m) is nearer than B (100 m).
    const result = shortestPath(graph, 'A', ['B', 'D']);
    expect(result?.nodeIds).toEqual(['A', 'D']);
    expect(result?.totalDistanceMeters).toBe(60);
  });

  it('leaves from whichever source is nearest', () => {
    const result = shortestPath(graph, ['B', 'D'], 'A');
    expect(result?.nodeIds).toEqual(['D', 'A']);
  });

  it('measures a tree from the nearest of several sources', () => {
    const fromBoth = shortestPathTree(graph, ['A', 'C']);
    const fromA = shortestPathTree(graph, 'A');
    const fromC = shortestPathTree(graph, 'C');
    for (const [nodeId, distance] of fromBoth) {
      expect(distance).toBe(Math.min(fromA.get(nodeId)!, fromC.get(nodeId)!));
    }
  });
});
