import { bearingDegrees, distanceMeters, metersPerDegreeLatitude } from '@/routing/geo';
import type { Coordinate } from '@/types/map';

// Real campus coordinates (OpenStreetMap), so the expected distances below are
// checkable against the actual walk.
const NEDDERMAN: Coordinate = { lat: 32.7324766, lng: -97.1138654 };
const LIBRARY: Coordinate = { lat: 32.7296865, lng: -97.1129155 };
const COLLEGE_PARK_CENTER: Coordinate = { lat: 32.7303783, lng: -97.108075 };

describe('distanceMeters', () => {
  it('is zero between a point and itself', () => {
    expect(distanceMeters(NEDDERMAN, NEDDERMAN)).toBe(0);
  });

  it('makes one degree of latitude about 111.2 km', () => {
    const north = { lat: NEDDERMAN.lat + 1, lng: NEDDERMAN.lng };
    expect(distanceMeters(NEDDERMAN, north)).toBeCloseTo(metersPerDegreeLatitude(), 0);
    expect(metersPerDegreeLatitude()).toBeGreaterThan(111_000);
    expect(metersPerDegreeLatitude()).toBeLessThan(111_400);
  });

  it('makes a degree of longitude shorter than a degree of latitude this far north', () => {
    const north = { lat: NEDDERMAN.lat + 1, lng: NEDDERMAN.lng };
    const east = { lat: NEDDERMAN.lat, lng: NEDDERMAN.lng + 1 };
    const eastMeters = distanceMeters(NEDDERMAN, east);
    // cos(32.73 degrees) is about 0.841, so roughly 93.6 km.
    expect(eastMeters).toBeGreaterThan(93_000);
    expect(eastMeters).toBeLessThan(94_200);
    expect(eastMeters).toBeLessThan(distanceMeters(NEDDERMAN, north));
  });

  it('measures Nedderman Hall to the library at about 323 m (a 0.2 mile walk)', () => {
    expect(distanceMeters(NEDDERMAN, LIBRARY)).toBeCloseTo(323, -1);
  });

  it('measures Nedderman Hall to College Park Center at about 590 m', () => {
    expect(distanceMeters(NEDDERMAN, COLLEGE_PARK_CENTER)).toBeCloseTo(590, -1);
  });

  it('gives the same distance in either direction', () => {
    expect(distanceMeters(NEDDERMAN, LIBRARY)).toBeCloseTo(distanceMeters(LIBRARY, NEDDERMAN), 9);
  });
});

describe('bearingDegrees', () => {
  const origin: Coordinate = { lat: 32.73, lng: -97.11 };

  it('reads 0 for due north, 90 for east, 180 for south, 270 for west', () => {
    expect(bearingDegrees(origin, { lat: 32.74, lng: -97.11 })).toBeCloseTo(0, 5);
    expect(bearingDegrees(origin, { lat: 32.73, lng: -97.1 })).toBeCloseTo(90, 5);
    expect(bearingDegrees(origin, { lat: 32.72, lng: -97.11 })).toBeCloseTo(180, 5);
    expect(bearingDegrees(origin, { lat: 32.73, lng: -97.12 })).toBeCloseTo(270, 5);
  });

  it('always answers between 0 and 360', () => {
    for (const target of [LIBRARY, NEDDERMAN, COLLEGE_PARK_CENTER]) {
      const bearing = bearingDegrees(origin, target);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    }
  });

  it('points south-south-east from Nedderman Hall to the library', () => {
    expect(bearingDegrees(NEDDERMAN, LIBRARY)).toBeCloseTo(164, 0);
  });
});
