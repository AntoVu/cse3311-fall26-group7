import { campusGraph } from '@/routing/campus-graph';
import { routeDirections } from '@/routing/directions';
import { findRoute } from '@/routing/route';
import type { Coordinate } from '@/types/map';

// About 11.1 m per 0.0001 degree of latitude, 9.4 m per 0.0001 of longitude at campus.
const ORIGIN = { lat: 32.73, lng: -97.11 };
const at = (northMeters: number, eastMeters: number): Coordinate => ({
  lat: ORIGIN.lat + northMeters / 111_195,
  lng: ORIGIN.lng + eastMeters / 93_550,
});

describe('routeDirections', () => {
  it('gives an L-shaped walk as head, turn, arrive', () => {
    const steps = routeDirections([at(0, 0), at(100, 0), at(100, 50)], 'Nedderman Hall');
    expect(steps.map((step) => step.text)).toEqual([
      'Head north',
      'Turn right',
      'Arrive at Nedderman Hall',
    ]);
    expect(steps[0].distanceMeters).toBeCloseTo(100, 0);
    expect(steps[1].distanceMeters).toBeCloseTo(50, 0);
    expect(steps[2].distanceMeters).toBe(0);
  });

  it('tells left from right and gentle bends from turns', () => {
    const left = routeDirections([at(0, 0), at(100, 0), at(100, -50)]);
    expect(left[1].text).toBe('Turn left');
    // 45 degrees off straight ahead.
    const slight = routeDirections([at(0, 0), at(100, 0), at(150, 50)]);
    expect(slight[1].text).toBe('Turn slightly right');
  });

  it('ignores sidewalk jitter: a wobbly straight path is one step', () => {
    const wobbly = [at(0, 0), at(30, 1.5), at(60, -1), at(90, 2), at(120, 0)];
    const steps = routeDirections(wobbly);
    expect(steps.map((step) => step.text)).toEqual(['Head north', 'Arrive at your destination']);
    expect(steps[0].distanceMeters).toBeGreaterThan(119);
  });

  it('treats a short crosswalk jog as going straight on', () => {
    const steps = routeDirections([at(0, 0), at(100, 0), at(100, 12), at(200, 12)]);
    expect(steps.map((step) => step.text)).toEqual(['Head north', 'Arrive at your destination']);
    expect(steps[0].distanceMeters).toBeCloseTo(212, 0);
  });

  it('counts the whole path, so the steps add up to its length', () => {
    const steps = routeDirections([at(0, 0), at(0, 80), at(-60, 80), at(-60, 200)]);
    const total = steps.reduce((sum, step) => sum + step.distanceMeters, 0);
    expect(total).toBeCloseTo(80 + 60 + 120, 0);
    expect(steps[0].text).toBe('Head east');
  });

  it('has nothing to say about a path with no length', () => {
    expect(routeDirections([])).toEqual([]);
    expect(routeDirections([at(0, 0), at(0, 0)])).toEqual([]);
  });

  it('turns a real campus walk into a handful of steps', () => {
    const route = findRoute(
      campusGraph,
      { lat: 32.7324766, lng: -97.1138654 }, // Nedderman Hall
      { lat: 32.7296865, lng: -97.1129155 } // Central Library
    )!;
    const steps = routeDirections(route.path, 'Central Library');
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps.length).toBeLessThanOrEqual(10);
    expect(steps[steps.length - 1].text).toBe('Arrive at Central Library');
  });
});
