import type { BuildingLabel } from '../../src/data/map-labels.ts';
import { distanceMeters } from '../../src/routing/geo.ts';
import type { Coordinate, PoiCategory } from '../../src/types/map.ts';
import { groupCenter, polygonCenter, slugify, type OsmWay } from './transform.ts';

/**
 * The Campus Digitizer's half of the map: src/data/map-edits.json, merged into the OSM import.
 *
 * OSM draws most of campus but names only part of it, and misses some of it outright. The
 * digitizer covers both gaps. It **labels OSM features by way id** (an unnamed building, an
 * unidentified lot, something to hide), and it **traces what OSM lacks** against the PATS map.
 * The file holds true lat/lng, so the import never needs the image or its georeference.
 *
 * Precedence, field by field: map-edits.json, then map-labels.ts, then the OSM tags.
 *
 * Pure functions, like transform.ts, so the merge rules are unit-tested in
 * __tests__/edits.test.ts.
 */

/**
 * An outline drawn in the digitizer to replace OSM's for this feature. `shape` is true lat/lng
 * (the import reads it); `shapeImagePoints` is where it sits on the PATS page, for the tool.
 */
type ShapeOverride = { shape?: Coordinate[]; shapeImagePoints?: [number, number][] };

export type BuildingEdit = BuildingLabel & ShapeOverride & { hidden?: boolean };
export type LotEdit = ShapeOverride & { id?: string; label?: string; hidden?: boolean };

export const TRACED_KINDS = [
  'academic',
  'administration',
  'misc',
  'greek',
  'residence',
  'apartment',
  'lot',
  'street',
  'walkway',
] as const;
export type TracedKind = (typeof TRACED_KINDS)[number];

export type TracedFeature = {
  /** Stable across edits, so renaming a shape in the digitizer does not duplicate it. */
  key: string;
  kind: TracedKind;
  name: string;
  abbreviation?: string;
  buildingCode?: string;
  /** For traced lots: a `PARKING_LOT_IDS` value, so the permit rules apply to it. */
  lotId?: string;
  points: Coordinate[];
  /** Where the shape sits on the PATS page, as [u, v] fractions. Only the digitizer reads it. */
  imagePoints?: [number, number][];
};

export type MapEdits = {
  version: 1;
  osm: {
    buildings: Record<string, BuildingEdit>;
    lots: Record<string, LotEdit>;
  };
  traced: TracedFeature[];
};

export const EMPTY_EDITS: MapEdits = { version: 1, osm: { buildings: {}, lots: {} }, traced: [] };

const CLOSED_KINDS: readonly TracedKind[] = ['academic', 'administration', 'misc', 'greek', 'residence', 'apartment', 'lot'];

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

/**
 * Checks map-edits.json before the import trusts it. Errors name the offending entry, since
 * the file is written by a tool and read by a person only when something has gone wrong.
 */
export function parseEdits(raw: unknown): MapEdits {
  if (!isRecord(raw)) throw new Error('map-edits.json: expected a JSON object.');
  if (raw.version !== 1) {
    throw new Error(
      `map-edits.json: version ${String(raw.version)} is not one this import knows (expected 1). ` +
        'Update tools/osm/edits.ts alongside the digitizer.'
    );
  }

  const osm = isRecord(raw.osm) ? raw.osm : {};
  const buildings = isRecord(osm.buildings) ? osm.buildings : {};
  const lots = isRecord(osm.lots) ? osm.lots : {};
  for (const [wayId, entry] of [...Object.entries(buildings), ...Object.entries(lots)]) {
    if (!/^\d+$/.test(wayId)) throw new Error(`map-edits.json: "${wayId}" is not an OSM way id.`);
    if (!isRecord(entry)) throw new Error(`map-edits.json: the entry for way ${wayId} is not an object.`);
    if (entry.shape !== undefined) {
      if (!Array.isArray(entry.shape) || !entry.shape.every(isCoordinate)) {
        throw new Error(`map-edits.json: the outline for way ${wayId} has a point that is not { lat, lng } numbers.`);
      }
      if (entry.shape.length < 3) {
        throw new Error(
          `map-edits.json: the outline for way ${wayId} needs at least 3 points; it has ${entry.shape.length}.`
        );
      }
    }
  }

  const traced = Array.isArray(raw.traced) ? raw.traced : [];
  traced.forEach((entry, index) => {
    const where = `traced[${index}]`;
    if (!isRecord(entry)) throw new Error(`map-edits.json: ${where} is not an object.`);
    const name = typeof entry.name === 'string' ? entry.name : '';
    const label = name ? `"${name}" (${where})` : where;

    if (typeof entry.key !== 'string' || !entry.key) throw new Error(`map-edits.json: ${label} has no key.`);
    if (!TRACED_KINDS.includes(entry.kind as TracedKind)) {
      throw new Error(`map-edits.json: ${label} has kind "${String(entry.kind)}", which the import cannot place.`);
    }
    if (!Array.isArray(entry.points) || !entry.points.every(isCoordinate)) {
      throw new Error(`map-edits.json: ${label} has a point that is not { lat, lng } numbers.`);
    }
    const minimum = CLOSED_KINDS.includes(entry.kind as TracedKind) ? 3 : 2;
    if (entry.points.length < minimum) {
      throw new Error(`map-edits.json: ${label} needs at least ${minimum} points; it has ${entry.points.length}.`);
    }
  });

  return {
    version: 1,
    osm: {
      buildings: buildings as Record<string, BuildingEdit>,
      lots: lots as Record<string, LotEdit>,
    },
    traced: traced as TracedFeature[],
  };
}

/** Drops keys whose value is undefined, so results compare cleanly and print tidily. */
function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export type BuildingResolution =
  | { status: 'included'; label: BuildingLabel & { name: string }; shape?: Coordinate[] }
  | { status: 'unnamed' }
  | { status: 'excluded' }
  | { status: 'hidden' };

/** Decides whether an OSM building is drawn, and what it is called. */
export function resolveBuilding(
  way: { wayId: number; osmName: string },
  edits: MapEdits,
  labelsByName: Record<string, BuildingLabel>,
  excludedNames: readonly string[]
): BuildingResolution {
  const edit = edits.osm.buildings[String(way.wayId)];
  if (edit?.hidden) return { status: 'hidden' };

  const osmKey = way.osmName.trim().toLowerCase();
  const label = osmKey ? labelsByName[osmKey] : undefined;
  const name = edit?.name?.trim() || label?.name || way.osmName.trim();
  if (!name) return { status: 'unnamed' };
  // Naming a building in the digitizer is a deliberate choice to show it, so it overrides the
  // not-a-UTA-facility list.
  if (!edit && excludedNames.includes(osmKey)) return { status: 'excluded' };

  return compact({
    status: 'included' as const,
    label: compact({
      name,
      abbreviation: edit?.abbreviation || label?.abbreviation,
      buildingCode: edit?.buildingCode || label?.buildingCode,
      category: edit?.category ?? label?.category,
    }),
    shape: edit?.shape,
  });
}

export type LotResolution =
  | { status: 'included'; id?: string; label: string; claimed: boolean; shape?: Coordinate[] }
  | { status: 'skipped' }
  | { status: 'hidden' };

type LotLabel = { id: string; label: string };

/**
 * Decides whether an OSM parking area is drawn, and which PATS lot it is. `claimed` means
 * someone identified it by hand, which is what lets an off-campus lot (the remote park and
 * ride) in without dragging along every apartment and church lot nearby.
 */
export function resolveLot(
  way: { wayId: number; osmName: string; onCampus: boolean },
  edits: MapEdits,
  labelsByWay: Record<number, LotLabel>,
  labelsByName: Record<string, LotLabel>
): LotResolution {
  const edit = edits.osm.lots[String(way.wayId)];
  if (edit?.hidden) return { status: 'hidden' };

  const byWay = labelsByWay[way.wayId];
  const byName = labelsByName[way.osmName.trim().toLowerCase()];
  const claimedByEdit = Boolean(edit?.id);
  if (!claimedByEdit && !byWay && !way.onCampus) return { status: 'skipped' };

  const id = edit?.id || byWay?.id || byName?.id;
  const label = edit?.label?.trim() || byWay?.label || byName?.label || way.osmName.trim();
  return compact({
    status: 'included' as const,
    id,
    label,
    claimed: claimedByEdit || Boolean(byWay),
    shape: edit?.shape,
  });
}

export type TracedPoi = {
  idBase: string;
  name: string;
  category: PoiCategory;
  abbreviation?: string;
  buildingCode?: string;
  coordinate: Coordinate;
  footprint: Coordinate[];
};
export type TracedLot = { idBase: string; label: string; coordinate: Coordinate; footprint: Coordinate[] };
export type TracedStreet = { idBase: string; name: string; path: Coordinate[] };

/**
 * Sorts traced shapes into the app's layers. Ids are bases; the import runs them through the
 * same collision check as OSM's, so a traced building can never clash with an imported one.
 */
export function tracedFeatures(traced: TracedFeature[]) {
  const pois: TracedPoi[] = [];
  const lots: TracedLot[] = [];
  const streets: TracedStreet[] = [];
  const walkways: TracedFeature[] = [];

  for (const feature of traced) {
    const name = feature.name.trim();
    switch (feature.kind) {
      case 'academic':
      case 'administration':
      case 'misc':
      case 'greek':
      case 'residence':
      case 'apartment':
        pois.push(
          compact({
            idBase: `${feature.kind}-${slugify(name)}`,
            name,
            category: feature.kind,
            abbreviation: feature.abbreviation || undefined,
            buildingCode: feature.buildingCode || undefined,
            coordinate: polygonCenter(feature.points),
            footprint: feature.points,
          })
        );
        break;
      case 'lot':
        lots.push({
          idBase: feature.lotId || `lot-traced-${slugify(name)}`,
          label: name,
          coordinate: polygonCenter(feature.points),
          footprint: feature.points,
        });
        break;
      case 'street':
        streets.push({ idBase: `street-${slugify(name)}`, name, path: feature.points });
        break;
      case 'walkway':
        walkways.push(feature);
        break;
    }
  }
  return { pois, lots, streets, walkways };
}

/**
 * Turns traced walkways into OSM-shaped ways so they go through the same graph build as OSM's.
 *
 * Joining happens here, on raw OSM nodes, **before** buildWalkwayGraph collapses the chains.
 * A traced vertex within `snapMeters` of an existing node reuses that node, which makes it a
 * junction. So a traced shortcut connects to the network without anyone having to split an
 * edge. New points get negative ids, which OSM never uses, and are added to `coordinates`.
 *
 * A path that reaches nothing stays an island, and largestComponent drops it. The import
 * report says so, so the fix is to extend the trace.
 */
export function stitchTracedWalkways(
  walkways: TracedFeature[],
  coordinates: Map<number, Coordinate>,
  snapMeters: number
): { ways: OsmWay[] } {
  const osmNodes = [...coordinates.entries()];
  const tracedNodes: [number, Coordinate][] = [];
  let nextNodeId = -1;
  let nextWayId = -1;

  const nearest = (point: Coordinate, pool: [number, Coordinate][]) => {
    let best: { id: number; meters: number } | null = null;
    for (const [id, coordinate] of pool) {
      const meters = distanceMeters(point, coordinate);
      if (meters <= snapMeters && (!best || meters < best.meters)) best = { id, meters };
    }
    return best;
  };

  const ways: OsmWay[] = walkways.map((walkway) => {
    // Only *earlier* paths are snap targets. A path's own vertices can sit closer together
    // than snapMeters, and snapping to them would fold the path onto itself.
    const earlierTraced = [...tracedNodes];
    const nodes: number[] = [];
    for (const point of walkway.points) {
      // Traced first: two traced paths meeting should share a point exactly.
      const snapped = nearest(point, earlierTraced) ?? nearest(point, osmNodes);
      let id: number;
      if (snapped) {
        id = snapped.id;
      } else {
        id = nextNodeId--;
        coordinates.set(id, point);
        tracedNodes.push([id, point]);
      }
      // Two vertices snapping to the same node would make a zero-length segment.
      if (nodes[nodes.length - 1] !== id) nodes.push(id);
    }
    return { id: nextWayId--, nodes, tags: { highway: 'footway', name: walkway.name } };
  });

  return { ways };
}

// ---- grouping ---------------------------------------------------------------------------------

/**
 * One outline of a building, from OSM or the digitizer. Several outlines with the same name are
 * one building: the Aerodynamics Research Building is two OSM ways side by side, and UTA does not
 * tell them apart, so neither does the app.
 */
export type BuildingPart = {
  name: string;
  category: PoiCategory;
  abbreviation?: string;
  buildingCode?: string;
  footprint: Coordinate[];
  /** Where the part came from ("way 123", 'traced "X"'), for the report. */
  source: string;
};

export type BuildingGroup = {
  idBase: string;
  name: string;
  category: PoiCategory;
  abbreviation?: string;
  buildingCode?: string;
  coordinate: Coordinate;
  footprints: Coordinate[][];
  sources: string[];
};

/** Keeps the first non-empty value of each field, and records any later part that disagrees. */
function mergeDetails<Field extends string>(
  what: string,
  parts: ({ source: string } & Partial<Record<Field, string>>)[],
  fields: Field[],
  conflicts: string[]
): Partial<Record<Field, string>> {
  const merged: Partial<Record<Field, string>> = {};
  const from: Partial<Record<Field, string>> = {};
  for (const part of parts) {
    for (const field of fields) {
      const value = part[field];
      if (value === undefined || value === '') continue;
      if (merged[field] === undefined) {
        merged[field] = value;
        from[field] = part.source;
      } else if (merged[field] !== value) {
        conflicts.push(`${what}: ${field} "${merged[field]}" (${from[field]}) vs "${value}" (${part.source})`);
      }
    }
  }
  return merged;
}

/** Same name (ignoring case and edge spaces) means same building. Keeps first-seen order. */
export function groupBuildings(parts: BuildingPart[]): { groups: BuildingGroup[]; conflicts: string[] } {
  const byKey = new Map<string, BuildingPart[]>();
  for (const part of parts) {
    const key = part.name.trim().toLowerCase();
    const members = byKey.get(key) ?? [];
    members.push(part);
    byKey.set(key, members);
  }

  const conflicts: string[] = [];
  const groups = [...byKey.values()].map((members) => {
    const name = members[0].name.trim();
    const details = mergeDetails(name, members, ['abbreviation', 'buildingCode', 'category'], conflicts);
    const category = (details.category as PoiCategory | undefined) ?? members[0].category;
    const footprints = members.map((member) => member.footprint);
    return compact({
      idBase: `${category}-${slugify(name)}`,
      name,
      category,
      abbreviation: details.abbreviation,
      buildingCode: details.buildingCode,
      coordinate: groupCenter(footprints),
      footprints,
      sources: members.map((member) => member.source),
    });
  });
  return { groups, conflicts };
}

/** One outline of a parking area. */
export type LotPart = {
  /** The PATS lot id. Absent while nobody has identified it. */
  id?: string;
  label: string;
  footprint: Coordinate[];
  /** The id the part gets on its own when it has none (`lot-osm-<way>`). */
  fallbackId: string;
  source: string;
};

export type LotGroup = {
  idBase: string;
  label: string;
  coordinate: Coordinate;
  footprints: Coordinate[][];
  sources: string[];
};

/**
 * Same lot id means same lot, so the permit rule covers every outline of it. Before this, a
 * second outline given the same id became `lot-49-2`, which no rule knows. Parts nobody has
 * identified never merge: sharing "no id" says nothing about being one lot.
 */
export function groupLots(parts: LotPart[]): { groups: LotGroup[]; conflicts: string[] } {
  const byKey = new Map<string, LotPart[]>();
  parts.forEach((part, index) => {
    const key = part.id ? `id:${part.id}` : `part:${index}`;
    const members = byKey.get(key) ?? [];
    members.push(part);
    byKey.set(key, members);
  });

  const conflicts: string[] = [];
  const groups = [...byKey.values()].map((members) => {
    const idBase = members[0].id ?? members[0].fallbackId;
    const details = mergeDetails(idBase, members, ['label'], conflicts);
    const footprints = members.map((member) => member.footprint);
    return {
      idBase,
      label: details.label ?? '',
      coordinate: groupCenter(footprints),
      footprints,
      sources: members.map((member) => member.source),
    };
  });
  return { groups, conflicts };
}
