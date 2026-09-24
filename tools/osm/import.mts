/**
 * Regenerates the campus map data in src/data/ from OpenStreetMap.
 *
 *   npm run import:osm            # uses the cached Overpass responses when present
 *   npm run import:osm -- --refresh   # re-queries Overpass
 *
 * Writes campus-pois.ts, campus-lots.ts, campus-streets.ts, campus-walkways.ts and
 * campus-extent.ts. Never writes src/data/map-labels.ts -- that file is the hand-maintained
 * side (names, abbreviations, building codes, lot identities) and re-running this is safe.
 *
 * Source data is (c) OpenStreetMap contributors, ODbL. The generated files carry that notice.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BUILDING_LABELS,
  EXCLUDED_BUILDING_NAMES,
  LOT_LABELS_BY_NAME,
  LOT_LABELS_BY_WAY,
} from '../../src/data/map-labels.ts';
import { distanceMeters } from '../../src/routing/geo.ts';
import type { Coordinate, PoiCategory } from '../../src/types/map.ts';
import {
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

  const report: string[] = [];
  // Every coordinate that ends up drawn, so the map's bounding box covers all of it. Deriving
  // the box from the campus outline alone would clip the apartments just past the edge.
  const drawn: Coordinate[] = [];

  // ---- buildings -> POIs ----
  const takenPoiIds = new Set<string>();
  const unlabeledBuildings: string[] = [];
  const unnamedOnCampus: { id: number; center: Coordinate }[] = [];
  const matchedLabelKeys = new Set<string>();
  const pois: string[] = [];
  let poiCount = 0;

  for (const way of buildings) {
    if (!way.geometry || way.geometry.length < 4) continue;
    const ring = way.geometry.map(toCoordinate);
    const center = polygonCenter(ring);
    const tags = way.tags ?? {};
    const rawName = (tags.name ?? '').trim();
    const key = rawName.toLowerCase();

    const onCampus = isInsidePolygon(center, campusRing);
    const isHome = ['apartments', 'residential', 'dormitory'].includes(tags.building ?? '');
    const nearCampus =
      isHome && distanceToPolygonMeters(center, campusRing) <= NEARBY_APARTMENT_METERS;
    if (!onCampus && !nearCampus) continue;

    // Garages arrive through the lot layer; keeping them here too would double-draw them.
    if (tags.building === 'parking' || tags.amenity === 'parking') continue;

    if (!rawName) {
      if (onCampus) unnamedOnCampus.push({ id: way.id, center });
      continue;
    }
    if (EXCLUDED_BUILDING_NAMES.includes(key)) continue;

    const label = BUILDING_LABELS[key];
    if (label) matchedLabelKeys.add(key);
    const name = label?.name ?? rawName;
    const category = categoryFor(tags, label?.category);
    const id = uniqueId(`${category}-${slugify(name)}`, takenPoiIds);
    const footprint = simplifyPath(ring, SIMPLIFY_METERS);
    drawn.push(...footprint);

    if (!label?.abbreviation) unlabeledBuildings.push(`${name} (way ${way.id})`);

    const lines = [
      '  {',
      `    id: '${id}',`,
      `    name: ${fmtString(name)},`,
      `    category: '${category}',`,
    ];
    if (label?.abbreviation) lines.push(`    abbreviation: '${label.abbreviation}',`);
    if (label?.buildingCode) lines.push(`    buildingCode: '${label.buildingCode}',`);
    lines.push(`    coordinate: ${fmtCoordinate(center)},`);
    lines.push('    footprint: [');
    lines.push(fmtPath(footprint, '      '));
    lines.push('    ],');
    lines.push('  },');
    pois.push(lines.join('\n'));
    poiCount++;
  }

  await writeFile(
    path.join(DATA_DIR, 'campus-pois.ts'),
    `import type { PointOfInterest } from '@/types/map';\n\n${BANNER}\nexport const CAMPUS_POIS: PointOfInterest[] = [\n${pois.join('\n')}\n];\n`
  );

  // ---- parking -> lots ----
  const takenLotIds = new Set<string>();
  const unnamedLots: { id: number; center: Coordinate }[] = [];
  const lots: string[] = [];
  let lotCount = 0;

  for (const way of parking) {
    if (!way.geometry || way.geometry.length < 4) continue;
    const ring = way.geometry.map(toCoordinate);
    const center = polygonCenter(ring);
    const tags = way.tags ?? {};
    const byWay = LOT_LABELS_BY_WAY[way.id];
    const byName = LOT_LABELS_BY_NAME[(tags.name ?? '').trim().toLowerCase()];
    const known = byWay ?? byName;

    // Campus lots only, unless the lot has been claimed by hand in map-labels.ts -- that is
    // how the remote Park & Ride lots get in without dragging along every apartment and
    // church lot in the neighborhood.
    if (!byWay && !isInsidePolygon(center, campusRing)) continue;

    if (!known) unnamedLots.push({ id: way.id, center });

    const label = known?.label ?? (tags.name ?? '').trim() ?? '';
    const id = uniqueId(known?.id ?? `lot-osm-${way.id}`, takenLotIds);
    const footprint = simplifyPath(ring, SIMPLIFY_METERS);
    drawn.push(...footprint);

    lots.push(
      [
        '  {',
        `    id: '${id}',`,
        `    label: ${fmtString(label)},`,
        `    coordinate: ${fmtCoordinate(center)},`,
        '    footprint: [',
        fmtPath(footprint, '      '),
        '    ],',
        '  },',
      ].join('\n')
    );
    lotCount++;
  }

  await writeFile(
    path.join(DATA_DIR, 'campus-lots.ts'),
    `import type { CampusLot } from '@/types/map';\n\n${BANNER}\nexport const CAMPUS_LOTS: CampusLot[] = [\n${lots.join('\n')}\n];\n`
  );

  // ---- roads -> streets (visual only) ----
  const takenStreetIds = new Set<string>();
  const streets: string[] = [];
  for (const way of roads) {
    if (!way.geometry || way.geometry.length < 2) continue;
    // Same clipping reason as the walkways: keep the stretch that runs past campus, not the
    // whole road out to the county line.
    const line = way.geometry
      .map(toCoordinate)
      .filter((point) => distanceToPolygonMeters(point, campusRing) <= STREET_BUFFER_METERS);
    if (line.length < 2) continue;

    const name = (way.tags?.name ?? '').trim();
    const id = uniqueId(`street-${slugify(name)}`, takenStreetIds);
    drawn.push(...line);
    streets.push(
      [
        '  {',
        `    id: '${id}',`,
        `    name: ${fmtString(name)},`,
        '    path: [',
        fmtPath(simplifyPath(line, SIMPLIFY_METERS), '      '),
        '    ],',
        '  },',
      ].join('\n')
    );
  }

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
  const nearbyCoordinates = new Map<number, Coordinate>();
  for (const [id, coordinate] of nodeCoordinates) {
    if (distanceToPolygonMeters(coordinate, campusRing) <= WALKWAY_BUFFER_METERS) {
      nearbyCoordinates.set(id, coordinate);
    }
  }

  const rawGraph = buildWalkwayGraph(walkwayWays, nearbyCoordinates);
  const trimmed = largestComponent(rawGraph);
  const { droppedComponents, droppedNodeCount } = trimmed;
  const { graph } = compactIds(trimmed.graph);

  const nodeLines = graph.nodes.map(
    (node) => `  { id: '${node.id}', coordinate: ${fmtCoordinate(node.coordinate)} },`
  );
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

  // ---- report ----
  report.push('');
  report.push('=== Import summary ===');
  report.push(`buildings written : ${poiCount}`);
  report.push(`lots written      : ${lotCount}`);
  report.push(`streets written   : ${streets.length}`);
  report.push(`walkway nodes     : ${graph.nodes.length} (from ${rawGraph.nodes.length} before trimming)`);
  report.push(`walkway edges     : ${graph.edges.length}`);
  report.push(`dropped islands   : ${droppedComponents} components, ${droppedNodeCount} nodes`);
  report.push('');

  const staleLabels = Object.keys(BUILDING_LABELS).filter((key) => !matchedLabelKeys.has(key));
  if (staleLabels.length > 0) {
    report.push(`TO CHECK -- ${staleLabels.length} label(s) in map-labels.ts matched no OSM building.`);
    report.push('  Either the OSM name differs or OSM has it unnamed (look for it below):');
    for (const key of staleLabels) report.push(`    ${key}`);
    report.push('');
  }

  if (unlabeledBuildings.length > 0) {
    report.push(`TO DO -- ${unlabeledBuildings.length} building(s) have no abbreviation in map-labels.ts:`);
    for (const entry of unlabeledBuildings) report.push(`    ${entry}`);
    report.push('');
  }

  if (unnamedLots.length > 0) {
    report.push(`TO DO -- ${unnamedLots.length} parking area(s) still need a lot id. Add to LOT_LABELS_BY_WAY:`);
    for (const lot of unnamedLots) {
      report.push(`    ${lot.id}: { id: 'lot-lot-??', label: 'Lot ??' },  // ${round6(lot.center.lat)}, ${round6(lot.center.lng)}`);
    }
    report.push('');
  }

  report.push(`FYI -- ${unnamedOnCampus.length} unnamed building(s) on campus were skipped.`);
  report.push('  If one of the stale labels above is among them, name it in OSM or add it by hand.');

  const text = report.join('\n');
  console.log(text);
  await writeFile(path.join(CACHE_DIR, 'last-report.txt'), `${text}\n`);
  console.log(`\nReport also saved to tools/osm/cache/last-report.txt`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
