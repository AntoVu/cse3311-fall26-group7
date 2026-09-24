import { ISLAND_NODE, TEST_EDGES, TEST_NODES } from '@/routing/__fixtures__/test-graph';
import { buildGraph, neighborsOf, snapToGraph } from '@/routing/graph';

const graph = buildGraph(TEST_NODES, TEST_EDGES);

describe('buildGraph', () => {
  it('can find every node by id', () => {
    for (const node of TEST_NODES) {
      expect(graph.nodeById.get(node.id)).toEqual(node);
    }
  });

  it('makes every edge usable from both ends', () => {
    // The data stores one edge A->D; walking D->A is the same sidewalk.
    expect(neighborsOf(graph, 'A').map((step) => step.toNodeId).sort()).toEqual(['B', 'D']);
    expect(neighborsOf(graph, 'D').map((step) => step.toNodeId).sort()).toEqual(['A', 'C']);
  });

  it('reports no neighbors for a node it has never heard of', () => {
    expect(neighborsOf(graph, 'nope')).toEqual([]);
  });

  it('leaves an unconnected node with no neighbors', () => {
    const lonely = buildGraph([...TEST_NODES, ISLAND_NODE], TEST_EDGES);
    expect(neighborsOf(lonely, 'ISLAND')).toEqual([]);
  });
});

describe('snapToGraph', () => {
  it('returns the node you are standing on', () => {
    const result = snapToGraph(graph, { lat: 32.73, lng: -97.11 });
    expect(result?.nodeId).toBe('A');
    expect(result?.distanceMeters).toBeCloseTo(0, 5);
  });

  it('picks the nearest node, not just any nearby one', () => {
    // A little north of B, so B is nearest even though A and C are both on the same line.
    const result = snapToGraph(graph, { lat: 32.731, lng: -97.11 });
    expect(result?.nodeId).toBe('B');
  });

  it('reports how far the walk to the graph is', () => {
    const result = snapToGraph(graph, { lat: 32.7301, lng: -97.11 });
    expect(result?.nodeId).toBe('A');
    // About 11 m north of A.
    expect(result?.distanceMeters).toBeGreaterThan(8);
    expect(result?.distanceMeters).toBeLessThan(15);
  });

  it('gives up rather than snapping somewhere absurd', () => {
    // Downtown Dallas: nothing on this graph is a sensible walk from there.
    expect(snapToGraph(graph, { lat: 32.7767, lng: -96.797 })).toBeNull();
  });

  it('honors a caller-supplied reach', () => {
    const justNorthOfA = { lat: 32.7301, lng: -97.11 };
    expect(snapToGraph(graph, justNorthOfA, 5)).toBeNull();
    expect(snapToGraph(graph, justNorthOfA, 50)?.nodeId).toBe('A');
  });

  it('never snaps to a node no edge reaches', () => {
    // Standing right on the island: it is closest, but routing could not leave it.
    const withIsland = buildGraph([...TEST_NODES, ISLAND_NODE], TEST_EDGES);
    const result = snapToGraph(withIsland, ISLAND_NODE.coordinate);
    expect(result?.nodeId).not.toBe('ISLAND');
  });
});
