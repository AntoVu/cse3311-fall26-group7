import { metersPerDegreeLatitude, metersPerDegreeLongitude } from '@/routing/geo';
import type { Coordinate, MapNode } from '@/types/map';

/**
 * Text directions for a drawn route (UC-02 step 7): "Head north", "Turn left", "Enter Nedderman
 * Hall", "Take the stairs up to floor 2", "Arrive at ...".
 *
 * Distances stay in meters on each step, not in the text, so the screen formats them in
 * whatever unit the user picked.
 */
export type DirectionStep = { text: string; distanceMeters: number };

export type DirectionOptions = {
  /** Said in the last step, "Arrive at <destinationName>". */
  destinationName?: string;
  /** RoutePlan.pathNodes. Without it every point counts as outdoors. */
  pathNodes?: (MapNode | undefined)[];
  /** Names the building being entered, from a node's poiId. */
  buildingName?: (poiId: string) => string | undefined;
};

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

export function routeDirections(path: Coordinate[], options: DirectionOptions = {}): DirectionStep[] {
  const { destinationName, pathNodes = [], buildingName } = options;
  if (path.length < 2) return [];

  // Flat meters around the start, the same equirectangular model geo.ts uses.
  const metersX = metersPerDegreeLongitude(path[0].lat);
  const metersY = metersPerDegreeLatitude();
  const points = path.map((c) => ({
    x: (c.lng - path[0].lng) * metersX,
    y: (c.lat - path[0].lat) * metersY,
  }));
  // Undefined is outdoors. Indoor points are always nodes: indoor edges are straight lines.
  const levels = path.map((_, i) => pathNodes[i]?.level);

  const steps: DirectionStep[] = [];
  let heading: number | null = null;
  // The step a run of stairs is being added to, so three flights read as one.
  let climb: { step: DirectionStep; kind: string; up: boolean } | null = null;

  const walk = (from: Point, to: Point) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;
    const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;

    if (heading !== null && length < JOG_METERS) {
      steps[steps.length - 1].distanceMeters += length;
      return;
    }
    const text =
      heading === null
        ? `Head ${COMPASS[Math.round(((bearing + 360) % 360) / 45) % 8]}`
        : turnText(((bearing - heading + 540) % 360) - 180);
    if (text) {
      steps.push({ text, distanceMeters: length });
      climb = null;
    } else {
      steps[steps.length - 1].distanceMeters += length;
    }
    heading = bearing;
  };

  // The path in runs of one level each (outdoors is a level too), simplified run by run so a
  // simplification never cuts across a doorway or a staircase.
  let runStart = 0;
  for (let i = 1; i <= path.length; i++) {
    if (i < path.length && levels[i] === levels[runStart]) continue;
    const run = simplify(points.slice(runStart, i));
    for (let j = 0; j + 1 < run.length; j++) walk(run[j], run[j + 1]);
    if (i === path.length) break;

    // A change of level between point i - 1 and point i.
    const from = levels[i - 1];
    const to = levels[i];
    if (from === undefined || to === undefined) {
      const poiId = pathNodes[from === undefined ? i : i - 1]?.poiId;
      const name = (poiId && buildingName?.(poiId)) || 'the building';
      steps.push({ text: from === undefined ? `Enter ${name}` : `Exit ${name}`, distanceMeters: 0 });
      climb = null;
      heading = null;
      walk(points[i - 1], points[i]);
      // An entrance spur is short; it should not be a "Head ..." step of its own.
      if (steps[steps.length - 1].text.startsWith('Head ')) {
        const spur = steps.pop()!;
        steps[steps.length - 1].distanceMeters += spur.distanceMeters;
      }
    } else {
      const kind = pathNodes[i]?.connector ?? 'stairs';
      const up = floorRank(to) > floorRank(from);
      const text = `Take the ${kind} ${up ? 'up' : 'down'} to ${to === 'B' ? 'the basement' : `floor ${to}`}`;
      if (climb && climb.kind === kind && climb.up === up) climb.step.text = text;
      else {
        const step = { text, distanceMeters: 0 };
        steps.push(step);
        climb = { step, kind, up };
      }
      heading = null;
    }
    runStart = i;
  }

  if (steps.length === 0) return [];

  // A door is usually a few meters off the hallway, far too short to be a turn of its own, so
  // say which side it is on instead.
  const room = pathNodes[path.length - 1]?.room;
  const n = points.length;
  if (room && n >= 3 && levels[n - 3] === levels[n - 1]) {
    const hallway = bearingOf(points[n - 3], points[n - 2]);
    const spur = bearingOf(points[n - 2], points[n - 1]);
    const turn = ((spur - hallway + 540) % 360) - 180;
    if (Math.abs(turn) >= STRAIGHT_DEGREES && Math.abs(turn) < U_TURN_DEGREES) {
      steps.push({ text: `Room ${room} is on your ${turn > 0 ? 'right' : 'left'}`, distanceMeters: 0 });
    }
  }

  steps.push({
    text: destinationName ? `Arrive at ${destinationName}` : 'Arrive at your destination',
    distanceMeters: 0,
  });
  return steps;
}

function bearingOf(from: Point, to: Point): number {
  return (Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI;
}

/** Floors as people say them: "B" is below "1". */
function floorRank(level: string): number {
  return level === 'B' ? -1 : Number.parseFloat(level) || 0;
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
