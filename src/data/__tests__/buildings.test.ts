import {
  buildingLabel,
  buildingName,
  classroomBuildingOptions,
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

describe('classroomBuildingOptions', () => {
  const options = classroomBuildingOptions();

  it('offers the academic buildings', () => {
    expect(options.length).toBeGreaterThan(20);
    expect(options.map((option) => option.name)).toContain('Nedderman Hall');
  });

  it('leaves out places nobody holds class in', () => {
    const names = options.map((option) => option.name);
    for (const poi of CAMPUS_POIS) {
      if (poi.category === 'residence' || poi.category === 'apartment') {
        expect(names).not.toContain(poi.name);
      }
    }
  });

  it('sorts by name so the picker can be scanned', () => {
    // localeCompare, not the default code-unit sort: it is what puts "Chemistry & Physics"
    // where a reader expects it rather than ahead of every letter.
    const names = options.map((option) => option.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('gives every option an id that resolves back to a building', () => {
    for (const option of options) {
      expect(findBuilding(option.id)?.name).toBe(option.name);
    }
  });
});
