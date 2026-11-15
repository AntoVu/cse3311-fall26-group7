import { shortStreetName, streetLabels } from '@/components/map/street-labels';
import { CAMPUS_STREETS } from '@/data/campus-streets';
import type { CampusStreet } from '@/types/map';

describe('shortStreetName', () => {
  it('drops the direction and shortens the suffix', () => {
    expect(shortStreetName('South Cooper Street')).toBe('Cooper St');
    expect(shortStreetName('UTA Boulevard')).toBe('UTA Blvd');
    expect(shortStreetName('West Nedderman Drive')).toBe('Nedderman Dr');
  });

  it('keeps a direction that is the name itself', () => {
    expect(shortStreetName('South West Street')).toBe('West St');
  });
});

describe('streetLabels', () => {
  // About 1.1 km due east, then a short piece; and a minor street.
  const long: CampusStreet = { id: 'a', name: 'West Abram Street', major: true, path: [{ lat: 32.73, lng: -97.12 }, { lat: 32.73, lng: -97.108 }] };
  const short: CampusStreet = { id: 'b', name: 'East Abram Street', major: true, path: [{ lat: 32.73, lng: -97.107 }, { lat: 32.73, lng: -97.1069 }] };
  const minor: CampusStreet = { id: 'c', name: 'Shady Lane', path: long.path };

  it('labels major streets only, level along an east-west road', () => {
    const labels = streetLabels([long, short, minor]);
    expect(labels.map((l) => l.text)).toEqual(['Abram St']);
    expect(Math.abs(labels[0].angle)).toBeLessThan(1);
  });

  it('never draws a label upside down', () => {
    const westward = { ...long, path: [...long.path].reverse() };
    expect(Math.abs(streetLabels([westward])[0].angle)).toBeLessThan(1);
  });

  it('labels the real campus streets', () => {
    const texts = new Set(streetLabels(CAMPUS_STREETS).map((l) => l.text));
    for (const name of ['Cooper St', 'Abram St', 'UTA Blvd', 'Mitchell St', 'Nedderman Dr']) expect(texts).toContain(name);
  });
});
