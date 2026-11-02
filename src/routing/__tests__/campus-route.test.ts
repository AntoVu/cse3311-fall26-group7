import { CROWD_ZONES } from '@/constants/foot-traffic';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { campusGraph } from '@/routing/campus-graph';
import { activeCrowdZones, crowdCost, crowdedEdgeIds, zonesOnRoute } from '@/routing/foot-traffic';
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

describe('avoiding crowds on the real campus', () => {
  it('goes around the library at noon for a couple of extra minutes, not a tour of campus', () => {
    const busy = activeCrowdZones(CROWD_ZONES, new Date(2026, 9, 26, 12)); // a Monday
    const from = CAMPUS_POIS.find((poi) => poi.id === 'academic-life-science-building')!;
    const to = CAMPUS_POIS.find((poi) => poi.id === 'academic-science-hall')!;
    const ends = { fromPoiId: from.id, toPoiId: to.id };
    const direct = findRoute(campusGraph, from.coordinate, to.coordinate, ends)!;
    const around = findRoute(campusGraph, from.coordinate, to.coordinate, {
      ...ends,
      edgeCost: crowdCost(crowdedEdgeIds(campusGraph, busy)),
    })!;
    expect(zonesOnRoute(direct.edgeIds, busy, campusGraph).map((zone) => zone.id)).toEqual(['library-mall']);
    expect(zonesOnRoute(around.edgeIds, busy, campusGraph)).toEqual([]);
    expect(around.totalDistanceMeters).toBeLessThan(direct.totalDistanceMeters * 1.6);
  });
});
