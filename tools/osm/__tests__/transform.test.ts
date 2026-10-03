import type { Coordinate } from '../../../src/types/map';
import {
  buildWalkwayGraph,
  closestPointOnSegment,
  compactIds,
  largestComponent,
  groupCenter,
  polygonCenter,
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

describe('closestPointOnSegment', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 0 };

  it('projects onto the middle of the segment', () => {
    expect(closestPointOnSegment({ x: 4, y: 3 }, a, b)).toEqual({ t: 0.4, distance: 3 });
  });

  it('clamps to the nearer end past either side', () => {
    expect(closestPointOnSegment({ x: -3, y: 4 }, a, b)).toEqual({ t: 0, distance: 5 });
    expect(closestPointOnSegment({ x: 13, y: 4 }, a, b)).toEqual({ t: 1, distance: 5 });
  });

  it('treats a zero-length segment as a point', () => {
    expect(closestPointOnSegment({ x: 3, y: 4 }, a, a)).toEqual({ t: 0, distance: 5 });
  });
});

describe('slugify', () => {
  it('makes a name safe to use inside an id', () => {
    expect(slugify('Nedderman Hall')).toBe('nedderman-hall');
    expect(slugify('Chemistry & Physics Building')).toBe('chemistry-physics-building');
    expect(slugify('  Lot 36 Upgrade  ')).toBe('lot-36-upgrade');
  });
});

describe('polygonCenter', () => {
  // A kiosk-sized square, about 11 m by 9 m. Its corners are far from (0, 0) in degree terms,
  // which is what used to break the area-weighted formula: the cross products are around
  // 3,000 and cancel down to 1e-8, and rounding error took the result hundreds of meters away.
  it('stays on a small building far from the origin', () => {
    const center = polygonCenter([at(0, 0), at(0, 1), at(1, 1), at(1, 0)]);
    expect(center.lat).toBeCloseTo(BASE_LAT + 0.5 * STEP, 9);
    expect(center.lng).toBeCloseTo(BASE_LNG + 0.5 * STEP, 9);
  });

  it('weights by area, so an L-shape centers toward its bulk', () => {
    // A 2x2 block with the top-right quarter missing.
    const center = polygonCenter([at(0, 0), at(0, 2), at(1, 2), at(1, 1), at(2, 1), at(2, 0)]);
    expect(center.lat).toBeCloseTo(BASE_LAT + (5 / 6) * STEP, 9);
    expect(center.lng).toBeCloseTo(BASE_LNG + (5 / 6) * STEP, 9);
  });

  it('gives the same answer whether or not the ring repeats its first point', () => {
    const open = [at(0, 0), at(0, 3), at(2, 3), at(2, 0)];
    const closed = polygonCenter([...open, open[0]]);
    expect(closed.lat).toBeCloseTo(polygonCenter(open).lat, 9);
    expect(closed.lng).toBeCloseTo(polygonCenter(open).lng, 9);
  });
});

describe('groupCenter', () => {
  it('is the polygon center when there is only one part', () => {
    const ring = [at(0, 0), at(0, 3), at(2, 3), at(2, 0)];
    const center = groupCenter([ring]);
    expect(center.lat).toBeCloseTo(polygonCenter(ring).lat, 9);
    expect(center.lng).toBeCloseTo(polygonCenter(ring).lng, 9);
  });

  // ARB is two halves; the marker should sit toward the bigger one, not halfway between.
  it('weights each part by its area', () => {
    const big = [at(0, 0), at(0, 3), at(3, 3), at(3, 0)]; // 9 square steps, center (1.5, 1.5)
    const small = [at(0, 10), at(0, 11), at(1, 11), at(1, 10)]; // 1 square step, center (0.5, 10.5)
    const center = groupCenter([big, small]);
    expect(center.lat).toBeCloseTo(BASE_LAT + ((9 * 1.5 + 1 * 0.5) / 10) * STEP, 9);
    expect(center.lng).toBeCloseTo(BASE_LNG + ((9 * 1.5 + 1 * 10.5) / 10) * STEP, 9);
  });

  it('falls back to the average of the points when every part is flat', () => {
    const center = groupCenter([[at(0, 0), at(0, 2)], [at(2, 0), at(2, 2)]]);
    expect(center.lat).toBeCloseTo(BASE_LAT + 1 * STEP, 9);
    expect(center.lng).toBeCloseTo(BASE_LNG + 1 * STEP, 9);
  });
});
