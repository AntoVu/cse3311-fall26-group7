import { campusGraph } from '@/routing/campus-graph';
import { findRoute } from '@/routing/route';

/**
 * Routing over the real imported campus graph. These are the numbers a person can check by
 * walking it, which is the point: a projection or unit slip shows up here as an ETA nobody
 * would believe, even while the unit tests still pass.
 */
const NEDDERMAN = { lat: 32.7324766, lng: -97.1138654 };
const LIBRARY = { lat: 32.7296865, lng: -97.1129155 };
const COLLEGE_PARK_CENTER = { lat: 32.7303783, lng: -97.108075 };
const MAVERICK_GARAGE = { lat: 32.7294276, lng: -97.1116355 };

describe('routing across the real campus', () => {
  it('walks Nedderman Hall to the library in a few minutes', () => {
    const route = findRoute(campusGraph, NEDDERMAN, LIBRARY)!;
    expect(route).not.toBeNull();
    // 323 m as the crow flies; sidewalks make it longer, but not double.
    expect(route.totalDistanceMeters).toBeGreaterThan(323);
    expect(route.totalDistanceMeters).toBeLessThan(650);
    expect(route.etaMinutes).toBeGreaterThan(3);
    expect(route.etaMinutes).toBeLessThan(9);
  });

  it('never returns a route shorter than the straight line', () => {
    const route = findRoute(campusGraph, MAVERICK_GARAGE, COLLEGE_PARK_CENTER)!;
    // Straight-line distance is about 330 m.
    expect(route.totalDistanceMeters).toBeGreaterThan(330);
  });

  it('draws a path that starts and ends where it was asked to', () => {
    const route = findRoute(campusGraph, NEDDERMAN, COLLEGE_PARK_CENTER)!;
    expect(route.path[0]).toEqual(NEDDERMAN);
    expect(route.path[route.path.length - 1]).toEqual(COLLEGE_PARK_CENTER);
    expect(route.path.length).toBeGreaterThan(5);
  });

  it('routes between any two corners of campus, since the graph is connected', () => {
    const corners = [NEDDERMAN, LIBRARY, COLLEGE_PARK_CENTER, MAVERICK_GARAGE];
    for (const from of corners) {
      for (const to of corners) {
        expect(findRoute(campusGraph, from, to)).not.toBeNull();
      }
    }
  });

  it('answers fast enough to run on every render', () => {
    const started = Date.now();
    for (let i = 0; i < 20; i++) findRoute(campusGraph, NEDDERMAN, COLLEGE_PARK_CENTER);
    expect(Date.now() - started).toBeLessThan(4000);
  });
});
