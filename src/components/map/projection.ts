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
