/**
 * Regenerates the campus map data in src/data/ from OpenStreetMap.
 *
 *   npm run import:osm            # uses the cached Overpass responses when present
 *   npm run import:osm -- --refresh   # re-queries Overpass
 *
 * Writes campus-pois.ts, campus-lots.ts, campus-streets.ts, campus-walkways.ts and
 * campus-extent.ts. Never writes the two hand-maintained inputs: src/data/map-labels.ts
 * (names, abbreviations, building codes, lot identities) and src/data/map-edits.json (what the
 * Campus Digitizer labeled and traced). Re-running this is safe.
 *
 * Also builds the indoor graph from src/data/indoor-edits.json (the Indoor Digitizer's output)
 * into campus-indoor.ts, joined to the walkways at each building entrance.
 *
 * Also writes tools/osm/cache/digitizer-base.json, the data both digitizers load.
 *
 * Source data is (c) OpenStreetMap contributors, ODbL. The generated files carry that notice.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PARKING_LOT_IDS } from '../../src/constants/parking-permits.ts';
import {
  BUILDING_LABELS,
  EXCLUDED_BUILDING_NAMES,
  LOT_LABELS_BY_NAME,
  LOT_LABELS_BY_WAY,
} from '../../src/data/map-labels.ts';
import { distanceMeters } from '../../src/routing/geo.ts';
import type { Coordinate, PoiCategory } from '../../src/types/map.ts';
import {
  EMPTY_EDITS,
  groupBuildings,
  groupLots,
  parseEdits,
  resolveBuilding,
  resolveLot,
  stitchTracedWalkways,
  tracedFeatures,
  type BuildingPart,
  type LotPart,
  type MapEdits,
} from './edits.ts';
import {
  EMPTY_INDOOR_EDITS,
  buildIndoorGraph,
  joinEntrances,
  listEntrances,
  floorPlansByPoi,
  mapOutlineFor,
  parseIndoorEdits,
  type IndoorEdits,
} from '../indoor/indoor.ts';
import {
  NODE_ID_PREFIX,
  buildWalkwayGraph,
  compactIds,
  largestComponent,
  polygonCenter,
  simplifyPath,
  slugify,
  type OsmWay,
} from './transform.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const CACHE_DIR = path.join(HERE, 'cache');
const DATA_DIR = path.join(REPO, 'src/data');
const EDITS_FILE = path.join(DATA_DIR, 'map-edits.json');
const INDOOR_EDITS_FILE = path.join(DATA_DIR, 'indoor-edits.json');
const DIGITIZER_DIR = path.join(REPO, 'tools/digitizer');

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'mavigator-cse3311-classproject/1.0';

/** OSM way for UTA's campus boundary; it decides what counts as on-campus. */
const CAMPUS_WAY_ID = 445352238;
/**
 * How far off campus a home still counts as "nearby" for US-04 start points. It also sets how
 * far the walkway graph reaches (see WALKWAY_BUFFER_METERS), so raising it grows the graph
 * quickly: 400 m pulled in one more apartment building at the cost of 60% more nodes. At 150 m
 * every campus apartment and residence hall is still included.
 */
const NEARBY_APARTMENT_METERS = 150;
/** Everything drawn gets thinned to this tolerance; about a pace. */
const SIMPLIFY_METERS = 1.2;
/**
 * Walkway edge shapes are only ever drawn, never measured against -- edge length is summed
 * before thinning -- so they tolerate a coarser pass. At campus zoom this is well under a
 * pixel, and it is what keeps the generated graph a sane size for Metro to parse.
 */
const WALKWAY_SIMPLIFY_METERS = 2.5;
/**
 * How far past the campus edge the routing graph reaches. It must be at least
 * NEARBY_APARTMENT_METERS: anything offered as a start point has to be able to reach the
 * graph, and a home 400 m off campus with sidewalks only mapped to 120 m cannot be routed
 * from. Widening this is what makes "every drawn place is routable" true by construction.
 */
const WALKWAY_BUFFER_METERS = NEARBY_APARTMENT_METERS;
/** Streets are decoration only, so they may run a little further out than the graph does. */
const STREET_BUFFER_METERS = 160;
/** Widen the query box past the campus edge so buffered apartments are included. */
const QUERY_PADDING_DEGREES = 0.006;
/**
 * A traced walkway vertex this close to an OSM sidewalk point joins it. Generous enough to
 * forgive a click on the drawn map, tight enough that a path beside a sidewalk stays separate.
 * The digitizer draws the same ring, so what you see while tracing is what the import does.
 */
const WALKWAY_SNAP_METERS = 12;
/** How far a traced building entrance may be from the nearest walkway point and still join it. */
const ENTRANCE_REACH_METERS = 30;
/** Must match MAX_SNAP_METERS in src/data/__tests__/campus-data.test.ts. */
const MAX_SNAP_METERS = 80;

/** Retry budget for the shared Overpass server's 429/504 responses. */
const MAX_ATTEMPTS = 5;
const RETRY_BASE_SECONDS = 20;
/** Breathing room between queries, so we do not trip the rate limit in the first place. */
const BETWEEN_QUERIES_MS = 3_000;

const refresh = process.argv.includes('--refresh');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
};

async function overpass(name: string, query: string): Promise<OsmElement[]> {
  await mkdir(CACHE_DIR, { recursive: true });
  const cacheFile = path.join(CACHE_DIR, `${name}.json`);

  if (!refresh) {
    try {
      const cached = await readFile(cacheFile, 'utf8');
      console.log(`  ${name}: cached`);
      return JSON.parse(cached).elements;
    } catch {
      // No cache yet; fall through and query.
    }
  }

  await sleep(BETWEEN_QUERIES_MS);

  process.stdout.write(`  ${name}: querying Overpass... `);

  // overpass-api.de is a free shared server: it answers 429 when too many queries arrive at
  // once and 504 when one takes too long. Both clear up on their own, so back off and retry
  // rather than making the operator's day worse.
  let lastStatus = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'text/plain' },
      body: query,
    });

    if (response.ok) {
      const body = await response.text();
      await writeFile(cacheFile, body);
      console.log('ok');
      return JSON.parse(body).elements;
    }

    lastStatus = response.status;
    if (response.status !== 429 && response.status !== 504) break;
    if (attempt === MAX_ATTEMPTS) break;

    const waitSeconds = RETRY_BASE_SECONDS * attempt;
    process.stdout.write(`${response.status}, waiting ${waitSeconds}s... `);
    await sleep(waitSeconds * 1000);
  }

  throw new Error(
    `Overpass returned ${lastStatus} for "${name}" after ${MAX_ATTEMPTS} attempts. ` +
      'It is a free shared server -- wait a few minutes and run again; finished queries are cached.'
  );
}

const toCoordinate = (p: { lat: number; lon: number }): Coordinate => ({ lat: p.lat, lng: p.lon });
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function isInsidePolygon(point: Coordinate, ring: Coordinate[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const intersects =
      ring[i].lat > point.lat !== ring[j].lat > point.lat &&
      point.lng <
        ((ring[j].lng - ring[i].lng) * (point.lat - ring[i].lat)) / (ring[j].lat - ring[i].lat) +
          ring[i].lng;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a polygon's edge, or 0 when the point is inside it. */
function distanceToPolygonMeters(point: Coordinate, ring: Coordinate[]): number {
  if (isInsidePolygon(point, ring)) return 0;
  let nearest = Infinity;
  for (const vertex of ring) nearest = Math.min(nearest, distanceMeters(point, vertex));
  return nearest;
}

function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
}

function categoryFor(tags: Record<string, string>, label?: PoiCategory): PoiCategory {
  if (label) return label;
  const building = tags.building ?? '';
  if (building === 'dormitory') return 'residence';
  if (building === 'apartments' || building === 'residential') return 'apartment';
  return 'academic';
}

/** map-edits.json is optional: without it the import behaves exactly as it did before. */
async function loadEdits(): Promise<MapEdits> {
  let text: string;
  try {
    text = await readFile(EDITS_FILE, 'utf8');
  } catch {
    return EMPTY_EDITS;
  }
  return parseEdits(JSON.parse(text));
}

/** indoor-edits.json is optional too: without it there is simply no indoor graph. */
async function loadIndoorEdits(): Promise<IndoorEdits> {
  let text: string;
  try {
    text = await readFile(INDOOR_EDITS_FILE, 'utf8');
  } catch {
    return EMPTY_INDOOR_EDITS;
  }
  return parseIndoorEdits(JSON.parse(text));
}

const round6Point = (c: Coordinate): [number, number] => [round6(c.lat), round6(c.lng)];

// ---- code generation -------------------------------------------------------

const BANNER = `/**
 * GENERATED FILE -- do not edit by hand. Rebuild with \`npm run import:osm\`.
 * Hand-maintained names, abbreviations and lot ids live in src/data/map-labels.ts.
 *
 * Geometry (c) OpenStreetMap contributors, made available under the Open Database
 * License (ODbL). https://www.openstreetmap.org/copyright
 */`;

const fmtCoordinate = (c: Coordinate) => `{ lat: ${round6(c.lat)}, lng: ${round6(c.lng)} }`;

/** Single-quoted, to match the repo's lint style rather than JSON's double quotes. */
const fmtString = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function fmtPath(coordinates: Coordinate[], indent: string): string {
  return coordinates.map((c) => `${indent}${fmtCoordinate(c)},`).join('\n');
}

/** Several outlines, one per nested array, each point on its own line like fmtPath. */
function fmtOutlines(outlines: Coordinate[][], indent: string): string {
  const inner = outlines.map((outline) => `${indent}  [\n${fmtPath(outline, indent + '    ')}\n${indent}  ],`);
  return `[\n${inner.join('\n')}\n${indent}]`;
}

/** Drops empty optional fields, so a part never claims an abbreviation of "". */
function compactPart(part: BuildingPart): BuildingPart {
  return Object.fromEntries(
    Object.entries(part).filter(([, value]) => value !== undefined && value !== '')
  ) as BuildingPart;
}

// ---- main ------------------------------------------------------------------

async function main() {
  console.log('Fetching from OpenStreetMap');

  const campusElements = await overpass(
    'campus-boundary',
    `[out:json][timeout:120];way(${CAMPUS_WAY_ID});out geom;`
  );
  const campusRing = (campusElements[0]?.geometry ?? []).map(toCoordinate);
  if (campusRing.length === 0) throw new Error('Campus boundary came back empty.');

  const lats = campusRing.map((c) => c.lat);
  const lngs = campusRing.map((c) => c.lng);
  const box = [
    Math.min(...lats) - QUERY_PADDING_DEGREES,
    Math.min(...lngs) - QUERY_PADDING_DEGREES,
    Math.max(...lats) + QUERY_PADDING_DEGREES,
    Math.max(...lngs) + QUERY_PADDING_DEGREES,
  ]
    .map((n) => n.toFixed(6))
    .join(',');

  const buildings = await overpass(
    'buildings',
    `[out:json][timeout:180];way["building"](${box});out geom;`
  );
  const parking = await overpass(
    'parking',
    `[out:json][timeout:180];way["amenity"="parking"](${box});out geom;`
  );
  const roads = await overpass(
    'roads',
    `[out:json][timeout:180];way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$"]["name"](${box});out geom;`
  );
  const walkwayElements = await overpass(
    'walkways',
    `[out:json][timeout:240];(way["highway"~"^(footway|path|steps|pedestrian|living_street|service|residential|unclassified|tertiary)$"](${box}););(._;>;);out body;`
  );

  const edits = await loadEdits();
  const traced = tracedFeatures(edits.traced);
  const indoorEdits = await loadIndoorEdits();

  const report: string[] = [];
  // Every coordinate that ends up drawn, so the map's bounding box covers all of it. Deriving
  // the box from the campus outline alone would clip the apartments just past the edge.
  const drawn: Coordinate[] = [];
  // Drawn places past the campus edge that someone chose by hand. The walkway graph has to
  // reach them too, or they would be drawn but impossible to route to.
  const offCampusAnchors: Coordinate[] = [];
  // Everything that must be routable, for the report's reachability check.
  const destinations: { label: string; coordinate: Coordinate }[] = [];
  // What the Campus Digitizer shows: every OSM building and lot in the query box, drawn or not.
  const digitizerBuildings: object[] = [];
  const digitizerLots: object[] = [];

  // ---- buildings -> POIs ----
  // Collected as parts first, then grouped: outlines that share a name are one building (the
  // two halves of the Aerodynamics Research Building, an apartment complex's blocks).
  const unnamedOnCampus: { id: number; center: Coordinate }[] = [];
  const matchedLabelKeys = new Set<string>();
  const buildingParts: BuildingPart[] = [];

  for (const way of buildings) {
    if (!way.geometry || way.geometry.length < 4) continue;
    const ring = way.geometry.map(toCoordinate);
    const center = polygonCenter(ring);
    const tags = way.tags ?? {};
    const rawName = (tags.name ?? '').trim();
    const key = rawName.toLowerCase();

    // Garages arrive through the lot layer; keeping them here too would double-draw them.
    if (tags.building === 'parking' || tags.amenity === 'parking') continue;

    const onCampus = isInsidePolygon(center, campusRing);
    const isHome = ['apartments', 'residential', 'dormitory'].includes(tags.building ?? '');
    const nearCampus =
      isHome && distanceToPolygonMeters(center, campusRing) <= NEARBY_APARTMENT_METERS;
    const editedByHand = Boolean(edits.osm.buildings[String(way.id)]);
    const osmFootprint = simplifyPath(ring, SIMPLIFY_METERS);

    const resolution =
      onCampus || nearCampus || editedByHand
        ? resolveBuilding({ wayId: way.id, osmName: rawName }, edits, BUILDING_LABELS, EXCLUDED_BUILDING_NAMES)
        : ({ status: 'offCampus' } as const);

    // The digitizer always gets OSM's own outline, so it can offer "Reset to OSM shape".
    digitizerBuildings.push({
      way: way.id,
      osmName: rawName || undefined,
      building: tags.building,
      status: resolution.status,
      ...(resolution.status === 'included'
        ? { ...resolution.label, category: categoryFor(tags, resolution.label.category) }
        : {}),
      ring: osmFootprint.map(round6Point),
    });

    if (resolution.status === 'unnamed' && onCampus) unnamedOnCampus.push({ id: way.id, center });
    if (resolution.status !== 'included') continue;

    const label = resolution.label;
    if (BUILDING_LABELS[key]) matchedLabelKeys.add(key);
    // A reshaped outline from the digitizer replaces OSM's; the labels stay.
    const footprint = resolution.shape ? simplifyPath(resolution.shape, SIMPLIFY_METERS) : osmFootprint;
    // Nearby apartments are already inside the walkway buffer (it follows
    // NEARBY_APARTMENT_METERS); only a building named by hand can sit further out.
    if (!onCampus && !nearCampus) offCampusAnchors.push(polygonCenter(footprint));

    buildingParts.push(
      compactPart({
        name: label.name,
        category: categoryFor(tags, label.category),
        abbreviation: label.abbreviation,
        buildingCode: label.buildingCode,
        footprint,
        source: `way ${way.id}`,
      })
    );
  }

  // Buildings OSM does not have at all, traced in the digitizer against the PATS map.
  for (const poi of traced.pois) {
    if (!isInsidePolygon(poi.coordinate, campusRing)) offCampusAnchors.push(poi.coordinate);
    buildingParts.push(
      compactPart({
        name: poi.name,
        category: poi.category,
        abbreviation: poi.abbreviation,
        buildingCode: poi.buildingCode,
        footprint: simplifyPath(poi.footprint, SIMPLIFY_METERS),
        source: `traced "${poi.name}"`,
      })
    );
  }

  const buildingGroups = groupBuildings(buildingParts);
  const takenPoiIds = new Set<string>();
  const unlabeledBuildings: string[] = [];
  const poiIdByAbbreviation = new Map<string, string>();
  // "way 123" -> POI id, so the digitizers can name a building that has no abbreviation.
  const poiIdBySource = new Map<string, string>();
  const mapOutlines: string[] = [];
  const pois = buildingGroups.groups.map((group) => {
    const id = uniqueId(group.idBase, takenPoiIds);
    if (group.abbreviation) poiIdByAbbreviation.set(group.abbreviation, id);
    for (const source of group.sources) poiIdBySource.set(source, id);
    // A floor outline the Indoor Digitizer marked for the map replaces the building's shape.
    const mapRing = mapOutlineFor(indoorEdits, [group.abbreviation, id]);
    const footprints = mapRing ? [simplifyPath(mapRing, SIMPLIFY_METERS)] : group.footprints;
    const coordinate = mapRing ? polygonCenter(footprints[0]) : group.coordinate;
    if (mapRing) mapOutlines.push(`${group.name} (${id}): ${group.footprints.length} outline(s) replaced`);
    for (const outline of footprints) drawn.push(...outline);
    destinations.push({ label: `${group.name} (${id})`, coordinate });
    if (!group.abbreviation) unlabeledBuildings.push(`${group.name} (${group.sources.join(', ')})`);

    const lines = [
      '  {',
      `    id: '${id}',`,
      `    name: ${fmtString(group.name)},`,
      `    category: '${group.category}',`,
    ];
    if (group.abbreviation) lines.push(`    abbreviation: ${fmtString(group.abbreviation)},`);
    if (group.buildingCode) lines.push(`    buildingCode: ${fmtString(group.buildingCode)},`);
    lines.push(`    coordinate: ${fmtCoordinate(coordinate)},`);
    lines.push(`    footprints: ${fmtOutlines(footprints, '    ')},`);
    lines.push('  },');
    return lines.join('\n');
  });
  const poiCount = pois.length;

  await writeFile(
    path.join(DATA_DIR, 'campus-pois.ts'),
    `import type { PointOfInterest } from '@/types/map';\n\n${BANNER}\nexport const CAMPUS_POIS: PointOfInterest[] = [\n${pois.join('\n')}\n];\n`
  );

  // ---- parking -> lots ----
  // Same idea: every outline given the same lot id is one lot, so its permit rule covers all
  // of them. Lots nobody has identified stay apart.
  const unnamedLots: { id: number; center: Coordinate }[] = [];
  const lotParts: LotPart[] = [];

  for (const way of parking) {
    if (!way.geometry || way.geometry.length < 4) continue;
    const ring = way.geometry.map(toCoordinate);
    const center = polygonCenter(ring);
    const tags = way.tags ?? {};
    const onCampus = isInsidePolygon(center, campusRing);
    const osmFootprint = simplifyPath(ring, SIMPLIFY_METERS);

    // Campus lots only, unless the lot has been claimed by hand (the digitizer, or
    // LOT_LABELS_BY_WAY in map-labels.ts). That is how the remote park and ride lots get in
    // without dragging along every apartment and church lot in the neighborhood.
    const resolution = resolveLot(
      { wayId: way.id, osmName: tags.name ?? '', onCampus },
      edits,
      LOT_LABELS_BY_WAY,
      LOT_LABELS_BY_NAME
    );

    digitizerLots.push({
      way: way.id,
      osmName: (tags.name ?? '').trim() || undefined,
      status: resolution.status === 'included' ? (resolution.id ? 'identified' : 'unidentified') : resolution.status,
      ...(resolution.status === 'included' ? { id: resolution.id, label: resolution.label } : {}),
      ring: osmFootprint.map(round6Point),
    });

    if (resolution.status !== 'included') continue;
    if (!resolution.id) unnamedLots.push({ id: way.id, center });
    const footprint = resolution.shape ? simplifyPath(resolution.shape, SIMPLIFY_METERS) : osmFootprint;
    if (!onCampus) offCampusAnchors.push(polygonCenter(footprint));

    lotParts.push({
      id: resolution.id,
      label: resolution.label,
      footprint,
      fallbackId: `lot-osm-${way.id}`,
      source: `way ${way.id}`,
    });
  }

  // Lots OSM does not have, traced in the digitizer.
  for (const lot of traced.lots) {
    if (!isInsidePolygon(lot.coordinate, campusRing)) offCampusAnchors.push(lot.coordinate);
    const identified = lot.idBase.startsWith('lot-traced-') ? undefined : lot.idBase;
    lotParts.push({
      id: identified,
      label: lot.label,
      footprint: simplifyPath(lot.footprint, SIMPLIFY_METERS),
      fallbackId: lot.idBase,
      source: `traced "${lot.label}"`,
    });
  }

  const lotGroups = groupLots(lotParts);
  const takenLotIds = new Set<string>();
  const lots = lotGroups.groups.map((group) => {
    const id = uniqueId(group.idBase, takenLotIds);
    for (const outline of group.footprints) drawn.push(...outline);
    destinations.push({ label: `${group.label || 'unlabeled lot'} (${id})`, coordinate: group.coordinate });
    return [
      '  {',
      `    id: '${id}',`,
      `    label: ${fmtString(group.label)},`,
      `    coordinate: ${fmtCoordinate(group.coordinate)},`,
      `    footprints: ${fmtOutlines(group.footprints, '    ')},`,
      '  },',
    ].join('\n');
  });
  const lotCount = lots.length;

  await writeFile(
    path.join(DATA_DIR, 'campus-lots.ts'),
    `import type { CampusLot } from '@/types/map';\n\n${BANNER}\nexport const CAMPUS_LOTS: CampusLot[] = [\n${lots.join('\n')}\n];\n`
  );

  // ---- roads -> streets (visual only) ----
  const takenStreetIds = new Set<string>();
  const streets: string[] = [];
  const digitizerStreets: object[] = [];
  const emitStreet = (idBase: string, name: string, line: Coordinate[]) => {
    const id = uniqueId(idBase, takenStreetIds);
    const path = simplifyPath(line, SIMPLIFY_METERS);
    drawn.push(...line);
    digitizerStreets.push({ name, path: path.map(round6Point) });
    streets.push(
      [
        '  {',
        `    id: '${id}',`,
        `    name: ${fmtString(name)},`,
        '    path: [',
        fmtPath(path, '      '),
        '    ],',
        '  },',
      ].join('\n')
    );
  };

  for (const way of roads) {
    if (!way.geometry || way.geometry.length < 2) continue;
    // Same clipping reason as the walkways: keep the stretch that runs past campus, not the
    // whole road out to the county line.
    const line = way.geometry
      .map(toCoordinate)
      .filter((point) => distanceToPolygonMeters(point, campusRing) <= STREET_BUFFER_METERS);
    if (line.length < 2) continue;

    const name = (way.tags?.name ?? '').trim();
    emitStreet(`street-${slugify(name)}`, name, line);
  }
  for (const street of traced.streets) emitStreet(street.idBase, street.name, street.path);

  await writeFile(
    path.join(DATA_DIR, 'campus-streets.ts'),
    `import type { CampusStreet } from '@/types/map';\n\n${BANNER}\nexport const CAMPUS_STREETS: CampusStreet[] = [\n${streets.join('\n')}\n];\n`
  );

  // ---- walkways -> routing graph ----
  const nodeCoordinates = new Map<number, Coordinate>();
  const walkwayWays: OsmWay[] = [];
  for (const element of walkwayElements) {
    if (element.type === 'node' && element.lat !== undefined && element.lon !== undefined) {
      nodeCoordinates.set(element.id, { lat: element.lat, lng: element.lon });
    } else if (element.type === 'way' && element.nodes) {
      walkwayWays.push({ id: element.id, nodes: element.nodes, tags: element.tags });
    }
  }

  // Clip to campus by dropping distant *nodes* rather than distant ways. Filtering whole ways
  // would keep every mile of a service road that happens to touch the campus edge, which both
  // bloats the graph and stretches the map's bounding box far past anything worth showing.
  // buildWalkwayGraph skips any segment missing an endpoint, so this trims mid-way cleanly.
  //
  // Hand-picked places past the edge (a claimed remote lot, a traced apartment) widen the
  // reach around themselves, for the same every-drawn-place-is-routable reason.
  const nearbyCoordinates = new Map<number, Coordinate>();
  for (const [id, coordinate] of nodeCoordinates) {
    const nearCampus = distanceToPolygonMeters(coordinate, campusRing) <= WALKWAY_BUFFER_METERS;
    const nearAnchor =
      !nearCampus &&
      offCampusAnchors.some((anchor) => distanceMeters(anchor, coordinate) <= WALKWAY_BUFFER_METERS);
    if (nearCampus || nearAnchor) nearbyCoordinates.set(id, coordinate);
  }

  // Walkways traced in the digitizer join the OSM ones here, before the graph is built, so
  // they collapse, trim and renumber exactly like everything else.
  const { ways: tracedWays } = stitchTracedWalkways(traced.walkways, nearbyCoordinates, WALKWAY_SNAP_METERS);
  // Building entrances from the Indoor Digitizer join the same way, so each is a real node.
  const entrances = joinEntrances(listEntrances(indoorEdits), nearbyCoordinates, ENTRANCE_REACH_METERS);

  const rawGraph = buildWalkwayGraph([...walkwayWays, ...tracedWays, ...entrances.ways], nearbyCoordinates);
  const trimmed = largestComponent(rawGraph);
  const { droppedComponents, droppedNodeCount } = trimmed;
  const { graph, originalNodeIds } = compactIds(trimmed.graph);

  // ---- indoor graph ----
  const shortIdOf = new Map([...originalNodeIds].map(([shortId, original]) => [original, shortId]));
  const entranceNodeIds = new Map<string, string>();
  for (const [key, rawId] of entrances.rawIds) {
    const shortId = shortIdOf.get(`${NODE_ID_PREFIX}${rawId}`);
    if (shortId) entranceNodeIds.set(key, shortId);
  }
  // indoor-edits.json keys a building by abbreviation, or by POI id when it has none.
  const poiIdByKey = new Map([
    ...[...poiIdBySource.values()].map((id) => [id, id] as const),
    ...poiIdByAbbreviation,
  ]);
  const entranceOf = new Map<string, string>();
  for (const entrance of listEntrances(indoorEdits)) {
    const nodeId = entranceNodeIds.get(entrance.key);
    const poiId = poiIdByKey.get(entrance.building);
    if (nodeId && poiId) entranceOf.set(nodeId, poiId);
  }
  const indoorRaw = buildIndoorGraph(indoorEdits, poiIdByKey, entranceNodeIds);
  // Indoor pieces no entrance reaches could never be routed to; drop them like any island.
  const reachable = largestComponent({
    nodes: [...graph.nodes, ...indoorRaw.nodes],
    edges: [...graph.edges, ...indoorRaw.edges.map((edge) => ({ ...edge, path: [] }))],
  }).graph;
  const keptNodeIds = new Set(reachable.nodes.map((node) => node.id));
  const indoorNodes = indoorRaw.nodes.filter((node) => keptNodeIds.has(node.id));
  const indoorEdges = indoorRaw.edges.filter((edge) => keptNodeIds.has(edge.fromNodeId));
  const indoorDropped = indoorRaw.nodes.length - indoorNodes.length;

  const indoorNodeLines = indoorNodes.map((node) => {
    const room = node.room ? `, room: ${fmtString(node.room)}` : '';
    const connector = node.connector ? `, connector: '${node.connector}'` : '';
    const inside = node.inside ? `, inside: ${fmtString(node.inside)}` : '';
    const restroom = node.restroom ? `, restroom: '${node.restroom}'` : '';
    return (
      `  { id: '${node.id}', coordinate: ${fmtCoordinate(node.coordinate)}, ` +
      `poiId: '${node.poiId}', level: ${fmtString(node.level!)}${room}${connector}${inside}${restroom} },`
    );
  });
  const round = (meters: number) => Math.round(meters * 100) / 100;
  const indoorEdgeLines = indoorEdges.map(
    (edge) =>
      `  { id: '${edge.id}', fromNodeId: '${edge.fromNodeId}', toNodeId: '${edge.toNodeId}', ` +
      `distanceMeters: ${round(edge.distanceMeters)}, ` +
      (edge.costMeters !== undefined ? `costMeters: ${round(edge.costMeters)}, ` : '') +
      (edge.area ? 'area: true, ' : '') +
      'walkable: true },'
  );
  const arrayOf = (lines: string[]) => (lines.length > 0 ? `[\n${lines.join('\n')}\n]` : '[]');
  // One line per room, object, entrance and connector; a floor's outline on its own line.
  const floorPlans = floorPlansByPoi(indoorEdits, poiIdByKey);
  const fmtRing = (ring: Coordinate[]) => `[${ring.map(fmtCoordinate).join(', ')}]`;
  const listOf = (lines: string[]) => (lines.length > 0 ? `[\n${lines.join('\n')}\n      ]` : '[]');
  const floorPlanLines = Object.entries(floorPlans.plans).map(
    ([poiId, floors]) =>
      `  '${poiId}': {\n` +
      Object.entries(floors)
        .map(
          ([floor, plan]) =>
            `    ${fmtString(floor)}: {\n` +
            (plan.outline ? `      outline: ${fmtRing(plan.outline)},\n` : '') +
            `      rooms: ${listOf(
              plan.rooms.map(
                (room) =>
                  `        { ${room.room ? `room: ${fmtString(room.room)}, ` : ''}${room.use ? `use: '${room.use}', ` : ''}label: ${fmtCoordinate(room.label)}, ring: ${fmtRing(room.ring)} },`
              )
            )},\n` +
            `      solids: ${listOf(plan.solids.map((ring) => `        ${fmtRing(ring)},`))},\n` +
            `      objects: ${listOf(
              plan.objects.map(
                (object) =>
                  `        { kind: '${object.kind}', ${object.name ? `name: ${fmtString(object.name)}, ` : ''}at: ${fmtCoordinate(object.at)} },`
              )
            )},\n` +
            `      entrances: ${listOf(
              plan.entrances.map(
                (entrance) =>
                  `        { at: ${fmtCoordinate(entrance.at)}${entrance.accessible ? ', accessible: true' : ''}${entrance.exitOnly ? ', exitOnly: true' : ''} },`
              )
            )},\n` +
            `      connectors: ${listOf(plan.connectors.map((c) => `        { kind: '${c.kind}', at: ${fmtCoordinate(c.at)} },`))},\n` +
            '    },'
        )
        .join('\n') +
      '\n  },'
  );
  await writeFile(
    path.join(DATA_DIR, 'campus-indoor.ts'),
    `import type { IndoorFloorPlan, MapEdge, MapNode } from '@/types/map';\n\n` +
      `/**\n * GENERATED FILE -- do not edit by hand. Rebuild with \`npm run import:osm\`.\n` +
      ` * Built from src/data/indoor-edits.json, traced in the Indoor Digitizer.\n *\n` +
      ` * Indoor hallways, doors, stairs and elevators. Every node has a \`level\`; entrances are\n` +
      ` * edges from an outdoor walkway node (an \`n\` id) into a hallway.\n */\n` +
      `export const INDOOR_NODES: MapNode[] = ${arrayOf(indoorNodeLines)};\n\n` +
      `export const INDOOR_EDGES: MapEdge[] = ${arrayOf(indoorEdgeLines)};\n\n` +
      `/**\n * What the indoor map draws, by POI id then floor: the floor's own outline (else the\n` +
      ` * building's), room outlines with a spot for the number (a restroom's or stairwell's: its\n` +
      ` * letter), objects, entrances, and stairs and elevators with no outline on that floor.\n */\n` +
      `export const INDOOR_FLOOR_PLANS: Record<string, Record<string, IndoorFloorPlan>> = ` +
      `${floorPlanLines.length > 0 ? `{\n${floorPlanLines.join('\n')}\n}` : '{}'};\n`
  );

  const nodeLines = graph.nodes.map((node) => {
    const door = entranceOf.get(node.id);
    return `  { id: '${node.id}', coordinate: ${fmtCoordinate(node.coordinate)}${door ? `, entranceOf: '${door}'` : ''} },`;
  });
  // One line per edge: there are thousands, and the vertical form triples the file for no
  // added clarity -- these are generated rows, not code anyone reads top to bottom.
  const edgeLines = graph.edges.map((edge) => {
    const head =
      `  { id: '${edge.id}', fromNodeId: '${edge.fromNodeId}', toNodeId: '${edge.toNodeId}', ` +
      `distanceMeters: ${Math.round(edge.distanceMeters * 100) / 100}, walkable: true`;
    // A two-point path is just the two node coordinates, which the reader already has.
    const shape = simplifyPath(edge.path, WALKWAY_SIMPLIFY_METERS);
    if (shape.length <= 2) return `${head} },`;
    return `${head}, path: [${shape.map(fmtCoordinate).join(', ')}] },`;
  });

  await writeFile(
    path.join(DATA_DIR, 'campus-walkways.ts'),
    `import type { MapEdge, MapNode } from '@/types/map';\n\n${BANNER}\n` +
      `/**\n * The walkable outdoor graph. Only junctions are nodes: a run of shape points between two\n` +
      ` * junctions collapses into one edge, with the shape kept on \`edge.path\` for drawing.\n */\n` +
      `export const WALKWAY_NODES: MapNode[] = [\n${nodeLines.join('\n')}\n];\n\n` +
      `export const WALKWAY_EDGES: MapEdge[] = [\n${edgeLines.join('\n')}\n];\n`
  );

  // ---- extent ----
  const everyPoint: Coordinate[] = [
    ...drawn,
    ...graph.nodes.map((n) => n.coordinate),
    ...campusRing,
  ];
  const extent = {
    minLat: Math.min(...everyPoint.map((c) => c.lat)),
    maxLat: Math.max(...everyPoint.map((c) => c.lat)),
    minLng: Math.min(...everyPoint.map((c) => c.lng)),
    maxLng: Math.max(...everyPoint.map((c) => c.lng)),
  };
  const margin = 0.0008;
  await writeFile(
    path.join(DATA_DIR, 'campus-extent.ts'),
    `${BANNER}\n/** Bounding box of everything drawn, plus a small margin. */\nexport const CAMPUS_EXTENT = {\n` +
      `  minLat: ${round6(extent.minLat - margin)},\n` +
      `  maxLat: ${round6(extent.maxLat + margin)},\n` +
      `  minLng: ${round6(extent.minLng - margin)},\n` +
      `  maxLng: ${round6(extent.maxLng + margin)},\n} as const;\n`
  );

  // ---- digitizer base ----
  // Everything the Campus Digitizer overlays on the PATS map, in one file it can load. It is a
  // derived database (ODbL), so it stays in the gitignored cache like the raw responses.
  const readOptionalJson = async (file: string) => {
    try {
      return JSON.parse(await readFile(file, 'utf8'));
    } catch {
      return null;
    }
  };
  const digitizerBase = {
    about:
      'Campus Digitizer base data, written by `npm run import:osm`. Geometry (c) OpenStreetMap ' +
      'contributors, ODbL. Coordinates are [lat, lng].',
    generatedAt: new Date().toISOString(),
    campusRing: campusRing.map(round6Point),
    // poiId lets the Indoor Digitizer key a building that has no abbreviation.
    buildings: digitizerBuildings.map((b) => {
      const poiId = poiIdBySource.get(`way ${(b as { way: number }).way}`);
      return poiId ? { ...b, poiId } : b;
    }),
    lots: digitizerLots,
    streets: digitizerStreets,
    walkways: graph.edges.map((edge) => simplifyPath(edge.path, WALKWAY_SIMPLIFY_METERS).map(round6Point)),
    walkwaySnapMeters: WALKWAY_SNAP_METERS,
    parkingLotIds: Object.values(PARKING_LOT_IDS),
    edits,
    // The Indoor Digitizer loads this same file; this is its "start from the repo copy".
    indoor: indoorEdits,
    entranceReachMeters: ENTRANCE_REACH_METERS,
    georef: await readOptionalJson(path.join(DIGITIZER_DIR, 'georef-default.json')),
    legacy: await readOptionalJson(path.join(DIGITIZER_DIR, 'legacy-iteration1.json')),
  };
  await writeFile(path.join(CACHE_DIR, 'digitizer-base.json'), JSON.stringify(digitizerBase));

  // ---- report ----
  report.push('');
  report.push('=== Import summary ===');
  report.push(`buildings written : ${poiCount}`);
  report.push(`lots written      : ${lotCount}`);
  report.push(`streets written   : ${streets.length}`);
  report.push(`walkway nodes     : ${graph.nodes.length} (from ${rawGraph.nodes.length} before trimming)`);
  report.push(`walkway edges     : ${graph.edges.length}`);
  report.push(`dropped islands   : ${droppedComponents} components, ${droppedNodeCount} nodes`);
  report.push(
    `from map-edits    : ${Object.keys(edits.osm.buildings).length} building edit(s), ` +
      `${Object.keys(edits.osm.lots).length} lot edit(s), ${edits.traced.length} traced shape(s)`
  );
  report.push(
    `indoor            : ${indoorNodes.length} nodes, ${indoorEdges.length} edges ` +
      `across ${Object.keys(indoorEdits.buildings).length} building(s)`
  );
  report.push('');

  if (mapOutlines.length > 0) {
    report.push(`MAP OUTLINES -- ${mapOutlines.length} building(s) drawn with a floor outline from the Indoor Digitizer:`);
    for (const line of mapOutlines) report.push(`    ${line}`);
  }
  const indoorProblems = [...indoorRaw.problems, ...floorPlans.problems];
  if (indoorDropped > 0) {
    indoorProblems.push(`${indoorDropped} indoor node(s) no entrance reaches were dropped (trace an entrance, or join the hallways).`);
  }
  if (indoorProblems.length > 0) {
    report.push(`INDOOR -- ${indoorProblems.length} thing(s) in indoor-edits.json could not be placed:`);
    for (const line of indoorProblems) report.push(`    ${line}`);
    report.push('');
  }

  // Routing snaps to the nearest graph node, and the campus data test fails past
  // MAX_SNAP_METERS. Say which place is stranded before npm test does.
  const unroutable = destinations.filter(
    ({ coordinate }) =>
      !graph.nodes.some((node) => distanceMeters(node.coordinate, coordinate) <= MAX_SNAP_METERS)
  );
  if (unroutable.length > 0) {
    report.push(
      `UNROUTABLE -- ${unroutable.length} place(s) more than ${MAX_SNAP_METERS} m from any walkway. ` +
        'npm test will fail until each is fixed:'
    );
    report.push('  trace a walkway to it in the digitizer (start within the snap ring of a sidewalk).');
    for (const place of unroutable) {
      report.push(`    ${place.label}  // ${round6(place.coordinate.lat)}, ${round6(place.coordinate.lng)}`);
    }
    report.push('');
  }

  const staleLabels = Object.keys(BUILDING_LABELS).filter((key) => !matchedLabelKeys.has(key));
  if (staleLabels.length > 0) {
    report.push(`TO CHECK -- ${staleLabels.length} label(s) in map-labels.ts matched no OSM building.`);
    report.push('  Either the OSM name differs or OSM has it unnamed (look for it below):');
    for (const key of staleLabels) report.push(`    ${key}`);
    report.push('');
  }

  const grouped = [
    ...buildingGroups.groups.filter((g) => g.footprints.length > 1).map((g) => `${g.name}: ${g.sources.join(', ')}`),
    ...lotGroups.groups.filter((g) => g.footprints.length > 1).map((g) => `${g.idBase}: ${g.sources.join(', ')}`),
  ];
  if (grouped.length > 0) {
    report.push(`GROUPED -- ${grouped.length} place(s) drawn as several outlines (same name, or same lot id):`);
    for (const line of grouped) report.push(`    ${line}`);
    report.push('');
  }
  const conflicts = [...buildingGroups.conflicts, ...lotGroups.conflicts];
  if (conflicts.length > 0) {
    report.push(`GROUP CONFLICT -- ${conflicts.length} outline(s) of one place disagree; the first one listed wins:`);
    for (const line of conflicts) report.push(`    ${line}`);
    report.push('');
  }

  if (unlabeledBuildings.length > 0) {
    report.push(`TO DO -- ${unlabeledBuildings.length} building(s) have no abbreviation in map-labels.ts:`);
    for (const entry of unlabeledBuildings) report.push(`    ${entry}`);
    report.push('');
  }

  if (unnamedLots.length > 0) {
    report.push(`TO DO -- ${unnamedLots.length} parking area(s) still need a lot id. Easiest: click them in the Campus Digitizer.`);
    report.push('  Or by hand, in LOT_LABELS_BY_WAY in src/data/map-labels.ts:');
    for (const lot of unnamedLots) {
      report.push(`    ${lot.id}: { id: 'lot-??', label: 'Lot ??' },  // ${round6(lot.center.lat)}, ${round6(lot.center.lng)}`);
    }
    report.push('');
  }

  report.push(`FYI -- ${unnamedOnCampus.length} unnamed building(s) on campus were skipped.`);
  report.push('  Name them in the Campus Digitizer to bring them in (it shows them as unnamed).');

  const text = report.join('\n');
  console.log(text);
  await writeFile(path.join(CACHE_DIR, 'last-report.txt'), `${text}\n`);
  console.log(`\nReport also saved to tools/osm/cache/last-report.txt`);
  console.log('Campus Digitizer base data saved to tools/osm/cache/digitizer-base.json');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
