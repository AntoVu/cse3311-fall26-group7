import { distanceMeters } from '../../src/routing/geo.ts';
import type { Coordinate, MapEdge, MapNode } from '../../src/types/map.ts';
import { closestPointOnSegment, toLocalMeters, type OsmWay, type PlanarPoint } from '../osm/transform.ts';

/**
 * The Indoor Digitizer's half of the routing graph: src/data/indoor-edits.json, turned into
 * indoor nodes and edges that join the outdoor walkways at building entrances.
 *
 * The file is traced over UTA's evacuation diagrams, which are copyrighted and never committed.
 * It holds only what routing needs, in true lat/lng: hallway centerlines, one point per door,
 * stairs and elevators, and entrances. Buildings are keyed by abbreviation ("NH", "ERB"), the
 * same prefix the diagrams' file names use.
 *
 * Pure functions, like tools/osm/edits.ts, so the rules are unit-tested in __tests__/indoor.test.ts.
 */

/** A traced point. `image` is where it sits on a diagram, for the tool only; the import ignores it. */
export type IndoorPoint = Coordinate & { image?: { layout: string; u: number; v: number } };

export type IndoorHallway = { key: string; floor: string; points: IndoorPoint[] };
export type IndoorDoor = { key: string; floor: string; room: string; at: IndoorPoint };
export type ConnectorKind = 'stairs' | 'elevator';
/** A stair or elevator shaft: one position, every floor it stops on. */
export type IndoorConnector = { key: string; kind: ConnectorKind; name: string; floors: string[]; at: IndoorPoint };
export type IndoorEntrance = { key: string; floor: string; at: IndoorPoint };

export type IndoorBuilding = {
  /** Bottom to top, as people say them: "B", "1", "2"... */
  floors: string[];
  hallways: IndoorHallway[];
  doors: IndoorDoor[];
  connectors: IndoorConnector[];
  entrances: IndoorEntrance[];
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

const CONNECTOR_KINDS: readonly ConnectorKind[] = ['stairs', 'elevator'];

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
    const floors = Array.isArray(b.floors) ? b.floors : [];
    if (!floors.every((f) => typeof f === 'string' && f)) fail(`${abbr} has a floor that is not a name.`);
    const list = (field: string) => (Array.isArray(b[field]) ? (b[field] as Record<string, unknown>[]) : []);

    const keys = new Set<string>();
    const check = (kind: string, item: Record<string, unknown>) => {
      if (!isRecord(item) || typeof item.key !== 'string' || !item.key) fail(`${abbr} has a ${kind} with no key.`);
      const label = `${abbr} ${kind} "${String(item.key)}"`;
      if (keys.has(item.key as string)) fail(`${abbr} uses the key "${String(item.key)}" twice.`);
      keys.add(item.key as string);
      const onFloors = kind === 'connector' ? (item.floors as unknown[]) : [item.floor];
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
    }
    for (const connector of list('connectors')) {
      const label = check('connector', connector);
      if (!CONNECTOR_KINDS.includes(connector.kind as ConnectorKind)) {
        fail(`${label} has kind "${String(connector.kind)}"; expected stairs or elevator.`);
      }
      if (!isCoordinate(connector.at)) fail(`${label} has no { lat, lng } position.`);
    }
    for (const entrance of list('entrances')) {
      const label = check('entrance', entrance);
      if (!isCoordinate(entrance.at)) fail(`${label} has no { lat, lng } position.`);
    }

    buildings[abbr] = {
      floors: floors as string[],
      hallways: list('hallways') as IndoorHallway[],
      doors: list('doors') as IndoorDoor[],
      connectors: list('connectors') as IndoorConnector[],
      entrances: list('entrances') as IndoorEntrance[],
    };
  }

  return { version: 1, buildings };
}

// ---- entrances: joining the outdoor walkways ----------------------------------------------

/** Keeps entrance node ids clear of the negative ids stitchTracedWalkways hands out. */
const ENTRANCE_ID_BASE = -1_000_000;

/** Every entrance, keyed `<building>/<key>` so keys only need to be unique within a building. */
export function listEntrances(edits: IndoorEdits): { key: string; at: Coordinate }[] {
  return Object.entries(edits.buildings).flatMap(([abbr, b]) =>
    b.entrances.map((entrance) => ({ key: `${abbr}/${entrance.key}`, at: entrance.at }))
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
export function buildIndoorGraph(
  edits: IndoorEdits,
  poiIdByAbbreviation: Map<string, string>,
  entranceNodeIds: Map<string, string>
): { nodes: MapNode[]; edges: MapEdge[]; problems: string[] } {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const problems: string[] = [];

  const addEdge = (from: string, to: string, meters: number) =>
    edges.push({ id: `ie${edges.length}`, fromNodeId: from, toNodeId: to, distanceMeters: meters, walkable: true });

  for (const abbr of Object.keys(edits.buildings).sort()) {
    const b = edits.buildings[abbr];
    const poiId = poiIdByAbbreviation.get(abbr);
    if (!poiId) {
      problems.push(`${abbr}: no building on the map has this abbreviation, so its indoor data was skipped.`);
      continue;
    }

    const allPoints = [...b.hallways.flatMap((h) => h.points), ...b.doors.map((d) => d.at)];
    if (allPoints.length === 0) continue;
    const origin = allPoints[0];
    const planar = (c: Coordinate) => toLocalMeters(origin, c);
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

      for (const door of b.doors.filter((d) => d.floor === floor)) {
        const hall = attach(door.at);
        if (!hall) {
          problems.push(`${abbr} door ${door.room} (${door.key}), floor ${floor}: no hallway within ${ATTACH_METERS} m.`);
          continue;
        }
        spur(newNode({ lat: door.at.lat, lng: door.at.lng }, floor, door.room), hall);
      }

      for (const entrance of b.entrances.filter((e) => e.floor === floor)) {
        const outdoorId = entranceNodeIds.get(`${abbr}/${entrance.key}`);
        if (!outdoorId) {
          problems.push(`${abbr} entrance ${entrance.key}: not joined to an outdoor walkway (none within reach).`);
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
        const hall = attach(connector.at);
        if (!hall) {
          problems.push(`${abbr} ${connector.kind} "${connector.name}", floor ${floor}: no hallway within ${ATTACH_METERS} m.`);
          continue;
        }
        const node = newNode({ lat: connector.at.lat, lng: connector.at.lng }, floor);
        nodes[nodes.length - 1].connector = connector.kind;
        spur(node, hall);
        const served = stops.get(connector);
        if (served) served.push(node);
        else stops.set(connector, [node]);
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
