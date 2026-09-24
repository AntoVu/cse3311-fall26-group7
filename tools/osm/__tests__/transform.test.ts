import type { Coordinate } from '../../../src/types/map';
import {
  buildWalkwayGraph,
  compactIds,
  largestComponent,
  simplifyPath,
  slugify,
} from '../transform';

// At UTA's latitude one ten-thousandth of a degree is about 11.1 m north-south
// and 9.3 m east-west, which is what the round numbers below lean on.
const STEP = 0.0001;
const BASE_LAT = 32.73;
const BASE_LNG = -97.11;

/** A node `north` steps north and `east` steps east of the base point. */
function at(north: number, east: number): Coordinate {
  return { lat: BASE_LAT + north * STEP, lng: BASE_LNG + east * STEP };
}

function coordinatesOf(entries: Record<number, Coordinate>) {
  return new Map(Object.entries(entries).map(([id, coordinate]) => [Number(id), coordinate]));
}

describe('buildWalkwayGraph', () => {
  it('collapses a run of pass-through nodes into a single edge that keeps the shape', () => {
    const graph = buildWalkwayGraph(
      [{ id: 1, nodes: [1, 2, 3, 4] }],
      coordinatesOf({ 1: at(0, 0), 2: at(1, 0), 3: at(2, 0), 4: at(3, 0) })
    );

    expect(graph.nodes.map((node) => node.id)).toEqual(['way-node-1', 'way-node-4']);
    expect(graph.edges).toHaveLength(1);
    // The two interior points are gone from the graph but survive on the edge,
    // so the drawn route still follows the real sidewalk.
    expect(graph.edges[0].path).toHaveLength(4);
    expect(graph.edges[0].distanceMeters).toBeCloseTo(33.4, 0);
  });

  it('keeps a junction where three ways meet', () => {
    const graph = buildWalkwayGraph(
      [
        { id: 1, nodes: [1, 2, 3] },
        { id: 2, nodes: [2, 4] },
      ],
      coordinatesOf({ 1: at(0, 0), 2: at(1, 0), 3: at(2, 0), 4: at(1, 1) })
    );

    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toHaveLength(3);
    const junction = 'way-node-2';
    expect(graph.edges.every((edge) => edge.fromNodeId === junction || edge.toNodeId === junction)).toBe(
      true
    );
  });

  it('measures an edge along its bends, not straight across them', () => {
    const graph = buildWalkwayGraph(
      [{ id: 1, nodes: [1, 2, 3] }],
      coordinatesOf({ 1: at(0, 0), 2: at(3, 0), 3: at(3, 3) })
    );

    const edge = graph.edges[0];
    const straightLine = Math.hypot(3 * 11.12, 3 * 9.35);
    expect(edge.distanceMeters).toBeGreaterThan(straightLine);
    expect(edge.distanceMeters).toBeCloseTo(3 * 11.12 + 3 * 9.35, 0);
  });

  it('walks a chain once, not once from each end', () => {
    const graph = buildWalkwayGraph(
      [{ id: 1, nodes: [1, 2, 3] }],
      coordinatesOf({ 1: at(0, 0), 2: at(1, 0), 3: at(2, 0) })
    );
    expect(graph.edges).toHaveLength(1);
  });

  it('drops a loop that leaves and returns to the same point, since no route needs it', () => {
    const graph = buildWalkwayGraph(
      [{ id: 1, nodes: [1, 2, 3, 1] }],
      coordinatesOf({ 1: at(0, 0), 2: at(1, 0), 3: at(1, 1) })
    );
    expect(graph.edges).toHaveLength(0);
    expect(graph.nodes).toHaveLength(0);
  });

  it('ignores segments whose coordinates are missing from the export', () => {
    const graph = buildWalkwayGraph(
      [{ id: 1, nodes: [1, 2, 99] }],
      coordinatesOf({ 1: at(0, 0), 2: at(1, 0) })
    );
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].path).toHaveLength(2);
  });
});

describe('largestComponent', () => {
  it('keeps the main network and reports what it dropped', () => {
    const graph = buildWalkwayGraph(
      [
        { id: 1, nodes: [1, 2, 3] },
        { id: 2, nodes: [2, 4] },
        // An island with no connection to the rest.
        { id: 3, nodes: [10, 11] },
      ],
      coordinatesOf({
        1: at(0, 0),
        2: at(1, 0),
        3: at(2, 0),
        4: at(1, 1),
        10: at(20, 20),
        11: at(21, 20),
      })
    );

    const result = largestComponent(graph);
    expect(result.graph.nodes).toHaveLength(4);
    expect(result.graph.edges).toHaveLength(3);
    expect(result.droppedComponents).toBe(1);
    expect(result.droppedNodeCount).toBe(2);
    expect(result.graph.nodes.map((node) => node.id)).not.toContain('way-node-10');
  });

  it('leaves an already-connected graph alone', () => {
    const graph = buildWalkwayGraph(
      [{ id: 1, nodes: [1, 2, 3] }],
      coordinatesOf({ 1: at(0, 0), 2: at(1, 0), 3: at(2, 0) })
    );
    const result = largestComponent(graph);
    expect(result.droppedComponents).toBe(0);
    expect(result.droppedNodeCount).toBe(0);
    expect(result.graph.edges).toEqual(graph.edges);
  });
});

describe('compactIds', () => {
  const graph = buildWalkwayGraph(
    [
      { id: 1, nodes: [111111111, 222222222, 333333333] },
      { id: 2, nodes: [222222222, 444444444] },
    ],
    coordinatesOf({
      111111111: at(0, 0),
      222222222: at(1, 0),
      333333333: at(2, 0),
      444444444: at(1, 1),
    })
  );

  it('renumbers nodes and edges to short sequential ids', () => {
    const { graph: compact } = compactIds(graph);
    expect(compact.nodes.map((node) => node.id)).toEqual(['n0', 'n1', 'n2', 'n3']);
    expect(compact.edges.map((edge) => edge.id)).toEqual(['e0', 'e1', 'e2']);
  });

  it('repoints every edge at the renamed nodes, keeping the graph intact', () => {
    const { graph: compact } = compactIds(graph);
    const nodeIds = new Set(compact.nodes.map((node) => node.id));
    for (const edge of compact.edges) {
      expect(nodeIds.has(edge.fromNodeId)).toBe(true);
      expect(nodeIds.has(edge.toNodeId)).toBe(true);
    }
    // The junction still joins all three edges, as it did before renumbering.
    const counts = new Map<string, number>();
    for (const edge of compact.edges) {
      for (const id of [edge.fromNodeId, edge.toNodeId]) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    expect(Math.max(...counts.values())).toBe(3);
  });

  it('keeps coordinates, distances and shapes untouched', () => {
    const { graph: compact } = compactIds(graph);
    expect(compact.nodes.map((node) => node.coordinate)).toEqual(
      graph.nodes.map((node) => node.coordinate)
    );
    expect(compact.edges.map((edge) => edge.distanceMeters)).toEqual(
      graph.edges.map((edge) => edge.distanceMeters)
    );
  });

  it('can name the original OSM node behind a short id', () => {
    const { originalNodeIds } = compactIds(graph);
    expect(originalNodeIds.get('n0')).toBe('way-node-111111111');
  });
});

describe('simplifyPath', () => {
  it('drops points that sit on the line between their neighbors', () => {
    const straight = [at(0, 0), at(1, 0), at(2, 0), at(3, 0)];
    expect(simplifyPath(straight, 1)).toEqual([at(0, 0), at(3, 0)]);
  });

  it('keeps a corner that is further off the line than the tolerance', () => {
    const corner = [at(0, 0), at(0, 3), at(3, 3)];
    expect(simplifyPath(corner, 1)).toHaveLength(3);
  });

  it('smooths away a wobble smaller than the tolerance', () => {
    // The middle point is about 0.9 m off the straight line; a 2 m tolerance removes it.
    const wobble = [at(0, 0), { lat: BASE_LAT + STEP, lng: BASE_LNG + STEP * 0.1 }, at(2, 0)];
    expect(simplifyPath(wobble, 2)).toEqual([at(0, 0), at(2, 0)]);
  });

  it('never drops the endpoints, and passes short paths straight through', () => {
    const pair = [at(0, 0), at(5, 5)];
    expect(simplifyPath(pair, 100)).toEqual(pair);
    expect(simplifyPath([at(0, 0)], 100)).toEqual([at(0, 0)]);
    expect(simplifyPath([], 100)).toEqual([]);
  });
});

describe('slugify', () => {
  it('makes a name safe to use inside an id', () => {
    expect(slugify('Nedderman Hall')).toBe('nedderman-hall');
    expect(slugify('Chemistry & Physics Building')).toBe('chemistry-physics-building');
    expect(slugify('  Lot 36 Upgrade  ')).toBe('lot-36-upgrade');
  });
});
