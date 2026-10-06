import { metersPerDegreeLatitude, metersPerDegreeLongitude } from '@/routing/geo';
import type { Coordinate } from '@/types/map';

/**
 * Text directions for a drawn route (UC-02 step 7): "Head north", "Turn left", "Arrive at ...".
 *
 * Distances stay in meters on each step, not in the text, so the screen formats them in
 * whatever unit the user picked.
 */
export type DirectionStep = { text: string; distanceMeters: number };

/**
 * How far a sidewalk may wander from a straight line before it counts as a bend. OSM ways are
 * traced from aerial imagery and wobble by a few meters; without this every wobble is a turn.
 */
const SIMPLIFY_METERS = 5;
/**
 * A leg shorter than this (a crosswalk jog, a step around a planter) is folded into the step
 * before it and does not change the heading, so "right 20 ft, left 140 ft" reads as straight on.
 */
const JOG_METERS = 15;
/** A change of heading under this is "keep going". */
const STRAIGHT_DEGREES = 30;
/** Under this is a slight turn; over it, a turn. */
const SLIGHT_DEGREES = 60;
/** Past this the path doubles back. */
const U_TURN_DEGREES = 150;

type Point = { x: number; y: number };

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

export function routeDirections(path: Coordinate[], destinationName?: string): DirectionStep[] {
  if (path.length < 2) return [];

  // Flat meters around the start, the same equirectangular model geo.ts uses.
  const metersX = metersPerDegreeLongitude(path[0].lat);
  const metersY = metersPerDegreeLatitude();
  const points = simplify(
    path.map((c) => ({ x: (c.lng - path[0].lng) * metersX, y: (c.lat - path[0].lat) * metersY }))
  );

  const steps: DirectionStep[] = [];
  let heading: number | null = null;
  for (let i = 0; i + 1 < points.length; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;

    if (heading !== null && length < JOG_METERS) {
      steps[steps.length - 1].distanceMeters += length;
      continue;
    }
    if (heading === null) {
      steps.push({ text: `Head ${COMPASS[Math.round(((bearing + 360) % 360) / 45) % 8]}`, distanceMeters: length });
    } else {
      const turn = ((bearing - heading + 540) % 360) - 180; // -180..180, positive is right
      const text = turnText(turn);
      if (text) steps.push({ text, distanceMeters: length });
      else steps[steps.length - 1].distanceMeters += length;
    }
    heading = bearing;
  }

  if (steps.length === 0) return [];
  steps.push({
    text: destinationName ? `Arrive at ${destinationName}` : 'Arrive at your destination',
    distanceMeters: 0,
  });
  return steps;
}

function turnText(turn: number): string | null {
  const size = Math.abs(turn);
  const side = turn > 0 ? 'right' : 'left';
  if (size < STRAIGHT_DEGREES) return null;
  if (size < SLIGHT_DEGREES) return `Turn slightly ${side}`;
  if (size < U_TURN_DEGREES) return `Turn ${side}`;
  return 'Turn around';
}

/** Douglas-Peucker: keeps only the points that bend the line by more than SIMPLIFY_METERS. */
function simplify(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  let farthest = 0;
  let farthestIndex = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = distanceToSegment(points[i], first, last);
    if (d > farthest) {
      farthest = d;
      farthestIndex = i;
    }
  }
  if (farthest <= SIMPLIFY_METERS) return [first, last];
  const left = simplify(points.slice(0, farthestIndex + 1));
  return [...left.slice(0, -1), ...simplify(points.slice(farthestIndex))];
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
