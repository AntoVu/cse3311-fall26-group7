import { projectCoordinate } from '@/components/map/projection';
import { distanceMeters, pathLengthMeters } from '@/routing/geo';
import type { CampusStreet, Coordinate } from '@/types/map';

/** A street name to draw: at (x, y) in map units, rotated `angle` degrees and never upside down. */
export type StreetLabel = { key: string; text: string; x: number; y: number; angle: number };

const DIRECTIONS = new Set(['North', 'South', 'East', 'West']);
const SUFFIXES: Record<string, string> = { Street: 'St', Drive: 'Dr', Boulevard: 'Blvd', Road: 'Rd', Avenue: 'Ave', Lane: 'Ln' };

/** Too short for a label to fit along it. */
export const MIN_LABEL_PIECE_METERS = 80;
/** One street's labels repeat no closer than this, so a long road is labeled along its length. */
export const LABEL_SPACING_METERS = 300;

/** "South Cooper Street" -> "Cooper St", as street signs and maps write it. "South West Street" keeps "West". */
export function shortStreetName(name: string): string {
  const words = name.split(' ');
  if (words.length > 2 && DIRECTIONS.has(words[0])) words.shift();
  const last = words.length - 1;
  words[last] = SUFFIXES[words[last]] ?? words[last];
  return words.join(' ');
}

/** The point halfway along a path, and the stretch it's on. */
function halfway(path: Coordinate[], meters: number) {
  let left = meters / 2;
  for (let i = 0; i < path.length - 1; i++) {
    const length = distanceMeters(path[i], path[i + 1]);
    if (length >= left) {
      const t = length ? left / length : 0;
      const at = { lat: path[i].lat + (path[i + 1].lat - path[i].lat) * t, lng: path[i].lng + (path[i + 1].lng - path[i].lng) * t };
      return { at, from: path[i], to: path[i + 1] };
    }
    left -= length;
  }
  return { at: path[path.length - 1], from: path[path.length - 2], to: path[path.length - 1] };
}

/** Labels for the major streets: the longest pieces first, each name spaced out along its road. */
export function streetLabels(streets: CampusStreet[]): StreetLabel[] {
  const pieces = streets
    .filter((street) => street.major && street.path.length > 1)
    .map((street) => ({ street, text: shortStreetName(street.name), meters: pathLengthMeters(street.path) }))
    .filter((piece) => piece.meters >= MIN_LABEL_PIECE_METERS)
    .sort((a, b) => b.meters - a.meters);

  const placed: { text: string; at: Coordinate }[] = [];
  const labels: StreetLabel[] = [];
  for (const { street, text, meters } of pieces) {
    const { at, from, to } = halfway(street.path, meters);
    if (placed.some((p) => p.text === text && distanceMeters(p.at, at) < LABEL_SPACING_METERS)) continue;
    placed.push({ text, at });
    const [a, b, point] = [projectCoordinate(from), projectCoordinate(to), projectCoordinate(at)];
    let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    else if (angle < -90) angle += 180;
    labels.push({ key: street.id, text, x: point.x, y: point.y, angle });
  }
  return labels;
}
