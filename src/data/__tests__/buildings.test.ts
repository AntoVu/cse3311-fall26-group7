import {
  buildingLabel,
  buildingName,
  classBuildingOptions,
  findBuilding,
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
  const RANK = ['academic', 'administration', 'misc', 'greek', 'residence', 'apartment'];

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
