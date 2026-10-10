import { distanceMeters, metersPerDegreeLatitude, metersPerDegreeLongitude } from '../../../src/routing/geo';
import type { Coordinate, MapEdge, MapNode } from '../../../src/types/map';
import {
  ELEVATOR_METERS_PER_FLOOR,
  ROOM_COST_FACTOR,
  EMPTY_INDOOR_EDITS,
  STAIRS_METERS_PER_FLOOR,
  buildIndoorGraph,
  floorPlansByPoi,
  joinEntrances,
  labelPoint,
  listEntrances,
  mapOutlineFor,
  parseEvacName,
  parseIndoorEdits,
  roomRing,
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
  return {
    floors: ['1', '2', '3'],
    hallways: [],
    doors: [],
    connectingDoors: [],
    connectors: [],
    entrances: [],
    objects: [],
    areas: [],
    rooms: [],
    solids: [],
    floorOutlines: {},
    ...partial,
  };
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

  it('ignores the one-way stair direction older files carry: every flight goes both ways', () => {
    const hall = (floor: string) => ({ key: `h${floor}`, floor, points: [m(0, 0), m(20, 0)] });
    const old = {
      version: 1,
      buildings: {
        ERB: {
          ...building({ hallways: [hall('1'), hall('2')] }),
          connectors: [{ key: 'c', kind: 'stairs', name: 'x', floors: ['1', '2'], at: m(0, 1), direction: 'up' }],
        },
      },
    };
    const { edges } = build(parseIndoorEdits(old).buildings.ERB);
    expect(edges.some((e) => 'oneWay' in e)).toBe(false);
  });

  it('rejects a connecting door without two different rooms', () => {
    const withDoor = (sides: unknown) => ({
      version: 1,
      buildings: { ERB: { ...building({}), connectingDoors: [{ key: 'cd', floor: '1', at: m(0, 0), sides }] } },
    });
    expect(() => parseIndoorEdits(withDoor([{ room: '105', at: m(0, -1) }]))).toThrow(/two sides/);
    expect(() => parseIndoorEdits(withDoor([{ room: '105', at: m(0, -1) }, { room: '105', at: m(0, 1) }]))).toThrow(/two different rooms/);
    expect(() => parseIndoorEdits(withDoor([{ room: '105', at: m(0, -1) }, { room: '', at: m(0, 1) }]))).toThrow(/room number/);
    expect(parseIndoorEdits(withDoor([{ room: '105', at: m(0, -1) }, { room: '105A', at: m(0, 1) }])).buildings.ERB.connectingDoors).toHaveLength(1);
  });

  it('reads a file with no connecting doors as an empty list', () => {
    const file = { version: 1, buildings: { ERB: { floors: ['1'] } } };
    expect(parseIndoorEdits(file).buildings.ERB.connectingDoors).toEqual([]);
  });

  it('rejects a stair spot on a floor the stair does not serve', () => {
    const bad = {
      version: 1,
      buildings: { ERB: { ...building({}), connectors: [{ key: 'c', kind: 'stairs', name: 'x', floors: ['1', '2'], at: m(0, 0), stops: { '3': m(1, 1) } }] } },
    };
    expect(() => parseIndoorEdits(bad)).toThrow(/floor 3/);
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
    expect(listEntrances(edits)).toEqual([{ key: 'ERB/e1', building: 'ERB', at: m(0, 0) }]);
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
    expect(stairNodes.every((n) => n.connector === 'stairs')).toBe(true);

    const stairIds = new Set(stairNodes.map((n) => n.id));
    const vertical = edges.filter((e) => stairIds.has(e.fromNodeId) && stairIds.has(e.toNodeId));
    expect(vertical).toHaveLength(2);
    expect(vertical.every((e) => e.distanceMeters === STAIRS_METERS_PER_FLOOR)).toBe(true);
  });

  it('puts a stair at its own spot on a floor where it comes out elsewhere', () => {
    const { nodes, edges } = build(
      building({
        hallways: [
          { key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] },
          { key: 'h2', floor: '2', points: [m(15, -10), m(15, 10)] },
        ],
        connectors: [{ key: 'c1', kind: 'stairs', name: 'North', floors: ['1', '2'], at: m(5, 1), stops: { '2': m(14, 2) } }],
      })
    );
    const stairs = nodes.filter((n) => n.connector === 'stairs');
    expect(stairs.find((n) => n.level === '1')!.coordinate).toEqual(m(5, 1));
    const top = stairs.find((n) => n.level === '2')!;
    expect(top.coordinate).toEqual(m(14, 2));
    // Joined to the floor 2 hallway a meter away, not left 10 m off at the bottom's spot.
    const spur = edges.find((e) => (e.fromNodeId === top.id || e.toNodeId === top.id) && e.distanceMeters < 5)!;
    expect(spur.distanceMeters).toBeCloseTo(1, 1);
    const flight = edges.find((e) => stairs.some((n) => n.id === e.fromNodeId) && stairs.some((n) => n.id === e.toNodeId))!;
    expect(flight.distanceMeters).toBe(STAIRS_METERS_PER_FLOOR);
  });

  it('reaches an inner office through the room in front of it', () => {
    const { nodes, edges } = build(
      building({
        hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] }],
        doors: [{ key: 'd1', floor: '1', room: '105', at: m(5, 2) }],
        connectingDoors: [{ key: 'cd1', floor: '1', at: m(5, 6), sides: [{ room: '105', at: m(5, 5) }, { room: '105A', at: m(5, 7) }] }],
      })
    );
    const office = nodes.find((n) => n.room === '105A')!;
    expect(office).toMatchObject({ level: '1', coordinate: m(5, 7) });
    const door105 = nodes.find((n) => n.room === '105')!;
    expect(reachable(edges, door105.id).has(office.id)).toBe(true);
    // One node per room: 105 reuses its hallway door rather than gaining a second.
    expect(nodes.filter((n) => n.room === '105')).toHaveLength(1);
  });

  it('follows a chain of inner rooms, whatever order the doors are listed in', () => {
    const { nodes, edges } = build(
      building({
        hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] }],
        doors: [{ key: 'd1', floor: '1', room: '129', at: m(5, 2) }],
        connectingDoors: [
          { key: 'cd2', floor: '1', at: m(5, 10), sides: [{ room: '129A', at: m(5, 9) }, { room: '129B', at: m(5, 11) }] },
          { key: 'cd1', floor: '1', at: m(5, 6), sides: [{ room: '129', at: m(5, 5) }, { room: '129A', at: m(5, 7) }] },
        ],
      })
    );
    const door129 = nodes.find((n) => n.room === '129')!;
    const inner = nodes.find((n) => n.room === '129B')!;
    expect(reachable(edges, door129.id).has(inner.id)).toBe(true);
    expect(nodes.filter((n) => n.room === '129A')).toHaveLength(1);
  });

  it('links two rooms that both open onto the hallway', () => {
    const { nodes, edges } = build(
      building({
        hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] }],
        doors: [
          { key: 'd1', floor: '1', room: '105', at: m(5, 2) },
          { key: 'd2', floor: '1', room: '107', at: m(9, 2) },
        ],
        connectingDoors: [{ key: 'cd1', floor: '1', at: m(7, 5), sides: [{ room: '105', at: m(6, 5) }, { room: '107', at: m(8, 5) }] }],
      })
    );
    expect(nodes.filter((n) => n.room)).toHaveLength(2);
    const ids = new Set(nodes.filter((n) => n.room).map((n) => n.id));
    const door = nodeAt(nodes, m(7, 5))!;
    const links = edges.filter((e) => e.fromNodeId === door.id || e.toNodeId === door.id);
    expect(links.map((e) => (e.fromNodeId === door.id ? e.toNodeId : e.fromNodeId)).every((id) => ids.has(id))).toBe(true);
    expect(links).toHaveLength(2);
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

  it('leaves exit-only doors out of the graph without calling them a problem', () => {
    const { edges, problems } = build(
      building({
        hallways: [{ key: 'h1', floor: '1', points: [m(0, 0), m(20, 0)] }],
        entrances: [{ key: 'e1', floor: '1', at: m(-3, 0), exitOnly: true }],
      })
    );
    expect(problems).toEqual([]);
    expect(edges.some((e) => e.fromNodeId.startsWith('n') || e.toNodeId.startsWith('n'))).toBe(false);
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

describe('parseIndoorEdits: outlines, objects and entrance flags', () => {
  const ring = [m(0, 0), m(10, 0), m(10, 10)];
  const parse = (b: Record<string, unknown>) =>
    parseIndoorEdits(JSON.parse(JSON.stringify({ version: 1, buildings: { ERB: b } })));
  const base = { floors: ['1', '2'] };

  it('keeps room and floor outlines, objects and entrance flags', () => {
    const parsed = parse({
      ...base,
      doors: [{ key: 'd1', floor: '1', room: '105', at: m(5, 2), outline: ring }],
      objects: [
        { key: 'o1', floor: '2', kind: 'vending', at: m(1, 1) },
        { key: 'o2', floor: '1', kind: 'other', name: 'Piano', at: m(2, 2) },
      ],
      floorOutlines: { '2': ring },
      entrances: [{ key: 'e1', floor: '1', at: m(0, -1), accessible: true, exitOnly: false }],
    }).buildings.ERB;
    expect(parsed.doors[0].outline).toHaveLength(3);
    expect(parsed.objects.map((o) => o.kind)).toEqual(['vending', 'other']);
    expect(parsed.floorOutlines['2']).toHaveLength(3);
    expect(parsed.entrances[0].accessible).toBe(true);
  });

  it('takes a floor outline as the map outline, and only one that exists', () => {
    expect(parse({ ...base, floorOutlines: { '1': ring }, mapOutline: '1' }).buildings.ERB.mapOutline).toBe('1');
    expect(() => parse({ ...base, floorOutlines: { '1': ring }, mapOutline: '2' })).toThrow(/map outline.*floor 2/);
    expect(() => parse({ ...base, floorOutlines: { '1': ring }, mapOutline: '9' })).toThrow(/map outline.*floor 9/);
  });

  it('finds a map outline by abbreviation, then by POI id', () => {
    const edits = JSON.parse(
      JSON.stringify({
        version: 1,
        buildings: {
          ERB: { ...base, floorOutlines: { '1': ring }, mapOutline: '1' },
          'academic-other': { ...base, floorOutlines: { '2': ring } },
        },
      })
    );
    const parsed = parseIndoorEdits(edits);
    expect(mapOutlineFor(parsed, [undefined, 'ERB'])).toHaveLength(3);
    expect(mapOutlineFor(parsed, ['NH', 'academic-other'])).toBeNull(); // has an outline, not marked for the map
    expect(mapOutlineFor(parsed, ['NH'])).toBeNull();
  });

  it('gives a building with only entrances a ground floor', () => {
    const parsed = parse({ entrances: [{ key: 'e1', floor: '1', at: m(0, 0) }] }).buildings.ERB;
    expect(parsed.floors).toEqual(['1']);
    expect(parsed.objects).toEqual([]);
  });

  it('rejects an object kind it does not know', () => {
    expect(() => parse({ ...base, objects: [{ key: 'o1', floor: '1', kind: 'jacuzzi', at: m(0, 0) }] })).toThrow(/jacuzzi/);
  });

  it('rejects an "other" object with no name', () => {
    expect(() => parse({ ...base, objects: [{ key: 'o1', floor: '1', kind: 'other', at: m(0, 0) }] })).toThrow(/name/);
  });

  it('rejects an outline with fewer than three points', () => {
    expect(() =>
      parse({ ...base, doors: [{ key: 'd1', floor: '1', room: '1', at: m(0, 0), outline: ring.slice(0, 2) }] })
    ).toThrow(/outline/);
    expect(() => parse({ ...base, floorOutlines: { '1': ring.slice(0, 2) } })).toThrow(/outline/);
  });

  it('rejects a floor outline for a floor the building does not list', () => {
    expect(() => parse({ ...base, floorOutlines: { '7': ring } })).toThrow(/"7"/);
  });

  it('leaves exit-only entrances out of the list to join', () => {
    const edits = parse({
      ...base,
      entrances: [
        { key: 'e1', floor: '1', at: m(0, 0) },
        { key: 'e2', floor: '1', at: m(5, 0), exitOnly: true },
      ],
    });
    expect(listEntrances(edits).map((e) => e.key)).toEqual(['ERB/e1']);
  });
});

describe('room outlines and floor plans', () => {
  const parse = (b: Record<string, unknown>) =>
    parseIndoorEdits(JSON.parse(JSON.stringify({ version: 1, buildings: { NH: { floors: ['1', '2'], ...b } } })));
  const box = [m(0, 0), m(10, 0), m(10, 6), m(0, 6)];
  const room = (partial: Record<string, unknown> = {}) => ({ key: 'r1', floor: '1', room: '101', corners: box, ...partial });
  const near = (a: Coordinate, b: Coordinate) => distanceMeters(a, b) < 0.01;

  it('keeps rooms with their corners and curves', () => {
    const parsed = parse({ rooms: [room({ curves: { '1': m(14, 3) } })] }).buildings.NH;
    expect(parsed.rooms).toHaveLength(1);
    expect(parsed.rooms[0].curves).toEqual({ '1': m(14, 3) });
    expect(parse({}).buildings.NH.rooms).toEqual([]);
  });

  it('rejects a room with no number, too few corners, an unlisted floor or a curve on a missing edge', () => {
    expect(() => parse({ rooms: [room({ room: '' })] })).toThrow(/room number/);
    expect(() => parse({ rooms: [room({ corners: box.slice(0, 2) })] })).toThrow(/3 points/);
    expect(() => parse({ rooms: [room({ floor: '9' })] })).toThrow(/"9"/);
    expect(() => parse({ rooms: [room({ curves: { '4': m(0, 0) } })] })).toThrow(/edge 4/);
  });

  it('keeps straight edges as their corners and samples a curved edge as the quadratic through its control', () => {
    const straight = roomRing({ corners: box });
    expect(straight).toEqual(box);
    // Edge 1 (east wall) bulges east to a control 4 m out: its midpoint is 2 m out.
    const curved = roomRing({ corners: box, curves: { '1': m(14, 3) } });
    expect(curved.length).toBe(4 + 7);
    expect(curved.some((p) => near(p, m(12, 3)))).toBe(true);
    expect(near(curved[0], box[0]) && near(curved[1], box[1]) && near(curved[9], box[2])).toBe(true);
  });

  it('puts the label at the center of a box, and inside an L and a U', () => {
    expect(near(labelPoint(box), m(5, 3))).toBe(true);
    const inside = (ring: Coordinate[], p: Coordinate) => {
      const local = (q: Coordinate) => [q.lng - ring[0].lng, q.lat - ring[0].lat];
      const [x, y] = local(p);
      let isIn = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = local(ring[i]);
        const [xj, yj] = local(ring[j]);
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) isIn = !isIn;
      }
      return isIn;
    };
    const ell = [m(0, 0), m(20, 0), m(20, 3), m(3, 3), m(3, 20), m(0, 20)];
    const you = [m(0, 0), m(20, 0), m(20, 20), m(17, 20), m(17, 3), m(3, 3), m(3, 20), m(0, 20)];
    expect(inside(ell, labelPoint(ell))).toBe(true);
    expect(inside(you, labelPoint(you))).toBe(true);
  });

  it('lists each floor by POI id: outline, rooms, objects and entrances, in plain lat/lng', () => {
    const tagged = (p: Coordinate) => ({ ...p, image: { layout: 'L', u: 0, v: 0 } });
    const edits = parse({
      floorOutlines: { '1': box.map(tagged) },
      doors: [{ key: 'd1', floor: '1', room: '101', at: m(5, 0) }],
      rooms: [room({ corners: box.map(tagged) })],
      objects: [{ key: 'o1', floor: '2', kind: 'restroom-men', at: tagged(m(1, 1)) }],
      entrances: [{ key: 'e1', floor: '1', at: m(0, 3), accessible: true }],
    });
    const { plans, problems } = floorPlansByPoi(edits, new Map([['NH', 'academic-nh']]));
    expect(problems).toEqual([]);
    expect(Object.keys(plans['academic-nh'])).toEqual(['1', '2']);
    const first = plans['academic-nh']['1'];
    expect(first.outline).toEqual(box);
    expect(first.rooms).toEqual([{ room: '101', ring: box, label: expect.anything() }]);
    expect(first.entrances).toEqual([{ at: m(0, 3), accessible: true }]);
    expect(plans['academic-nh']['2']).toEqual({ rooms: [], solids: [], objects: [{ kind: 'restroom-men', at: m(1, 1) }], entrances: [] });
    expect(floorPlansByPoi(edits, new Map()).plans).toEqual({});
  });

  it('keeps typed rooms (restrooms, stairwells, elevators) with or without a number, and lists their use', () => {
    const edits = parse({ rooms: [room({ room: undefined, use: 'restroom-women' }), room({ key: 'r2', use: 'stairs', room: 'S1' })] });
    expect(edits.buildings.NH.rooms.map((r) => r.use)).toEqual(['restroom-women', 'stairs']);
    const { plans, problems } = floorPlansByPoi(edits, new Map([['NH', 'academic-nh']]));
    // A typed room with a number still wants its door; one with no number does not.
    expect(problems).toEqual([expect.stringContaining('room S1')]);
    expect(plans['academic-nh']['1'].rooms.map((r) => [r.room, r.use])).toEqual([
      [undefined, 'restroom-women'],
      ['S1', 'stairs'],
    ]);
    expect(Object.keys(plans['academic-nh']['1'].rooms[0])).not.toContain('room');
    expect(() => parse({ rooms: [room({ use: 'closet' })] })).toThrow(/closet/);
    expect(() => parse({ rooms: [room({ room: undefined })] })).toThrow(/room number/);
  });

  it('keeps solid blocks (no number, curves allowed) and lists them per floor as rings', () => {
    const edits = parse({ solids: [{ key: 's1', floor: '2', corners: box, curves: { '0': m(5, -2) } }] });
    expect(edits.buildings.NH.solids).toHaveLength(1);
    const { plans, problems } = floorPlansByPoi(edits, new Map([['NH', 'academic-nh']]));
    expect(problems).toEqual([]);
    expect(plans['academic-nh']['2'].solids).toHaveLength(1);
    expect(plans['academic-nh']['2'].solids[0]).toHaveLength(4 + 7);
    expect(() => parse({ solids: [{ key: 's1', floor: '2', corners: box.slice(0, 2) }] })).toThrow(/3 points/);
    expect(() => parse({ solids: [{ key: 's1', floor: '2', corners: box, curves: { '9': m(0, 0) } }] })).toThrow(/edge 9/);
  });

  it('reports a room outline with no door of that room on its floor', () => {
    const edits = parse({
      doors: [{ key: 'd1', floor: '2', room: '101', at: m(5, 0) }],
      connectingDoors: [
        { key: 'c1', floor: '1', at: m(5, 6), sides: [{ room: '102', at: m(5, 5) }, { room: '102A', at: m(5, 7) }] },
      ],
      rooms: [room(), room({ key: 'r2', room: '102A' })],
    });
    const { problems } = floorPlansByPoi(edits, new Map([['NH', 'academic-nh']]));
    expect(problems).toEqual(['NH room 101 (r1), floor 1: no door of this room on the floor.']);
  });
});

describe('walkable areas', () => {
  const square = [m(0, 0), m(20, 0), m(20, 20), m(0, 20)];
  // An L: the corner at (10, 10) juts in, so (20, 5) cannot see (5, 20).
  const ell = [m(0, 0), m(20, 0), m(20, 10), m(10, 10), m(10, 20), m(0, 20)];
  const edgeBetween = (edges: MapEdge[], a: string, b: string) =>
    edges.find((e) => (e.fromNodeId === a && e.toNodeId === b) || (e.fromNodeId === b && e.toNodeId === a));
  const touching = (edges: MapEdge[], id: string) => edges.filter((e) => e.fromNodeId === id || e.toNodeId === id);

  describe('parsing', () => {
    const parse = (areas: unknown) =>
      parseIndoorEdits(JSON.parse(JSON.stringify({ version: 1, buildings: { ERB: { floors: ['1'], areas } } })));

    it('keeps open and room areas', () => {
      const parsed = parse([
        { key: 'a1', floor: '1', kind: 'open', points: square },
        { key: 'a2', floor: '1', kind: 'room', room: '100', points: square },
      ]).buildings.ERB;
      expect(parsed.areas.map((a) => [a.kind, a.room])).toEqual([
        ['open', undefined],
        ['room', '100'],
      ]);
    });

    it('reads a file from before areas existed', () => {
      expect(parse(undefined).buildings.ERB.areas).toEqual([]);
    });

    it('rejects a room area with no room, an unknown kind, or too few points', () => {
      expect(() => parse([{ key: 'a1', floor: '1', kind: 'room', points: square }])).toThrow(/ERB area "a1".*room number/);
      expect(() => parse([{ key: 'a1', floor: '1', kind: 'lawn', points: square }])).toThrow(/ERB area "a1".*kind "lawn"/);
      expect(() => parse([{ key: 'a1', floor: '1', kind: 'open', points: square.slice(0, 2) }])).toThrow(/at least 3 points/);
    });
  });

  describe('open areas', () => {
    it('joins two doors on a commons straight across, with no hallway', () => {
      const { nodes, edges, problems } = build(
        building({
          areas: [{ key: 'a1', floor: '1', kind: 'open', points: square }],
          doors: [
            { key: 'd1', floor: '1', room: '101', at: m(0, 10) },
            { key: 'd2', floor: '1', room: '102', at: m(20, 10) },
          ],
        })
      );
      expect(problems).toEqual([]);
      const a = nodes.find((n) => n.room === '101')!;
      const b = nodes.find((n) => n.room === '102')!;
      const across = edgeBetween(edges, a.id, b.id)!;
      expect(across.distanceMeters).toBeCloseTo(20, 1);
      expect(across.costMeters).toBeUndefined();
      // Marked so a map can leave the area's mesh out of the hallway lines.
      expect(across.area).toBe(true);
      expect(edges.filter((edge) => !edge.area).every((edge) => !edgeBetween([edge], a.id, b.id))).toBe(true);
    });

    it('goes round the inside corner of an L instead of through the wall', () => {
      const { nodes, edges } = build(
        building({
          areas: [{ key: 'a1', floor: '1', kind: 'open', points: ell }],
          doors: [
            { key: 'd1', floor: '1', room: '101', at: m(20, 5) },
            { key: 'd2', floor: '1', room: '102', at: m(5, 20) },
          ],
        })
      );
      const a = nodes.find((n) => n.room === '101')!;
      const b = nodes.find((n) => n.room === '102')!;
      expect(edgeBetween(edges, a.id, b.id)).toBeUndefined();
      const corner = nodes.find((n) => distanceMeters(n.coordinate, m(10, 10)) < 0.5)!;
      expect(corner).toBeDefined();
      expect(edgeBetween(edges, a.id, corner.id)).toBeDefined();
      expect(edgeBetween(edges, corner.id, b.id)).toBeDefined();
    });

    it('finds the inside corner whichever way round the outline was drawn', () => {
      const { nodes } = build(
        building({
          areas: [{ key: 'a1', floor: '1', kind: 'open', points: [...ell].reverse() }],
          doors: [
            { key: 'd1', floor: '1', room: '101', at: m(20, 5) },
            { key: 'd2', floor: '1', room: '102', at: m(5, 20) },
          ],
        })
      );
      expect(nodes.find((n) => distanceMeters(n.coordinate, m(10, 10)) < 0.5)).toBeDefined();
    });

    it('joins a hallway that ends at the area', () => {
      const { nodes, edges } = build(
        building({
          hallways: [{ key: 'h1', floor: '1', points: [m(-20, 10), m(-1, 10)] }],
          areas: [{ key: 'a1', floor: '1', kind: 'open', points: square }],
          doors: [{ key: 'd1', floor: '1', room: '102', at: m(20, 10) }],
        })
      );
      const far = nodeAt(nodes, m(-20, 10))!;
      expect(reachable(edges, far.id).has(nodes.find((n) => n.room === '102')!.id)).toBe(true);
    });

    it('reports an area nothing touches', () => {
      const { problems } = build(building({ areas: [{ key: 'a1', floor: '1', kind: 'open', points: square }] }));
      expect(problems).toEqual([expect.stringMatching(/ERB area a1, floor 1: joins nothing/)]);
    });
  });

  describe('room areas', () => {
    // Room 100 north of a hallway along y = -3, with two doors on its south wall.
    const room = [m(0, 0), m(30, 0), m(30, 20), m(0, 20)];
    const lectureHall = (extra: Partial<IndoorBuilding> = {}) =>
      building({
        hallways: [{ key: 'h1', floor: '1', points: [m(-5, -3), m(35, -3)] }],
        areas: [{ key: 'a1', floor: '1', kind: 'room', room: '100', points: room }],
        doors: [
          { key: 'd1', floor: '1', room: '100', at: m(5, 0) },
          { key: 'd2', floor: '1', room: '100', at: m(25, 0) },
        ],
        ...extra,
      });

    it('joins every door of the room through it, at a higher cost than its length', () => {
      const { nodes, edges } = build(lectureHall());
      const [a, b] = nodes.filter((n) => n.room === '100');
      const through = edgeBetween(edges, a.id, b.id)!;
      expect(through.distanceMeters).toBeCloseTo(20, 1);
      expect(through.costMeters).toBeCloseTo(20 * ROOM_COST_FACTOR, 1);
      // Each door keeps its hallway too.
      expect(touching(edges, a.id).some((e) => e.costMeters === undefined)).toBe(true);
    });

    it('joins a stair inside the room to the room, not to the hallway through the wall', () => {
      const { nodes, edges } = build(
        lectureHall({ connectors: [{ key: 'c1', kind: 'stairs', name: 'Stage stair', floors: ['1', '2'], at: m(15, 5) }] })
      );
      const stair = nodes.find((n) => n.connector === 'stairs' && n.level === '1')!;
      const sameFloor = touching(edges, stair.id).filter((e) => {
        const other = e.fromNodeId === stair.id ? e.toNodeId : e.fromNodeId;
        return nodes.find((n) => n.id === other)!.level === '1';
      });
      expect(sameFloor.length).toBeGreaterThan(0);
      expect(sameFloor.every((e) => e.costMeters !== undefined)).toBe(true);
      expect(stair.inside).toBe('100');
    });

    it("never joins another room's door", () => {
      const { nodes, edges } = build(
        lectureHall({
          doors: [
            { key: 'd1', floor: '1', room: '100', at: m(5, 0) },
            { key: 'd3', floor: '1', room: '101', at: m(29, 0) },
          ],
        })
      );
      const other = nodes.find((n) => n.room === '101')!;
      expect(touching(edges, other.id)).toHaveLength(1);
    });

    it('marks the nodes inside it with the room', () => {
      const { nodes } = build(
        building({
          hallways: [{ key: 'h1', floor: '1', points: [m(-5, -3), m(25, -3)] }],
          areas: [{ key: 'a1', floor: '1', kind: 'room', room: '100', points: ell }],
          doors: [{ key: 'd1', floor: '1', room: '100', at: m(15, 0) }],
        })
      );
      expect(nodes.find((n) => distanceMeters(n.coordinate, m(10, 10)) < 0.5)?.inside).toBe('100');
    });

    it('reports a room area no door of that room touches', () => {
      const { problems } = build(lectureHall({ doors: [] }));
      expect(problems).toEqual([expect.stringMatching(/ERB area a1 \(room 100\), floor 1: no door of room 100 touches it/)]);
    });
  });
});
