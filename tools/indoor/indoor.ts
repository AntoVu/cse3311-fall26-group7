import { distanceMeters, metersPerDegreeLatitude, metersPerDegreeLongitude } from '../../src/routing/geo.ts';
import type { Coordinate, IndoorFloorPlan, MapEdge, MapNode } from '../../src/types/map.ts';
import { closestPointOnSegment, polygonCenter, toLocalMeters, type OsmWay, type PlanarPoint } from '../osm/transform.ts';

/**
 * The Indoor Digitizer's half of the routing graph: src/data/indoor-edits.json, turned into
 * indoor nodes and edges that join the outdoor walkways at building entrances.
 *
 * The file is traced over UTA's evacuation diagrams, which are copyrighted and never committed.
 * It holds what routing needs, in true lat/lng: hallway centerlines, one point per door,
 * stairs and elevators, entrances, and walkable areas (commons, rooms you can cross). It also holds
 * what the indoor map draws (`floorPlansByPoi`): room and floor outlines, and objects (vending
 * machines, restrooms...). Buildings are keyed by
 * abbreviation ("NH", "ERB", the diagrams' file name prefix), or by POI id when they have none.
 *
 * Pure functions, like tools/osm/edits.ts, so the rules are unit-tested in __tests__/indoor.test.ts.
 */

/** A traced point. `image` is where it sits on a diagram, for the tool only; the import ignores it. */
export type IndoorPoint = Coordinate & { image?: { layout: string; u: number; v: number } };

export type IndoorHallway = { key: string; floor: string; points: IndoorPoint[] };
/** A room's door, what routing needs. `outline` is the old per-door walls, superseded by `rooms`. */
export type IndoorDoor = { key: string; floor: string; room: string; at: IndoorPoint; outline?: IndoorPoint[] };
/**
 * A door between two rooms (105 -> office 105A). Each side is a point just inside that room, so
 * which side is which is recorded, not guessed. `at` is the doorway.
 */
export type IndoorConnectingDoor = {
  key: string;
  floor: string;
  at: IndoorPoint;
  sides: [{ room: string; at: IndoorPoint }, { room: string; at: IndoorPoint }];
};
export type ConnectorKind = 'stairs' | 'elevator';
/**
 * A stair or elevator: every floor it stops on, at `at` unless `stops` gives that floor its own spot (a
 * flight entered from the north at the bottom can come out facing west at the top). Every flight goes
 * both ways; where a stair reaches is just the floors it stops on.
 */
export type IndoorConnector = {
  key: string;
  kind: ConnectorKind;
  name: string;
  floors: string[];
  at: IndoorPoint;
  stops?: Record<string, IndoorPoint>;
};
/** `exitOnly` doors are recorded but never used to enter; `emergency` (alarmed) ones are always exit-only. */
export type IndoorEntrance = {
  key: string;
  floor: string;
  at: IndoorPoint;
  accessible?: boolean;
  exitOnly?: boolean;
  emergency?: boolean;
};

export const OBJECT_KINDS = [
  'vending',
  'microwave',
  'water',
  'restroom-men',
  'restroom-women',
  'restroom-all',
  'seating',
  'study',
  'lounge',
  'printer',
  'atm',
  'aed',
  'other',
] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];
/** Something worth finding on a floor. `other` needs a `name`. */
export type IndoorObject = { key: string; floor: string; kind: ObjectKind; name?: string; at: IndoorPoint };

export type AreaKind = 'open' | 'room';
/**
 * A walkable space that is not a hallway. `open`: a commons, lobby or atrium; everything touching it
 * is joined to everything else in it by a straight line. `room`: the inside of room `room` (a lecture
 * hall, the library), joined only to that room's doors and to stairs or entrances inside it, and
 * priced at ROOM_COST_FACTOR times its length so routes cut through only when that saves a lot.
 */
export type IndoorArea = { key: string; floor: string; kind: AreaKind; room?: string; points: IndoorPoint[] };

/**
 * A room's walls, for drawing. `curves[i]` bends the edge from corner i to corner i+1 into the
 * quadratic curve with that control point (the Campus Digitizer's Curve tool). Kept as corners and
 * controls, not a flattened ring, so the tool can still edit them.
 */
export type IndoorRoom = {
  key: string;
  floor: string;
  room: string;
  corners: IndoorPoint[];
  curves?: Record<string, IndoorPoint>;
};

export type IndoorBuilding = {
  /** Bottom to top, as people say them: "B", "1", "2"... */
  floors: string[];
  hallways: IndoorHallway[];
  doors: IndoorDoor[];
  connectingDoors: IndoorConnectingDoor[];
  connectors: IndoorConnector[];
  entrances: IndoorEntrance[];
  objects: IndoorObject[];
  areas: IndoorArea[];
  rooms: IndoorRoom[];
  /** A floor's own outline, where it differs from the building's (upper floors can be smaller). */
  floorOutlines: Record<string, IndoorPoint[]>;
  /** The floor whose outline replaces the building's shape on the campus map (`mapOutlineFor`). */
  mapOutline?: string;
};

export type IndoorEdits = { version: 1; buildings: Record<string, IndoorBuilding> };

export const EMPTY_INDOOR_EDITS: IndoorEdits = { version: 1, buildings: {} };

/** Hallway points closer than this on one floor are the same junction. */
export const MERGE_METERS = 1;
/** A door, stair or entrance further than this from any hallway on its floor is left out. */
export const ATTACH_METERS = 10;
/**
 * What climbing one floor costs, as the flat walk that takes as long. Rough: a flight is about
 * 15 s on foot and 1.4 m/s is the walking speed. They add to a route's distance and ETA.
 */
export const STAIRS_METERS_PER_FLOOR = 20;
/** Per floor, and slower than stairs for one floor because of the wait. ponytail: no separate wait cost. */
export const ELEVATOR_METERS_PER_FLOOR = 25;

/** A door, stair, entrance or hallway end this close to an open area's edge joins the area. */
export const AREA_EDGE_METERS = 2;
/** What a meter walked through a room costs the route search, against 1 everywhere else. */
export const ROOM_COST_FACTOR = 3;
/** How far inside an area its inside corners are moved, so lines around them stay in the area. */
const CORNER_INSET_METERS = 0.3;

const CONNECTOR_KINDS: readonly ConnectorKind[] = ['stairs', 'elevator'];
const AREA_KINDS: readonly AreaKind[] = ['open', 'room'];

// ---- evacuation diagram file names --------------------------------------------------------

export type EvacName = { building: string; room: string; floor: string; variant?: string };

/**
 * Reads `Evac_NH_B20A.pdf`-style names. Rooms are numbered floor first, and Nedderman's
 * basement uses a B prefix. Codes like `5C3` mark a corridor; `335B-1` is a second diagram
 * for the same room.
 */
export function parseEvacName(file: string): EvacName | null {
  const name = file.split(/[\\/]/).pop() ?? '';
  const match = /^Evac_([A-Za-z]+)_([A-Za-z0-9]+?)(?:-(\d+))?\.pdf$/i.exec(name);
  if (!match) return null;
  const [, building, room, variant] = match;
  const floor = /^B\d/i.test(room) ? 'B' : /^\d/.test(room) ? room[0] : null;
  if (!floor) return null;
  return variant ? { building, room, floor, variant } : { building, room, floor };
}

// ---- indoor-edits.json --------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCoordinate(value: unknown): value is Coordinate {
  return (
    isRecord(value) &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng)
  );
}

const fail = (message: string): never => {
  throw new Error(`indoor-edits.json: ${message}`);
};

/** An outline is at least 3 coordinates; the closing edge is implied. */
const checkRing = (label: string, ring: unknown) => {
  if (!Array.isArray(ring) || !ring.every(isCoordinate)) fail(`${label} has a point that is not { lat, lng } numbers.`);
  if ((ring as unknown[]).length < 3) fail(`${label} needs at least 3 points.`);
};

/** Checks indoor-edits.json before the import trusts it. Errors name the building and the entry. */
export function parseIndoorEdits(raw: unknown): IndoorEdits {
  if (!isRecord(raw)) return fail('expected a JSON object.');
  if (raw.version !== 1) {
    fail(`version ${String(raw.version)} is not one this import knows (expected 1). Update tools/indoor/indoor.ts.`);
  }

  const buildings: Record<string, IndoorBuilding> = {};
  for (const [abbr, entry] of Object.entries(isRecord(raw.buildings) ? raw.buildings : {})) {
    if (!isRecord(entry)) fail(`the entry for ${abbr} is not an object.`);
    const b = entry as Record<string, unknown>;
    // A building with entrances only (no indoor tracing) gets a ground floor to put them on.
    const floors = Array.isArray(b.floors) && b.floors.length > 0 ? b.floors : ['1'];
    if (!floors.every((f) => typeof f === 'string' && f)) fail(`${abbr} has a floor that is not a name.`);
    const list = (field: string) => (Array.isArray(b[field]) ? (b[field] as Record<string, unknown>[]) : []);

    const keys = new Set<string>();
    const check = (kind: string, item: Record<string, unknown>) => {
      if (!isRecord(item) || typeof item.key !== 'string' || !item.key) fail(`${abbr} has a ${kind} with no key.`);
      const label = `${abbr} ${kind} "${String(item.key)}"`;
      if (keys.has(item.key as string)) fail(`${abbr} uses the key "${String(item.key)}" twice.`);
      keys.add(item.key as string);
      const onFloors = kind === 'connector' ? (item.floors as unknown[]) : [item.floor];
      if (kind === 'object' && !OBJECT_KINDS.includes(item.kind as ObjectKind)) {
        fail(`${label} has kind "${String(item.kind)}"; expected one of ${OBJECT_KINDS.join(', ')}.`);
      }
      if (!Array.isArray(onFloors)) fail(`${label} has no floor list.`);
      for (const floor of onFloors) {
        if (!floors.includes(floor)) fail(`${label} is on floor "${String(floor)}", which ${abbr} does not list.`);
      }
      return label;
    };

    for (const hallway of list('hallways')) {
      const label = check('hallway', hallway);
      if (!Array.isArray(hallway.points) || !hallway.points.every(isCoordinate)) {
        fail(`${label} has a point that is not { lat, lng } numbers.`);
      }
      if ((hallway.points as unknown[]).length < 2) fail(`${label} needs at least 2 points.`);
    }
    for (const door of list('doors')) {
      const label = check('door', door);
      if (typeof door.room !== 'string' || !door.room) fail(`${label} has no room number.`);
      if (!isCoordinate(door.at)) fail(`${label} has no { lat, lng } position.`);
      if (door.outline !== undefined) checkRing(`${label} outline`, door.outline);
    }
    for (const door of list('connectingDoors')) {
      const label = check('connecting door', door);
      if (!isCoordinate(door.at)) fail(`${label} has no { lat, lng } position.`);
      const sides = door.sides as Record<string, unknown>[];
      if (!Array.isArray(sides) || sides.length !== 2 || !sides.every(isRecord)) fail(`${label} needs two sides.`);
      for (const side of sides) {
        if (typeof side.room !== 'string' || !side.room) fail(`${label} has a side with no room number.`);
        if (!isCoordinate(side.at)) fail(`${label} has a side with no { lat, lng } position.`);
      }
      if (sides[0].room === sides[1].room) fail(`${label} needs two different rooms.`);
    }
    for (const connector of list('connectors')) {
      const label = check('connector', connector);
      if (!CONNECTOR_KINDS.includes(connector.kind as ConnectorKind)) {
        fail(`${label} has kind "${String(connector.kind)}"; expected stairs or elevator.`);
      }
      if (!isCoordinate(connector.at)) fail(`${label} has no { lat, lng } position.`);
      for (const [floor, at] of Object.entries(isRecord(connector.stops) ? connector.stops : {})) {
        if (!(connector.floors as unknown[]).includes(floor)) fail(`${label} has a spot on floor ${floor}, which it does not stop on.`);
        if (!isCoordinate(at)) fail(`${label} has a spot on floor ${floor} that is not { lat, lng } numbers.`);
      }
    }
    for (const entrance of list('entrances')) {
      const label = check('entrance', entrance);
      if (!isCoordinate(entrance.at)) fail(`${label} has no { lat, lng } position.`);
    }
    for (const object of list('objects')) {
      const label = check('object', object);
      if (object.kind === 'other' && (typeof object.name !== 'string' || !object.name)) {
        fail(`${label} is "other" but has no name.`);
      }
      if (!isCoordinate(object.at)) fail(`${label} has no { lat, lng } position.`);
    }
    for (const area of list('areas')) {
      const label = check('area', area);
      if (!AREA_KINDS.includes(area.kind as AreaKind)) fail(`${label} has kind "${String(area.kind)}"; expected open or room.`);
      if (area.kind === 'room' && (typeof area.room !== 'string' || !area.room)) {
        fail(`${label} is inside a room but has no room number.`);
      }
      checkRing(label, area.points);
    }
    for (const room of list('rooms')) {
      const label = check('room', room);
      if (typeof room.room !== 'string' || !room.room) fail(`${label} has no room number.`);
      checkRing(label, room.corners);
      for (const [edge, control] of Object.entries(isRecord(room.curves) ? room.curves : {})) {
        const index = Number(edge);
        if (!Number.isInteger(index) || index < 0 || index >= (room.corners as unknown[]).length) {
          fail(`${label} curves edge ${edge}, which it does not have.`);
        }
        if (!isCoordinate(control)) fail(`${label} has a curve on edge ${edge} that is not { lat, lng } numbers.`);
      }
    }
    const floorOutlines = isRecord(b.floorOutlines) ? b.floorOutlines : {};
    for (const [floor, outline] of Object.entries(floorOutlines)) {
      if (!floors.includes(floor)) fail(`${abbr} has an outline for floor "${floor}", which it does not list.`);
      checkRing(`${abbr} floor ${floor} outline`, outline);
    }
    if (b.mapOutline !== undefined && !(typeof b.mapOutline === 'string' && floorOutlines[b.mapOutline])) {
      fail(`${abbr} takes its map outline from floor ${String(b.mapOutline)}, which has no outline.`);
    }

    buildings[abbr] = {
      floors: floors as string[],
      hallways: list('hallways') as IndoorHallway[],
      doors: list('doors') as IndoorDoor[],
      connectingDoors: list('connectingDoors') as IndoorConnectingDoor[],
      connectors: list('connectors') as IndoorConnector[],
      entrances: list('entrances') as IndoorEntrance[],
      objects: list('objects') as IndoorObject[],
      areas: list('areas') as IndoorArea[],
      rooms: list('rooms') as IndoorRoom[],
      floorOutlines: floorOutlines as Record<string, IndoorPoint[]>,
      ...(b.mapOutline !== undefined && { mapOutline: b.mapOutline as string }),
    };
  }

  return { version: 1, buildings };
}

/**
 * The outline a building's map shape should be, when the Indoor Digitizer marked one of its floor
 * outlines for the map. `keys` are what the building might be filed under: its abbreviation, then
 * its POI id. It replaces OSM's outline and any Campus Digitizer reshape.
 */
export function mapOutlineFor(edits: IndoorEdits, keys: (string | undefined)[]): IndoorPoint[] | null {
  for (const key of keys) {
    const b = key ? edits.buildings[key] : undefined;
    if (b?.mapOutline) return b.floorOutlines[b.mapOutline];
  }
  return null;
}

// ---- entrances: joining the outdoor walkways ----------------------------------------------

/** Keeps entrance node ids clear of the negative ids stitchTracedWalkways hands out. */
const ENTRANCE_ID_BASE = -1_000_000;

/**
 * Every entrance to join outdoors, keyed `<building>/<key>` so keys only need to be unique within
 * a building. Exit-only doors are left out. ponytail: they could still serve routes leaving a
 * building; add that if leaving routes start using doors.
 */
export function listEntrances(edits: IndoorEdits): { key: string; building: string; at: Coordinate }[] {
  return Object.entries(edits.buildings).flatMap(([abbr, b]) =>
    b.entrances
      .filter((entrance) => !entrance.exitOnly)
      .map((entrance) => ({ key: `${abbr}/${entrance.key}`, building: abbr, at: entrance.at }))
  );
}

/**
 * Turns each entrance into a short footway from the entrance to the nearest raw walkway node,
 * for the import to build along with the rest. It runs on raw OSM nodes, before the chain
 * collapse, for the same reason traced walkways do: the nearest *junction* afterwards can be far
 * from the door. The entrance itself is always a new node, so it ends up a dead end (a
 * junction the collapse keeps) rather than folded into the middle of a sidewalk.
 */
export function joinEntrances(
  entrances: { key: string; at: Coordinate }[],
  coordinates: Map<number, Coordinate>,
  maxMeters: number
): { ways: OsmWay[]; rawIds: Map<string, number>; unjoined: string[] } {
  const pool = [...coordinates.entries()];
  const ways: OsmWay[] = [];
  const rawIds = new Map<string, number>();
  const unjoined: string[] = [];

  entrances.forEach((entrance, index) => {
    let nearest: { id: number; meters: number } | null = null;
    for (const [id, coordinate] of pool) {
      const meters = distanceMeters(entrance.at, coordinate);
      if (meters <= maxMeters && (!nearest || meters < nearest.meters)) nearest = { id, meters };
    }
    if (!nearest) {
      unjoined.push(entrance.key);
      return;
    }
    const id = ENTRANCE_ID_BASE - index;
    coordinates.set(id, entrance.at);
    rawIds.set(entrance.key, id);
    ways.push({ id, nodes: [id, nearest.id], tags: { highway: 'footway', name: `entrance ${entrance.key}` } });
  });

  return { ways, rawIds, unjoined };
}

// ---- the indoor graph ---------------------------------------------------------------------

type HallNode = { id: string; coordinate: Coordinate; p: PlanarPoint; level: string };
type Segment = { a: HallNode; b: HallNode };

/**
 * Builds the indoor nodes and edges.
 *
 * Per floor: hallway points within MERGE_METERS become one junction, and a hallway that ends
 * against another splits it (a T). Doors and stairs get their own node, joined by a short edge
 * to the nearest point of a hallway on their floor. A stair or elevator links each floor it
 * serves to the next one up. An entrance joins its hallway to the outdoor node the import made
 * for it (`entranceNodeIds`, keyed `<building>/<key>`).
 *
 * Anything that cannot be placed is left out and described in `problems` for the import report.
 */
// ---- walkable areas: planar geometry, in meters ---------------------------------------------

const cross = (o: PlanarPoint, a: PlanarPoint, b: PlanarPoint) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
const ringEdges = (ring: PlanarPoint[]) => ring.map((a, i) => [a, ring[(i + 1) % ring.length]] as const);

function pointInRing(p: PlanarPoint, ring: PlanarPoint[]): boolean {
  let inside = false;
  for (const [a, b] of ringEdges(ring)) {
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** The nearest point on the ring's walls to `p`, and how far it is. */
function nearestOnRing(p: PlanarPoint, ring: PlanarPoint[]): { point: PlanarPoint; distance: number } {
  let best = { point: ring[0], distance: Infinity };
  for (const [a, b] of ringEdges(ring)) {
    const { t, distance } = closestPointOnSegment(p, a, b);
    if (distance < best.distance) best = { point: { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }, distance };
  }
  return best;
}

/** Whether ab and cd cross at a point inside both. Touching at an end, or running along, does not count. */
function segmentsCross(a: PlanarPoint, b: PlanarPoint, c: PlanarPoint, d: PlanarPoint): boolean {
  const EPS = 1e-6;
  const side = (v: number) => (v > EPS ? 1 : v < -EPS ? -1 : 0);
  return side(cross(c, d, a)) * side(cross(c, d, b)) < 0 && side(cross(a, b, c)) * side(cross(a, b, d)) < 0;
}

/** Whether a straight walk from a to b (each in the area or on its walls) stays inside it. */
function seesAcross(a: PlanarPoint, b: PlanarPoint, ring: PlanarPoint[]): boolean {
  if (ringEdges(ring).some(([c, d]) => segmentsCross(a, b, c, d))) return false;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return pointInRing(mid, ring) || nearestOnRing(mid, ring).distance < 0.01;
}

// ---- floor plans: what the indoor map draws ----------------------------------------------

/** Points sampled along each curved room edge, its far corner not included. */
const CURVE_SAMPLES = 8;
const plain = ({ lat, lng }: Coordinate): Coordinate => ({ lat, lng });

/** A room's walls as a ring: its corners, with each curved edge sampled along its quadratic. */
export function roomRing(room: IndoorRoom): Coordinate[] {
  const ring: Coordinate[] = [];
  room.corners.forEach((a, i) => {
    ring.push(plain(a));
    const control = room.curves?.[String(i)];
    if (!control) return;
    const b = room.corners[(i + 1) % room.corners.length];
    for (let k = 1; k < CURVE_SAMPLES; k++) {
      const t = k / CURVE_SAMPLES;
      const u = 1 - t;
      ring.push({
        lat: u * u * a.lat + 2 * u * t * control.lat + t * t * b.lat,
        lng: u * u * a.lng + 2 * u * t * control.lng + t * t * b.lng,
      });
    }
  });
  return ring;
}

/**
 * Where a room's number goes: its center when that is inside, else (an L or a U) the inside
 * point farthest from the walls on a grid over the room. ponytail: 24x24 grid, plenty for a label.
 */
export function labelPoint(ring: Coordinate[]): Coordinate {
  const center = polygonCenter(ring);
  const origin = ring[0];
  const local = ring.map((p) => toLocalMeters(origin, p));
  if (pointInRing(toLocalMeters(origin, center), local)) return center;

  const xs = local.map((p) => p.x);
  const ys = local.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let best: { point: PlanarPoint; clearance: number } | null = null;
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 24; j++) {
      const point = { x: minX + ((i + 0.5) / 24) * (maxX - minX), y: minY + ((j + 0.5) / 24) * (maxY - minY) };
      if (!pointInRing(point, local)) continue;
      const clearance = nearestOnRing(point, local).distance;
      if (!best || clearance > best.clearance) best = { point, clearance };
    }
  }
  if (!best) return center;
  return {
    lat: origin.lat + best.point.y / metersPerDegreeLatitude(),
    lng: origin.lng + best.point.x / metersPerDegreeLongitude(origin.lat),
  };
}

/**
 * Each building's floors as the indoor map draws them, by POI id then floor, in plain lat/lng (the
 * tool's `image` is dropped). Floors with nothing to draw are left out, as are buildings that
 * resolve to no POI (`buildIndoorGraph` reports those). `problems`: room outlines no door of
 * that room is on (a typo in the number, or the wrong floor).
 */
export function floorPlansByPoi(
  edits: IndoorEdits,
  poiIdByKey: Map<string, string>
): { plans: Record<string, Record<string, IndoorFloorPlan>>; problems: string[] } {
  const plans: Record<string, Record<string, IndoorFloorPlan>> = {};
  const problems: string[] = [];
  for (const [abbr, b] of Object.entries(edits.buildings)) {
    const poiId = poiIdByKey.get(abbr);
    if (!poiId) continue;
    const floors: Record<string, IndoorFloorPlan> = {};
    for (const floor of b.floors) {
      const doorRooms = new Set([
        ...b.doors.filter((door) => door.floor === floor).map((door) => door.room),
        ...b.connectingDoors
          .filter((door) => door.floor === floor)
          .flatMap((door) => door.sides.map((side) => side.room)),
      ]);
      const rooms = b.rooms.filter((room) => room.floor === floor);
      for (const room of rooms) {
        if (!doorRooms.has(room.room)) {
          problems.push(`${abbr} room ${room.room} (${room.key}), floor ${floor}: no door of this room on the floor.`);
        }
      }
      const outline = b.floorOutlines[floor];
      const plan: IndoorFloorPlan = {
        ...(outline && { outline: outline.map(plain) }),
        rooms: rooms.map((room) => {
          const ring = roomRing(room);
          return { room: room.room, ring, label: labelPoint(ring) };
        }),
        objects: b.objects
          .filter((object) => object.floor === floor)
          .map((object) => ({ kind: object.kind, ...(object.name && { name: object.name }), at: plain(object.at) })),
        entrances: b.entrances
          .filter((entrance) => entrance.floor === floor)
          .map((entrance) => ({
            at: plain(entrance.at),
            ...(entrance.accessible && { accessible: true }),
            ...((entrance.exitOnly || entrance.emergency) && { exitOnly: true }),
          })),
      };
      if (plan.outline || plan.rooms.length || plan.objects.length || plan.entrances.length) floors[floor] = plan;
    }
    if (Object.keys(floors).length > 0) plans[poiId] = floors;
  }
  return { plans, problems };
}

/** The ring's inside corners (the ones that jut into the area), moved CORNER_INSET_METERS into it. */
function insideCorners(ring: PlanarPoint[]): PlanarPoint[] {
  const area = ring.reduce((sum, a, i) => sum + cross({ x: 0, y: 0 }, a, ring[(i + 1) % ring.length]), 0);
  const unit = (v: PlanarPoint) => {
    const length = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / length, y: v.y / length };
  };
  return ring.flatMap((at, i) => {
    const prev = ring[(i - 1 + ring.length) % ring.length];
    const next = ring[(i + 1) % ring.length];
    if (Math.sign(cross(prev, at, next)) !== -Math.sign(area)) return [];
    // The two walls point away from the corner; the way between them, reversed, is into the area.
    const a = unit({ x: prev.x - at.x, y: prev.y - at.y });
    const b = unit({ x: next.x - at.x, y: next.y - at.y });
    const into = unit({ x: -(a.x + b.x), y: -(a.y + b.y) });
    const moved = { x: at.x + into.x * CORNER_INSET_METERS, y: at.y + into.y * CORNER_INSET_METERS };
    return pointInRing(moved, ring) ? [moved] : [];
  });
}

export function buildIndoorGraph(
  edits: IndoorEdits,
  /** A building key (abbreviation or POI id) -> its POI id. */
  poiIdByKey: Map<string, string>,
  entranceNodeIds: Map<string, string>
): { nodes: MapNode[]; edges: MapEdge[]; problems: string[] } {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const problems: string[] = [];

  const addEdge = (from: string, to: string, meters: number, costMeters?: number, area?: true) =>
    edges.push({
      id: `ie${edges.length}`,
      fromNodeId: from,
      toNodeId: to,
      distanceMeters: meters,
      ...(costMeters !== undefined && { costMeters }),
      ...(area && { area }),
      walkable: true,
    });

  for (const abbr of Object.keys(edits.buildings).sort()) {
    const b = edits.buildings[abbr];
    const poiId = poiIdByKey.get(abbr);
    if (!poiId) {
      problems.push(`${abbr}: no building on the map has this abbreviation or id, so its indoor data was skipped.`);
      continue;
    }

    const allPoints = [...b.hallways.flatMap((h) => h.points), ...b.doors.map((d) => d.at), ...b.areas.flatMap((a) => a.points)];
    if (allPoints.length === 0) continue;
    const origin = allPoints[0];
    const planar = (c: Coordinate) => toLocalMeters(origin, c);
    const fromPlanar = (q: PlanarPoint): Coordinate => ({
      lat: origin.lat + q.y / metersPerDegreeLatitude(),
      lng: origin.lng + q.x / metersPerDegreeLongitude(origin.lat),
    });
    // Each stair or elevator's node on every floor it serves, bottom to top.
    const stops = new Map<IndoorConnector, HallNode[]>();

    const newNode = (coordinate: Coordinate, level: string, room?: string): HallNode => {
      const node: MapNode = { id: `i${nodes.length}`, coordinate, poiId, level };
      if (room) node.room = room;
      nodes.push(node);
      return { id: node.id, coordinate, p: planar(coordinate), level };
    };

    for (const floor of b.floors) {
      // 1. Hallway points, merged into junctions.
      const halls: HallNode[] = [];
      let segments: Segment[] = [];
      for (const hallway of b.hallways.filter((h) => h.floor === floor)) {
        let previous: HallNode | null = null;
        for (const point of hallway.points) {
          const p = planar(point);
          let node = halls.find((h) => Math.hypot(h.p.x - p.x, h.p.y - p.y) <= MERGE_METERS);
          if (!node) {
            node = newNode({ lat: point.lat, lng: point.lng }, floor);
            halls.push(node);
          }
          if (previous && previous !== node) segments.push({ a: previous, b: node });
          previous = node;
        }
      }

      // 2. T-junctions: a junction lying on another hallway splits it there.
      segments = segments.flatMap((segment) => {
        const onIt = halls
          .filter((h) => h !== segment.a && h !== segment.b)
          .map((h) => ({ h, ...closestPointOnSegment(h.p, segment.a.p, segment.b.p) }))
          .filter((c) => c.distance <= MERGE_METERS && c.t > 0 && c.t < 1)
          .sort((x, y) => x.t - y.t);
        const chain = [segment.a, ...onIt.map((c) => c.h), segment.b];
        return chain.slice(1).map((node, i) => ({ a: chain[i], b: node }));
      });

      // 3. The nearest hallway point to `at`, splitting a hallway to make one if needed.
      const attach = (at: Coordinate): HallNode | null => {
        const p = planar(at);
        let best: { segment: Segment; t: number; distance: number } | null = null;
        for (const segment of segments) {
          const c = closestPointOnSegment(p, segment.a.p, segment.b.p);
          if (!best || c.distance < best.distance) best = { segment, ...c };
        }
        if (!best || best.distance > ATTACH_METERS) return null;

        const { segment, t } = best;
        const length = Math.hypot(segment.b.p.x - segment.a.p.x, segment.b.p.y - segment.a.p.y);
        if (t * length <= MERGE_METERS) return segment.a;
        if ((1 - t) * length <= MERGE_METERS) return segment.b;

        const split = newNode(
          {
            lat: segment.a.coordinate.lat + t * (segment.b.coordinate.lat - segment.a.coordinate.lat),
            lng: segment.a.coordinate.lng + t * (segment.b.coordinate.lng - segment.a.coordinate.lng),
          },
          floor
        );
        segments.splice(segments.indexOf(segment), 1, { a: segment.a, b: split }, { a: split, b: segment.b });
        return split;
      };
      const spur = (from: HallNode | { id: string; coordinate: Coordinate }, to: HallNode) =>
        addEdge(from.id, to.id, distanceMeters(from.coordinate, to.coordinate));

      // Walkable areas on this floor, and what joins each one (its portals).
      type Portal = { id: string; coordinate: Coordinate; p: PlanarPoint };
      const areas = b.areas
        .filter((a) => a.floor === floor)
        .map((area) => ({ area, ring: area.points.map(planar), portals: [] as Portal[], doors: 0 }));
      type FloorArea = (typeof areas)[number];
      const touches = (p: PlanarPoint, a: FloorArea) => pointInRing(p, a.ring) || nearestOnRing(p, a.ring).distance <= AREA_EDGE_METERS;
      const openAt = (p: PlanarPoint) => areas.find((a) => a.area.kind === 'open' && touches(p, a));
      // A stair or entrance inside a room you can cross opens into it; one in a commons, onto that.
      const areaAt = (p: PlanarPoint) => areas.find((a) => a.area.kind === 'room' && pointInRing(p, a.ring)) ?? openAt(p);
      for (const hall of halls) for (const a of areas) if (a.area.kind === 'open' && touches(hall.p, a)) a.portals.push(hall);

      // Each room's node on this floor: its first hallway door, or one made for a connecting door.
      const roomNodes = new Map<string, HallNode>();
      for (const door of b.doors.filter((d) => d.floor === floor)) {
        // A door onto a commons opens onto it, not onto whatever hallway is nearest.
        const p = planar(door.at);
        const open = openAt(p);
        const hall = open ? null : attach(door.at);
        if (!open && !hall) {
          problems.push(`${abbr} door ${door.room} (${door.key}), floor ${floor}: no hallway within ${ATTACH_METERS} m.`);
          continue;
        }
        const node = newNode({ lat: door.at.lat, lng: door.at.lng }, floor, door.room);
        if (open) open.portals.push(node);
        else spur(node, hall!);
        // Every door of a room you can cross leads into it.
        for (const a of areas) {
          if (a.area.kind !== 'room' || a.area.room !== door.room || !touches(p, a)) continue;
          a.portals.push(node);
          a.doors++;
        }
        if (!roomNodes.has(door.room)) roomNodes.set(door.room, node);
      }

      // A door between two rooms joins each room's node; a room with no hallway door (an inner
      // office) gets its node just inside, where the side was drawn. ponytail: a room with several
      // hallway doors links through its first one only.
      for (const door of b.connectingDoors.filter((d) => d.floor === floor)) {
        const node = newNode({ lat: door.at.lat, lng: door.at.lng }, floor);
        for (const side of door.sides) {
          let room = roomNodes.get(side.room);
          if (!room) {
            room = newNode({ lat: side.at.lat, lng: side.at.lng }, floor, side.room);
            roomNodes.set(side.room, room);
          }
          spur(node, room);
        }
      }

      for (const entrance of b.entrances.filter((e) => e.floor === floor && !e.exitOnly)) {
        const outdoorId = entranceNodeIds.get(`${abbr}/${entrance.key}`);
        if (!outdoorId) {
          problems.push(`${abbr} entrance ${entrance.key}: not joined to an outdoor walkway (none within reach).`);
          continue;
        }
        const p = planar(entrance.at);
        const area = areaAt(p);
        if (area) {
          area.portals.push({ id: outdoorId, coordinate: entrance.at, p });
          continue;
        }
        const hall = attach(entrance.at);
        if (!hall) {
          problems.push(`${abbr} entrance ${entrance.key}, floor ${floor}: no hallway within ${ATTACH_METERS} m.`);
          continue;
        }
        spur({ id: outdoorId, coordinate: entrance.at }, hall);
      }

      for (const connector of b.connectors.filter((c) => c.floors.includes(floor))) {
        const at = connector.stops?.[floor] ?? connector.at;
        const area = areaAt(planar(at));
        const hall = area ? null : attach(at);
        if (!area && !hall) {
          problems.push(`${abbr} ${connector.kind} "${connector.name}", floor ${floor}: no hallway within ${ATTACH_METERS} m.`);
          continue;
        }
        const node = newNode({ lat: at.lat, lng: at.lng }, floor);
        nodes[nodes.length - 1].connector = connector.kind;
        if (area) {
          area.portals.push(node);
          // A stair that opens into a room is in it, so directions say the room is walked through.
          if (area.area.kind === 'room') nodes[nodes.length - 1].inside = area.area.room;
        } else spur(node, hall!);
        const served = stops.get(connector);
        if (served) served.push(node);
        else stops.set(connector, [node]);
      }

      // Each area: a straight edge between every two portals that can see each other across it, going
      // round its inside corners where they cannot (a visibility graph).
      for (const { area, ring, portals, doors } of areas) {
        const label = `${abbr} area ${area.key}${area.kind === 'room' ? ` (room ${area.room})` : ''}, floor ${floor}`;
        if (area.kind === 'room' && doors === 0) {
          problems.push(`${label}: no door of room ${area.room} touches it.`);
          continue;
        }
        if (portals.length === 0) {
          problems.push(`${label}: joins nothing (no door, stair, entrance or hallway touches it).`);
          continue;
        }
        // Corners become nodes only when an edge uses them.
        const corners = insideCorners(ring).map((p) => ({ id: '', coordinate: fromPlanar(p), p }));
        const idOf = (point: Portal) => {
          if (!point.id) {
            point.id = newNode(point.coordinate, floor).id;
            if (area.kind === 'room') nodes[nodes.length - 1].inside = area.room;
          }
          return point.id;
        };
        // A portal just outside the area is seen from where it meets the wall.
        const sight = (point: Portal) => (pointInRing(point.p, ring) ? point.p : nearestOnRing(point.p, ring).point);
        const points = [...new Map(portals.map((x) => [x.id, x])).values(), ...corners];
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            const meters = distanceMeters(points[i].coordinate, points[j].coordinate);
            if (meters < 0.01 || !seesAcross(sight(points[i]), sight(points[j]), ring)) continue;
            addEdge(idOf(points[i]), idOf(points[j]), meters, area.kind === 'room' ? meters * ROOM_COST_FACTOR : undefined, true);
          }
        }
      }

      // Last, once every attachment has had its chance to split them.
      for (const segment of segments) spur(segment.a, segment.b);
    }

    // b.floors runs bottom to top, so each stop links to the next one up.
    for (const [connector, served] of stops) {
      const perFloor = connector.kind === 'stairs' ? STAIRS_METERS_PER_FLOOR : ELEVATOR_METERS_PER_FLOOR;
      for (let i = 1; i < served.length; i++) {
        const floorsApart = b.floors.indexOf(served[i].level) - b.floors.indexOf(served[i - 1].level);
        addEdge(served[i - 1].id, served[i].id, perFloor * floorsApart);
      }
    }
  }

  return { nodes, edges, problems };
}
