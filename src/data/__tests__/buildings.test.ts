import { BUILDING_ALIASES } from '@/data/building-aliases';
import {
  buildingLabel,
  buildingMatch,
  buildingName,
  classBuildingOptions,
  findBuilding,
  parseRoomQuery,
  searchBuildings,
} from '@/data/buildings';
import { CAMPUS_POIS } from '@/data/campus-pois';

describe('findBuilding', () => {
  it('finds a building by its id', () => {
    expect(findBuilding('academic-nedderman-hall')?.name).toBe('Nedderman Hall');
  });

  it('finds nothing for an id that is not on the map', () => {
    expect(findBuilding('academic-hogwarts')).toBeUndefined();
  });
});

describe('buildingLabel', () => {
  it('prefers the abbreviation students actually see', () => {
    expect(buildingLabel('academic-nedderman-hall')).toBe('NH');
  });

  it('falls back to the full name where there is no abbreviation yet', () => {
    const noAbbreviation = CAMPUS_POIS.find(
      (poi) => poi.category === 'academic' && !poi.abbreviation
    )!;
    expect(buildingLabel(noAbbreviation.id)).toBe(noAbbreviation.name);
  });

  // A class saved before a re-import dropped its building must not blank out the card.
  it('says so plainly when the building has gone', () => {
    expect(buildingLabel('academic-hogwarts')).toBe('Unknown building');
    expect(buildingName('academic-hogwarts')).toBe('Unknown building');
  });
});

describe('classBuildingOptions', () => {
  const options = classBuildingOptions();
  const RANK = ['academic', 'administration', 'misc', 'outdoor', 'greek', 'residence', 'apartment'];

  it('offers every building on the map, since a class can meet anywhere', () => {
    expect(options).toHaveLength(CAMPUS_POIS.length);
    expect(options.map((option) => option.name)).toContain('Nedderman Hall');
  });

  // Classrooms first, then administration, then everything else, so the likely answer is at
  // the top of a list that now holds every building.
  it('lists academic, then administration, then misc, then homes, each by name', () => {
    const ranks = options.map((option) => RANK.indexOf(option.category));
    expect(ranks.every((rank) => rank >= 0)).toBe(true);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    for (const category of RANK) {
      // localeCompare, not the default code-unit sort: it is what puts "Chemistry & Physics"
      // where a reader expects it rather than ahead of every letter.
      const names = options.filter((option) => option.category === category).map((option) => option.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
  });

  it('says what kind of building a non-academic choice is', () => {
    const academic = options.find((option) => option.category === 'academic' && option.abbreviation)!;
    expect(academic.description).toBe(academic.abbreviation);
    const home = options.find((option) => option.category === 'residence')!;
    expect(home.description).toContain('Residence hall');
  });

  it('gives every option an id that resolves back to a building', () => {
    for (const option of options) {
      expect(findBuilding(option.id)?.name).toBe(option.name);
    }
  });
});

describe('building aliases', () => {
  it('names only buildings on the map, so a rename fails here', () => {
    expect(Object.keys(BUILDING_ALIASES).filter((id) => !findBuilding(id))).toEqual([]);
  });

  it("gives no code that is already another building's", () => {
    const owner = new Map(CAMPUS_POIS.filter((poi) => poi.abbreviation).map((poi) => [poi.abbreviation!.toUpperCase(), poi.id]));
    for (const [id, { codes = [] }] of Object.entries(BUILDING_ALIASES)) {
      for (const code of codes) {
        expect([undefined, id]).toContain(owner.get(code.toUpperCase()));
        owner.set(code.toUpperCase(), id);
      }
    }
  });
});

describe('buildingMatch / searchBuildings', () => {
  const cpb = findBuilding('academic-chemistry-physics-building')!;

  it('scores exact, prefix and contained matches', () => {
    expect(buildingMatch(cpb, 'planetarium')).toBe(3);
    expect(buildingMatch(cpb, 'CPB')).toBe(3);
    expect(buildingMatch(cpb, 'chem')).toBe(2);
    expect(buildingMatch(cpb, 'physics')).toBe(1);
    expect(buildingMatch(cpb, 'nedderman')).toBe(0);
    expect(buildingMatch(cpb, '  ')).toBe(0);
  });

  it('finds a building by a name people use or another code', () => {
    expect(searchBuildings('Planetarium')[0].id).toBe('academic-chemistry-physics-building');
    expect(searchBuildings('carh')[0].id).toBe('academic-carlisle-hall');
    expect(searchBuildings('nh')[0].id).toBe('academic-nedderman-hall');
  });

  it('puts an exact match before buildings that only contain the text', () => {
    expect(searchBuildings('library')[0].id).toBe('academic-central-library');
  });
});

describe('parseRoomQuery', () => {
  it('reads a building and a room, with or without a space', () => {
    expect(parseRoomQuery('NH 340')).toMatchObject({ building: { id: 'academic-nedderman-hall' }, room: '340' });
    expect(parseRoomQuery('erb228')).toMatchObject({ building: { id: 'academic-engineering-research-building' }, room: '228' });
    expect(parseRoomQuery('Nedderman Hall 100a')).toMatchObject({ room: '100A' });
  });

  it('needs a building it knows exactly and a room', () => {
    expect(parseRoomQuery('NH')).toBeNull();
    expect(parseRoomQuery('Nedder 340')).toBeNull();
  });
});
