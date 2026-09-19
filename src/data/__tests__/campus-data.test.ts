import { CAMPUS_BOUNDS } from '@/constants/campus';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { CAMPUS_STREETS } from '@/data/campus-streets';
import type { Coordinate } from '@/types/map';

// Data-integrity checks for the hand-traced campus data. A bad export from the
// Campus Digitizer (duplicate id, collapsed polygon, coordinates outside the
// calibrated box) otherwise only shows up as a subtly broken map on a phone.

const { minLat, maxLat, minLng, maxLng } = CAMPUS_BOUNDS;

function isInsideBounds({ lat, lng }: Coordinate) {
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

function expectUnique(ids: string[]) {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('campus POIs', () => {
  it('has unique ids', () => {
    expectUnique(CAMPUS_POIS.map((poi) => poi.id));
  });

  it('has a non-empty name and a known category on every POI', () => {
    for (const poi of CAMPUS_POIS) {
      expect(poi.name.trim()).not.toBe('');
      expect(['academic', 'residence', 'apartment']).toContain(poi.category);
    }
  });

  it('places every POI coordinate inside the campus bounds', () => {
    for (const poi of CAMPUS_POIS) {
      expect({ id: poi.id, inside: isInsideBounds(poi.coordinate) }).toEqual({
        id: poi.id,
        inside: true,
      });
    }
  });

  it('gives every footprint at least 3 points, all inside the campus bounds', () => {
    for (const poi of CAMPUS_POIS) {
      if (!poi.footprint) continue;
      expect({ id: poi.id, enough: poi.footprint.length >= 3 }).toEqual({
        id: poi.id,
        enough: true,
      });
      expect({ id: poi.id, inside: poi.footprint.every(isInsideBounds) }).toEqual({
        id: poi.id,
        inside: true,
      });
    }
  });

  it('never gives two different buildings the same abbreviation', () => {
    // Vandergriff Hall is deliberately traced as two footprints under one name,
    // so compare (abbreviation, name) pairs rather than abbreviations alone.
    const byAbbreviation = new Map<string, Set<string>>();
    for (const poi of CAMPUS_POIS) {
      if (!poi.abbreviation) continue;
      const names = byAbbreviation.get(poi.abbreviation) ?? new Set<string>();
      names.add(poi.name);
      byAbbreviation.set(poi.abbreviation, names);
    }
    for (const [abbreviation, names] of byAbbreviation) {
      expect({ abbreviation, names: names.size }).toEqual({ abbreviation, names: 1 });
    }
  });
});

describe('campus lots', () => {
  it('has unique ids and a label on every lot', () => {
    expectUnique(CAMPUS_LOTS.map((lot) => lot.id));
    for (const lot of CAMPUS_LOTS) {
      expect(lot.label.trim()).not.toBe('');
    }
  });

  it('gives every footprint at least 3 points, all inside the campus bounds', () => {
    for (const lot of CAMPUS_LOTS) {
      expect({ id: lot.id, enough: lot.footprint.length >= 3 }).toEqual({
        id: lot.id,
        enough: true,
      });
      expect({ id: lot.id, inside: lot.footprint.every(isInsideBounds) }).toEqual({
        id: lot.id,
        inside: true,
      });
    }
  });
});

describe('campus streets', () => {
  it('has unique ids and at least 2 points per street', () => {
    expectUnique(CAMPUS_STREETS.map((street) => street.id));
    for (const street of CAMPUS_STREETS) {
      expect(street.path.length).toBeGreaterThanOrEqual(2);
    }
  });
});
