import type { Coordinate } from '@/types/map';

/**
 * Real-world measurement on lat/lng. Everything that needs a *distance* must come through
 * here, never through the SVG viewBox units `projection.ts` produces -- those are arbitrary
 * drawing units, and a length measured in them is not proportional to meters.
 *
 * The model is equirectangular: flatten the local area by scaling longitude by
 * cos(latitude), then measure straight-line. Across a campus (under 2 km) it agrees with
 * haversine to well under a meter, and it is cheap enough to call inside Dijkstra's inner
 * loop.
 */

/** Mean Earth radius (IUGG), in meters. */
export const EARTH_RADIUS_METERS = 6_371_008.8;

const DEG_TO_RAD = Math.PI / 180;

/** How far one degree of latitude is, in meters. Constant everywhere on the sphere. */
export function metersPerDegreeLatitude(): number {
  return EARTH_RADIUS_METERS * DEG_TO_RAD;
}

/**
 * How far one degree of longitude is at the given latitude, in meters. Shrinks toward the
 * poles -- at UTA (~32.73 N) it is about 93.5 km against latitude's 111.2 km, which is why
 * the map needs the cos(latitude) factor to avoid looking stretched.
 */
export function metersPerDegreeLongitude(latitude: number): number {
  return metersPerDegreeLatitude() * Math.cos(latitude * DEG_TO_RAD);
}

/** `to` relative to `from` in meters, x east-positive and y north-positive. */
function offsetMeters(from: Coordinate, to: Coordinate) {
  const meanLatitude = (from.lat + to.lat) / 2;
  return {
    x: (to.lng - from.lng) * metersPerDegreeLongitude(meanLatitude),
    y: (to.lat - from.lat) * metersPerDegreeLatitude(),
  };
}

/** Straight-line ground distance between two coordinates, in meters. */
export function distanceMeters(from: Coordinate, to: Coordinate): number {
  const { x, y } = offsetMeters(from, to);
  return Math.hypot(x, y);
}

/** Total length of a path, in meters. Zero for a path of fewer than two points. */
export function pathLengthMeters(path: Coordinate[]): number {
  let total = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    total += distanceMeters(path[i], path[i + 1]);
  }
  return total;
}

/** Compass bearing from one coordinate to another: 0 is north, 90 east, 180 south. */
export function bearingDegrees(from: Coordinate, to: Coordinate): number {
  const { x, y } = offsetMeters(from, to);
  const degrees = Math.atan2(x, y) / DEG_TO_RAD;
  return (degrees + 360) % 360;
}
