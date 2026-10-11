import type { Coordinate } from '../../../src/types/map';
import {
  EMPTY_EDITS,
  groupBuildings,
  groupLots,
  parseEdits,
  resolveBuilding,
  resolveLot,
  stitchTracedWalkways,
  tracedFeatures,
  type MapEdits,
  type TracedFeature,
} from '../edits';
import { buildWalkwayGraph, largestComponent } from '../transform';

// About 11.1 m north-south and 9.3 m east-west per step at UTA's latitude.
const STEP = 0.0001;
const at = (north: number, east: number): Coordinate => ({
  lat: 32.73 + north * STEP,
  lng: -97.11 + east * STEP,
});

function edits(partial: Partial<MapEdits['osm']> = {}, traced: TracedFeature[] = []): MapEdits {
  return { version: 1, osm: { buildings: {}, lots: {}, ...partial }, traced };
}

const square = [at(0, 0), at(0, 1), at(1, 1), at(1, 0)];

describe('parseEdits', () => {
  it('accepts the empty file the repo starts with', () => {
    expect(parseEdits(JSON.parse(JSON.stringify(EMPTY_EDITS)))).toEqual(EMPTY_EDITS);
  });

  it('rejects a version it does not know, rather than guessing at the shape', () => {
    expect(() => parseEdits({ ...EMPTY_EDITS, version: 2 })).toThrow(/version 2/);
  });

  it('names the traced shape that is broken', () => {
    const bad = {
      ...EMPTY_EDITS,
      traced: [{ key: 'k1', kind: 'academic', name: 'Gilstrap Center', points: [at(0, 0), at(0, 1)] }],
    };
    expect(() => parseEdits(bad)).toThrow(/Gilstrap Center.*at least 3/);
  });

  it('rejects a kind the import cannot place', () => {
    const bad = { ...EMPTY_EDITS, traced: [{ key: 'k1', kind: 'pond', name: 'X', points: square }] };
    expect(() => parseEdits(bad)).toThrow(/kind "pond"/);
  });

  it('rejects a coordinate that is not a number', () => {
    const bad = {
      ...EMPTY_EDITS,
      traced: [{ key: 'k1', kind: 'street', name: 'Oak', points: [at(0, 0), { lat: '32.7', lng: -97.1 }] }],
    };
    expect(() => parseEdits(bad)).toThrow(/Oak/);
  });
});

describe('resolveBuilding', () => {
  const labels = { 'nedderman hall': { abbreviation: 'NH', buildingCode: '677' } };
  const excluded = ['uta police department'];

  it('leaves an unnamed OSM building out, as before', () => {
    expect(resolveBuilding({ wayId: 1, osmName: '' }, edits(), labels, excluded)).toEqual({ status: 'unnamed' });
  });

  it('brings an unnamed building in once the digitizer names it', () => {
    const result = resolveBuilding(
      { wayId: 1, osmName: '' },
      edits({ buildings: { 1: { name: 'Gilstrap Athletic Center', category: 'academic' } } }),
      labels,
      excluded
    );
    expect(result).toEqual({
      status: 'included',
      label: { name: 'Gilstrap Athletic Center', category: 'academic' },
    });
  });

  it('keeps map-labels.ts filling fields the edit leaves blank', () => {
    const result = resolveBuilding(
      { wayId: 7, osmName: 'Nedderman Hall' },
      edits({ buildings: { 7: { abbreviation: 'NED' } } }),
      labels,
      excluded
    );
    expect(result).toEqual({
      status: 'included',
      label: { name: 'Nedderman Hall', abbreviation: 'NED', buildingCode: '677' },
    });
  });

  it('hides a building when told to, even a named one', () => {
    const result = resolveBuilding(
      { wayId: 7, osmName: 'Nedderman Hall' },
      edits({ buildings: { 7: { hidden: true } } }),
      labels,
      excluded
    );
    expect(result).toEqual({ status: 'hidden' });
  });

  it('keeps the excluded-name list unless the digitizer overrides it', () => {
    const police = { wayId: 9, osmName: 'UTA Police Department' };
    expect(resolveBuilding(police, edits(), labels, excluded)).toEqual({ status: 'excluded' });
    expect(
      resolveBuilding(police, edits({ buildings: { 9: { name: 'University Police' } } }), labels, excluded).status
    ).toBe('included');
  });
});

describe('resolveLot', () => {
  const byName = { 'park north': { id: 'lot-park-north', label: 'Park North' } };
  const byWay = { 55: { id: 'lot-45', label: 'Lot 45' } };

  it('leaves an unclaimed lot off campus out', () => {
    expect(resolveLot({ wayId: 1, osmName: '', onCampus: false }, edits(), byWay, byName)).toEqual({
      status: 'skipped',
    });
  });

  it('keeps an unidentified campus lot, with no id the rules know', () => {
    expect(resolveLot({ wayId: 1, osmName: '', onCampus: true }, edits(), byWay, byName)).toEqual({
      status: 'included',
      label: '',
      claimed: false,
    });
  });

  it('pulls in an off-campus lot the digitizer identified, such as a remote park and ride', () => {
    const result = resolveLot(
      { wayId: 2, osmName: '', onCampus: false },
      edits({ lots: { 2: { id: 'lot-25', label: 'Lot 25' } } }),
      byWay,
      byName
    );
    expect(result).toEqual({ status: 'included', id: 'lot-25', label: 'Lot 25', claimed: true });
  });

  it('prefers the digitizer over map-labels.ts', () => {
    const result = resolveLot(
      { wayId: 55, osmName: '', onCampus: true },
      edits({ lots: { 55: { id: 'lot-46', label: 'Lot 46' } } }),
      byWay,
      byName
    );
    expect(result).toMatchObject({ id: 'lot-46', label: 'Lot 46' });
  });

  it('falls back to map-labels.ts by way, then by name', () => {
    expect(resolveLot({ wayId: 55, osmName: '', onCampus: true }, edits(), byWay, byName)).toMatchObject({
      id: 'lot-45',
    });
    expect(
      resolveLot({ wayId: 3, osmName: 'Park North', onCampus: true }, edits(), byWay, byName)
    ).toMatchObject({ id: 'lot-park-north', label: 'Park North' });
  });

  it('hides a lot when told to', () => {
    const result = resolveLot(
      { wayId: 55, osmName: '', onCampus: true },
      edits({ lots: { 55: { hidden: true } } }),
      byWay,
      byName
    );
    expect(result).toEqual({ status: 'hidden' });
  });
});

describe('tracedFeatures', () => {
  it('sorts traced shapes into the layers the app draws', () => {
    const result = tracedFeatures([
      { key: 'a', kind: 'residence', name: 'Kerby Hall', abbreviation: 'KH', points: square },
      { key: 'b', kind: 'lot', name: 'Lot 26', lotId: 'lot-26', points: square },
      { key: 'c', kind: 'lot', name: 'Stadium Overflow', points: square },
      { key: 'd', kind: 'street', name: 'Doug Russell Rd', points: [at(0, 0), at(0, 5)] },
      { key: 'e', kind: 'walkway', name: 'Stadium path', points: [at(0, 0), at(3, 0)] },
    ]);

    expect(result.pois).toEqual([
      expect.objectContaining({
        idBase: 'residence-kerby-hall',
        name: 'Kerby Hall',
        category: 'residence',
        abbreviation: 'KH',
        footprint: square,
      }),
    ]);
    expect(result.lots.map((lot) => [lot.idBase, lot.label])).toEqual([
      ['lot-26', 'Lot 26'],
      // Traced but not matched to a PATS lot yet: drawn, but no permit rule claims it.
      ['lot-traced-stadium-overflow', 'Stadium Overflow'],
    ]);
    expect(result.streets).toEqual([{ idBase: 'street-doug-russell-rd', name: 'Doug Russell Rd', path: [at(0, 0), at(0, 5)] }]);
    expect(result.walkways.map((w) => w.key)).toEqual(['e']);
  });

  it('gives each building a center to put its marker on', () => {
    const [poi] = tracedFeatures([{ key: 'a', kind: 'academic', name: 'X', points: square }]).pois;
    expect(poi.coordinate.lat).toBeCloseTo(32.73 + 0.5 * STEP, 9);
    expect(poi.coordinate.lng).toBeCloseTo(-97.11 + 0.5 * STEP, 9);
  });
});

describe('stitchTracedWalkways', () => {
  // An OSM sidewalk running east along the south edge: nodes 1-2-3.
  const osmWays = [{ id: 100, nodes: [1, 2, 3] }];
  const osmCoordinates = () =>
    new Map<number, Coordinate>([
      [1, at(0, 0)],
      [2, at(0, 5)],
      [3, at(0, 10)],
    ]);

  const walkway = (points: Coordinate[]): TracedFeature => ({ key: 'w', kind: 'walkway', name: 'Path', points });

  it('joins a traced path to the OSM node it starts on', () => {
    const coordinates = osmCoordinates();
    // Starts about 2 m from node 2 and heads north 44 m.
    const { ways } = stitchTracedWalkways([walkway([at(0.2, 5), at(4, 5)])], coordinates, 12);

    expect(ways).toHaveLength(1);
    expect(ways[0].nodes[0]).toBe(2);
    expect(ways[0].nodes[1]).toBeLessThan(0);

    const graph = largestComponent(buildWalkwayGraph([...osmWays, ...ways], coordinates)).graph;
    // One network: the traced spur hangs off node 2, and nothing is dropped as an island.
    expect(graph.nodes).toHaveLength(4);
  });

  it('leaves a path unjoined when nothing is within reach', () => {
    const coordinates = osmCoordinates();
    // Starts about 22 m north of the sidewalk.
    const { ways } = stitchTracedWalkways([walkway([at(2, 5), at(6, 5)])], coordinates, 12);

    expect(ways[0].nodes.every((id) => id < 0)).toBe(true);
    const trimmed = largestComponent(buildWalkwayGraph([...osmWays, ...ways], coordinates));
    expect(trimmed.droppedComponents).toBe(1);
  });

  it('adds the new points to the coordinate table the graph builder reads', () => {
    const coordinates = osmCoordinates();
    const { ways } = stitchTracedWalkways([walkway([at(0.2, 5), at(4, 5)])], coordinates, 12);
    expect(coordinates.get(ways[0].nodes[1])).toEqual(at(4, 5));
  });

  it('lets two traced paths share a point they both reach', () => {
    const coordinates = osmCoordinates();
    const { ways } = stitchTracedWalkways(
      [walkway([at(0, 10), at(4, 10)]), walkway([at(4.05, 10), at(4, 20)])],
      coordinates,
      12
    );
    expect(ways[1].nodes[0]).toBe(ways[0].nodes[1]);
  });
});

describe('stitchTracedWalkways, closely spaced points', () => {
  it('keeps every vertex of a path whose points are closer together than the snap distance', () => {
    const coordinates = new Map<number, Coordinate>([[1, at(0, 0)]]);
    // Three points about 5.5 m apart, well away from node 1.
    const points = [at(5, 0), at(5.5, 0), at(6, 0)];
    const { ways } = stitchTracedWalkways([{ key: 'w', kind: 'walkway', name: 'Path', points }], coordinates, 12);
    expect(new Set(ways[0].nodes).size).toBe(3);
  });
});

describe('shape overrides', () => {
  const reshaped = [at(0, 0), at(0, 2), at(2, 2), at(2, 0)];

  it('hands back the digitizer outline for a building, keeping its labels', () => {
    const result = resolveBuilding(
      { wayId: 7, osmName: 'Nedderman Hall' },
      edits({ buildings: { 7: { shape: reshaped } } }),
      { 'nedderman hall': { abbreviation: 'NH' } },
      []
    );
    expect(result).toEqual({
      status: 'included',
      label: { name: 'Nedderman Hall', abbreviation: 'NH' },
      shape: reshaped,
    });
  });

  it('hands back the digitizer outline for a lot, keeping its id', () => {
    const result = resolveLot(
      { wayId: 55, osmName: '', onCampus: true },
      edits({ lots: { 55: { shape: reshaped } } }),
      { 55: { id: 'lot-45', label: 'Lot 45' } },
      {}
    );
    expect(result).toEqual({ status: 'included', id: 'lot-45', label: 'Lot 45', claimed: true, shape: reshaped });
  });

  it('rejects an outline with too few points, naming the way', () => {
    const bad = { ...EMPTY_EDITS, osm: { buildings: { 42: { shape: [at(0, 0), at(0, 1)] } }, lots: {} } };
    expect(() => parseEdits(bad)).toThrow(/way 42.*at least 3/);
  });
});

describe('groupBuildings', () => {
  const half = (east: number) => [at(0, east), at(0, east + 1), at(1, east + 1), at(1, east)];

  it('makes one building out of two outlines with the same name', () => {
    const { groups, conflicts } = groupBuildings([
      { name: 'Aerodynamics Research Building', category: 'academic', abbreviation: 'ARB', footprint: half(0), source: 'way 1' },
      { name: 'aerodynamics research building ', category: 'academic', footprint: half(1), source: 'way 2' },
    ]);
    expect(conflicts).toEqual([]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      idBase: 'academic-aerodynamics-research-building',
      name: 'Aerodynamics Research Building',
      abbreviation: 'ARB',
      footprints: [half(0), half(1)],
    });
    // Two equal halves side by side: the marker sits on the seam between them.
    expect(groups[0].coordinate.lng).toBeCloseTo(-97.11 + 1 * STEP, 9);
  });

  it('takes each detail from the first outline that has it', () => {
    const { groups } = groupBuildings([
      { name: 'Kerby Hall', category: 'residence', footprint: half(0), source: 'way 1' },
      { name: 'Kerby Hall', category: 'residence', buildingCode: '702', footprint: half(1), source: 'traced "Kerby Hall"' },
    ]);
    expect(groups[0].buildingCode).toBe('702');
  });

  it('keeps differently named buildings apart', () => {
    const { groups } = groupBuildings([
      { name: 'Woolf Hall', category: 'academic', footprint: half(0), source: 'way 1' },
      { name: 'Science Hall', category: 'academic', footprint: half(1), source: 'way 2' },
    ]);
    expect(groups.map((g) => g.name)).toEqual(['Woolf Hall', 'Science Hall']);
  });

  it('reports parts of one building that disagree about its details', () => {
    const { conflicts } = groupBuildings([
      { name: 'Trimble Hall', category: 'academic', abbreviation: 'TH', footprint: half(0), source: 'way 1' },
      { name: 'Trimble Hall', category: 'academic', abbreviation: 'TRH', footprint: half(1), source: 'way 2' },
    ]);
    expect(conflicts).toEqual(['Trimble Hall: abbreviation "TH" (way 1) vs "TRH" (way 2)']);
  });
});

describe('groupLots', () => {
  const part = (east: number) => [at(0, east), at(0, east + 1), at(1, east + 1), at(1, east)];

  it('makes one lot out of every outline given the same lot id', () => {
    const { groups } = groupLots([
      { id: 'lot-49', label: 'Lot 49', footprint: part(0), fallbackId: 'lot-osm-1', source: 'way 1' },
      { id: 'lot-49', label: '', footprint: part(1), fallbackId: 'lot-osm-2', source: 'way 2' },
    ]);
    // One id means one permit rule for the whole lot, instead of lot-49 and lot-49-2.
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ idBase: 'lot-49', label: 'Lot 49', footprints: [part(0), part(1)] });
  });

  it('never merges lots nobody has identified', () => {
    const { groups } = groupLots([
      { label: '', footprint: part(0), fallbackId: 'lot-osm-1', source: 'way 1' },
      { label: '', footprint: part(1), fallbackId: 'lot-osm-2', source: 'way 2' },
    ]);
    expect(groups.map((g) => g.idBase)).toEqual(['lot-osm-1', 'lot-osm-2']);
  });

  it('reports outlines of one lot with different labels', () => {
    const { conflicts } = groupLots([
      { id: 'lot-50', label: 'Lot 50', footprint: part(0), fallbackId: 'lot-osm-1', source: 'way 1' },
      { id: 'lot-50', label: 'Lot 50N', footprint: part(1), fallbackId: 'lot-osm-2', source: 'way 2' },
    ]);
    expect(conflicts).toEqual(['lot-50: label "Lot 50" (way 1) vs "Lot 50N" (way 2)']);
  });
});

describe('administration, misc and greek buildings', () => {
  it('accepts traced shapes of the new kinds', () => {
    const file = {
      ...EMPTY_EDITS,
      traced: [
        { key: 'a', kind: 'administration', name: 'University Administration Building', points: square },
        { key: 'm', kind: 'misc', name: 'Thermal Energy Plant', points: square },
        { key: 'g', kind: 'greek', name: 'Sigma Chi', points: square },
      ],
    };
    expect(parseEdits(file).traced).toHaveLength(3);
  });

  it('makes them buildings with their own category', () => {
    const { pois } = tracedFeatures([
      { key: 'a', kind: 'administration', name: 'University Administration Building', points: square },
      { key: 'm', kind: 'misc', name: 'Thermal Energy Plant', points: square },
      { key: 'g', kind: 'greek', name: 'Sigma Chi', points: square },
    ]);
    expect(pois.map((poi) => [poi.idBase, poi.category])).toEqual([
      ['administration-university-administration-building', 'administration'],
      ['misc-thermal-energy-plant', 'misc'],
      ['greek-sigma-chi', 'greek'],
    ]);
  });
});
