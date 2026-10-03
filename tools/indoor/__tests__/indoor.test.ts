import { distanceMeters, metersPerDegreeLatitude, metersPerDegreeLongitude } from '../../../src/routing/geo';
import type { Coordinate, MapEdge, MapNode } from '../../../src/types/map';
import {
  ELEVATOR_METERS_PER_FLOOR,
  EMPTY_INDOOR_EDITS,
  STAIRS_METERS_PER_FLOOR,
  buildIndoorGraph,
  joinEntrances,
  listEntrances,
  parseEvacName,
  parseIndoorEdits,
  type IndoorBuilding,
  type IndoorEdits,
} from '../indoor';

// A point `east` and `north` meters from a fixed spot on campus.
const ORIGIN = { lat: 32.73, lng: -97.11 };
const m = (east: number, north: number): Coordinate => ({
  lat: ORIGIN.lat + north / metersPerDegreeLatitude(),
  lng: ORIGIN.lng + east / metersPerDegreeLongitude(ORIGIN.lat),
});

function building(partial: Partial<IndoorBuilding>): IndoorBuilding {
  return { floors: ['1', '2', '3'], hallways: [], doors: [], connectors: [], entrances: [], ...partial };
}

function build(b: IndoorBuilding, entranceNodeIds = new Map<string, string>()) {
  const edits: IndoorEdits = { version: 1, buildings: { ERB: b } };
  return buildIndoorGraph(edits, new Map([['ERB', 'academic-engineering-research-building']]), entranceNodeIds);
}

/** Every node id reachable from `start`, walking edges both ways. */
function reachable(edges: MapEdge[], start: string): Set<string> {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const edge of edges) {
      const next =
        edge.fromNodeId === current ? edge.toNodeId : edge.toNodeId === current ? edge.fromNodeId : null;
      if (next && !seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

const nodeAt = (nodes: MapNode[], c: Coordinate) => nodes.find((n) => distanceMeters(n.coordinate, c) < 0.01);

describe('parseEvacName', () => {
  it('reads building, room and floor from a plain room', () => {
    expect(parseEvacName('Evac_NH_315.pdf')).toEqual({ building: 'NH', room: '315', floor: '3' });
  });

  it('puts B-prefixed rooms in the basement', () => {
    expect(parseEvacName('Evac_NH_B09.pdf')).toEqual({ building: 'NH', room: 'B09', floor: 'B' });
    expect(parseEvacName('Evac_NH_B20A.pdf')).toEqual({ building: 'NH', room: 'B20A', floor: 'B' });
  });

  it('reads corridor codes and odd numbers by their first digit', () => {
    expect(parseEvacName('Evac_ERB_5C3.pdf')?.floor).toBe('5');
    expect(parseEvacName('Evac_NH_5151.pdf')?.floor).toBe('5');
  });

  it('splits off a variant suffix', () => {
    expect(parseEvacName('Evac_ERB_335B-1.pdf')).toEqual({ building: 'ERB', room: '335B', floor: '3', variant: '1' });
  });

  it('ignores case in the extension and takes a full path', () => {
    expect(parseEvacName('cache/evac/WH/Evac_WH_400.PDF')?.room).toBe('400');
  });

  it('returns null for anything else', () => {
    expect(parseEvacName('notes.txt')).toBeNull();
    expect(parseEvacName('Evac_NH_.pdf')).toBeNull();
    expect(parseEvacName('Evac_NH_X12.pdf')).toBeNull();
  });
});

describe('parseIndoorEdits', () => {
  const valid = {
    version: 1,
    buildings: {
      ERB: building({
        hallways: [{ key: 'h1', floor: '1', points: [{ ...m(0, 0), image: { layout: 'L1', u: 0.1, v: 0.2 } }, m(10, 0)] }],
        doors: [{ key: 'd1', floor: '1', room: '105', at: m(5, 2) }],
      }),
    },
  };

  it('accepts the empty file the repo starts with', () => {
    expect(parseIndoorEdits(JSON.parse(JSON.stringify(EMPTY_INDOOR_EDITS)))).toEqual(EMPTY_INDOOR_EDITS);
  });

  it('keeps the tool-only image positions', () => {
    const parsed = parseIndoorEdits(JSON.parse(JSON.stringify(valid)));
    expect(parsed.buildings.ERB.hallways[0].points[0].image).toEqual({ layout: 'L1', u: 0.1, v: 0.2 });
  });

  it('rejects a version it does not know', () => {
    expect(() => parseIndoorEdits({ ...valid, version: 2 })).toThrow(/version 2/);
  });

  it('rejects a floor the building does not list', () => {
    const bad = { version: 1, buildings: { ERB: building({ doors: [{ key: 'd1', floor: '9', room: '905', at: m(0, 0) }] }) } };
    expect(() => parseIndoorEdits(bad)).toThrow(/ERB.*d1.*floor "9"/);
  });

  it('rejects a point that is not a coordinate', () => {
    const bad = { version: 1, buildings: { ERB: { ...building({}), hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), { lat: 'x' }] }] } } };
    expect(() => parseIndoorEdits(bad)).toThrow(/ERB.*h1/);
  });

  it('rejects a duplicate key within a building', () => {
    const bad = {
      version: 1,
      buildings: {
        ERB: building({
          hallways: [{ key: 'k', floor: '1', points: [m(0, 0), m(1, 0)] }],
          doors: [{ key: 'k', floor: '1', room: '101', at: m(0, 1) }],
        }),
      },
    };
    expect(() => parseIndoorEdits(bad)).toThrow(/ERB.*"k".*twice/);
  });

  it('rejects a connector of an unknown kind', () => {
    const bad = { version: 1, buildings: { ERB: { ...building({}), connectors: [{ key: 'c', kind: 'ladder', name: 'x', floors: ['1', '2'], at: m(0, 0) }] } } };
    expect(() => parseIndoorEdits(bad)).toThrow(/ladder/);
  });

  it('rejects a hallway with fewer than two points', () => {
    const bad = { version: 1, buildings: { ERB: building({ hallways: [{ key: 'h', floor: '1', points: [m(0, 0)] }] }) } };
    expect(() => parseIndoorEdits(bad)).toThrow(/at least 2/);
  });
});

describe('joinEntrances', () => {
  it('links each entrance to the nearest walkway node as a new dead-end node', () => {
    const coordinates = new Map<number, Coordinate>([
      [1, m(0, 0)],
      [2, m(50, 0)],
    ]);
    const { ways, rawIds, unjoined } = joinEntrances([{ key: 'ERB/e1', at: m(10, 0) }], coordinates, 30);

    const id = rawIds.get('ERB/e1')!;
    expect(id).toBeLessThan(-999_999); // clear of the ids traced walkways use
    expect(ways).toEqual([{ id: expect.any(Number), nodes: [id, 1], tags: { highway: 'footway', name: 'entrance ERB/e1' } }]);
    expect(coordinates.get(id)).toEqual(m(10, 0));
    expect(unjoined).toEqual([]);
  });

  it('reports an entrance with no walkway in reach', () => {
    const coordinates = new Map<number, Coordinate>([[1, m(0, 0)]]);
    const result = joinEntrances([{ key: 'ERB/e1', at: m(100, 0) }], coordinates, 30);
    expect(result.ways).toEqual([]);
    expect(result.unjoined).toEqual(['ERB/e1']);
  });

  it('never links one entrance to another', () => {
    const coordinates = new Map<number, Coordinate>([[1, m(0, 0)]]);
    const { ways } = joinEntrances(
      [
        { key: 'A/e1', at: m(20, 0) },
        { key: 'A/e2', at: m(21, 0) },
      ],
      coordinates,
      30
    );
    expect(ways.map((w) => w.nodes[1])).toEqual([1, 1]);
  });

  it('lists entrances under building-qualified keys', () => {
    const edits: IndoorEdits = { version: 1, buildings: { ERB: building({ entrances: [{ key: 'e1', floor: '1', at: m(0, 0) }] }) } };
    expect(listEntrances(edits)).toEqual([{ key: 'ERB/e1', at: m(0, 0) }]);
  });
});

describe('buildIndoorGraph', () => {
  it('merges hallway ends that meet within a meter', () => {
    const { nodes, edges } = build(
      building({
        hallways: [
          { key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] },
          { key: 'h2', floor: '1', points: [m(20.5, 0), m(20.5, 10)] },
        ],
      })
    );
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
  });

  it('keeps floors apart even where hallways stack', () => {
    const { nodes } = build(
      building({
        hallways: [
          { key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] },
          { key: 'h2', floor: '2', points: [m(0, 0), m(20, 0)] },
        ],
      })
    );
    expect(nodes).toHaveLength(4);
    expect(nodes.map((n) => n.level).sort()).toEqual(['1', '1', '2', '2']);
  });

  it('splits a hallway where another one ends against it', () => {
    const { nodes, edges } = build(
      building({
        hallways: [
          { key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] },
          { key: 'h2', floor: '1', points: [m(10, 0.3), m(10, 10)] },
        ],
      })
    );
    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(3);
    const junction = nodeAt(nodes, m(10, 0.3))!;
    expect(edges.filter((e) => e.fromNodeId === junction.id || e.toNodeId === junction.id)).toHaveLength(3);
  });

  it('gives a door its own node, joined to the nearest point of the hallway', () => {
    const { nodes, edges } = build(
      building({
        hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] }],
        doors: [{ key: 'd1', floor: '1', room: '105', at: m(5, 2) }],
      })
    );
    const door = nodes.find((n) => n.room === '105')!;
    expect(door).toMatchObject({ level: '1', poiId: 'academic-engineering-research-building', coordinate: m(5, 2) });

    const doorEdge = edges.find((e) => e.fromNodeId === door.id || e.toNodeId === door.id)!;
    expect(doorEdge.distanceMeters).toBeCloseTo(2, 1);
    expect(nodeAt(nodes, m(5, 0))).toBeDefined();
    expect(edges).toHaveLength(3); // the hallway, split in two, plus the door
  });

  it('leaves a door with no hallway in reach unattached and says so', () => {
    const { nodes, problems } = build(
      building({
        hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] }],
        doors: [{ key: 'd1', floor: '1', room: '105', at: m(5, 40) }],
      })
    );
    expect(nodes.find((n) => n.room === '105')).toBeUndefined();
    expect(problems.join('\n')).toMatch(/ERB.*105/);
  });

  it('links stairs between consecutive floors only, at the stairs cost', () => {
    const hall = (floor: string) => ({ key: `h${floor}`, floor, points: [m(0, 0), m(20, 0)] });
    const { nodes, edges } = build(
      building({
        hallways: [hall('1'), hall('2'), hall('3')],
        connectors: [{ key: 'c1', kind: 'stairs', name: 'West', floors: ['3', '1', '2'], at: m(0, 1) }],
      })
    );
    const stairNodes = nodes.filter((n) => distanceMeters(n.coordinate, m(0, 1)) < 0.01);
    expect(stairNodes.map((n) => n.level).sort()).toEqual(['1', '2', '3']);

    const stairIds = new Set(stairNodes.map((n) => n.id));
    const vertical = edges.filter((e) => stairIds.has(e.fromNodeId) && stairIds.has(e.toNodeId));
    expect(vertical).toHaveLength(2);
    expect(vertical.every((e) => e.distanceMeters === STAIRS_METERS_PER_FLOOR)).toBe(true);
  });

  it('charges an elevator that skips a floor for both floors', () => {
    const hall = (floor: string) => ({ key: `h${floor}`, floor, points: [m(0, 0), m(20, 0)] });
    const { nodes, edges } = build(
      building({
        hallways: [hall('1'), hall('3')],
        connectors: [{ key: 'c1', kind: 'elevator', name: 'Main', floors: ['1', '3'], at: m(10, 1) }],
      })
    );
    const ids = new Set(nodes.filter((n) => distanceMeters(n.coordinate, m(10, 1)) < 0.01).map((n) => n.id));
    const vertical = edges.filter((e) => ids.has(e.fromNodeId) && ids.has(e.toNodeId));
    expect(vertical.map((e) => e.distanceMeters)).toEqual([2 * ELEVATOR_METERS_PER_FLOOR]);
  });

  it('joins an entrance to the outdoor node the import made for it', () => {
    const { edges, nodes } = build(
      building({
        hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] }],
        doors: [{ key: 'd1', floor: '1', room: '110', at: m(15, 2) }],
        entrances: [{ key: 'e1', floor: '1', at: m(-3, 0) }],
      }),
      new Map([['ERB/e1', 'n42']])
    );
    // The entrance reuses the outdoor node rather than adding one of its own.
    expect(nodes.some((n) => n.id === 'n42')).toBe(false);
    const door = nodes.find((n) => n.room === '110')!;
    expect(reachable(edges, 'n42').has(door.id)).toBe(true);
    const entranceEdge = edges.find((e) => e.fromNodeId === 'n42' || e.toNodeId === 'n42')!;
    expect(entranceEdge.distanceMeters).toBeCloseTo(3, 1);
  });

  it('reports an entrance the import could not join outdoors', () => {
    const { problems } = build(
      building({
        hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] }],
        entrances: [{ key: 'e1', floor: '1', at: m(-3, 0) }],
      })
    );
    expect(problems.join('\n')).toMatch(/ERB.*e1/);
  });

  it('skips a building that is not on the map', () => {
    const edits: IndoorEdits = {
      version: 1,
      buildings: { XYZ: building({ hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] }] }) },
    };
    const { nodes, problems } = buildIndoorGraph(edits, new Map(), new Map());
    expect(nodes).toEqual([]);
    expect(problems.join('\n')).toMatch(/XYZ/);
  });

  it('prefixes its ids so they never collide with the outdoor graph', () => {
    const { nodes, edges } = build(
      building({
        hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), m(20, 0), m(20, 20)] }],
        doors: [{ key: 'd1', floor: '1', room: '105', at: m(5, 2) }],
      })
    );
    expect(nodes.every((n) => /^i\d+$/.test(n.id))).toBe(true);
    expect(edges.every((e) => /^ie\d+$/.test(e.id))).toBe(true);
    expect(new Set(nodes.map((n) => n.id)).size).toBe(nodes.length);
    expect(edges.every((e) => e.walkable)).toBe(true);
  });
});
