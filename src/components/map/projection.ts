import { CAMPUS_BOUNDS, CAMPUS_VIEWBOX } from '@/constants/campus';
import type { Coordinate } from '@/types/map';

/** Projects a lat/lng into the campus map's flat SVG viewBox space. */
export function projectCoordinate(coordinate: Coordinate) {
  const { minLat, maxLat, minLng, maxLng } = CAMPUS_BOUNDS;
  const x = ((coordinate.lng - minLng) / (maxLng - minLng)) * CAMPUS_VIEWBOX.width;
  const y = ((maxLat - coordinate.lat) / (maxLat - minLat)) * CAMPUS_VIEWBOX.height;
  return { x, y };
}

export function projectPath(path: Coordinate[]) {
  return path.map(projectCoordinate);
}

/**
 * The inverse of `projectCoordinate`: an SVG viewBox point back to lat/lng.
 *
 * Used when the map has to answer "what is here?" rather than "where does this go?" -- today
 * that is long-pressing to drop a pin.
 */
export function unprojectPoint(point: { x: number; y: number }) {
  const { minLat, maxLat, minLng, maxLng } = CAMPUS_BOUNDS;
  return {
    lat: maxLat - (point.y / CAMPUS_VIEWBOX.height) * (maxLat - minLat),
    lng: minLng + (point.x / CAMPUS_VIEWBOX.width) * (maxLng - minLng),
  };
}
