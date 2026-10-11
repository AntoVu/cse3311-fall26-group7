/**
 * Derives the Campus Digitizer's built-in georeference for the PATS Visitor Parking Map.
 *
 *   node tools/digitizer/derive-georef.mts "<path to the map PNG>"
 *
 * Writes tools/digitizer/georef-default.json. Needs the OSM cache, so run
 * `npm run import:osm` first. The PNG is PATS's, so it is never committed: point this at your
 * own download (the PDF rendered at any resolution; only the page's proportions matter).
 *
 * Landmarks come from two places:
 *
 * 1. **Buildings**, for a first rough fit only. The Iteration 1 trace (legacy-iteration1.json)
 *    already sits on the page, and every building in it whose name matches a single OSM
 *    building pairs its traced centroid with OSM's. They are too noisy to keep: they disagree
 *    with any fit by about 13 m, which is hand-tracing error, not the map's.
 * 2. **Streets**, which make up the georeference itself. The PATS map draws streets as white fill. The page is cut into cells, and in
 *    each cell the OSM street centerlines are shifted until they land on the most white
 *    pixels. That shift says where the street really sits on the drawing. This is what covers
 *    the page edges, which the Iteration 1 trace never reached.
 *
 * Two passes: the first searches wide from a building-only fit; the second searches narrowly
 * from the local fit the first pass produced, which recovers cells whose shift was too big
 * for the first guess.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { distanceMeters } from '../../src/routing/geo.ts';
import {
  fitAffine,
  localToImage,
  localToLatLng,
  residualsMeters,
  toImage,
  type ControlPair,
  type LocalGeoref,
} from './georef.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '../osm/cache');

/** Cell size for street matching, in image pixels. */
const CELL_PX = 480;
/** Fewer street samples than this in a cell and the match is not trustworthy. */
const MIN_SAMPLES = 120;
/** The share of samples that must land on white for a cell to count. */
const MIN_WHITE_SHARE = 0.75;
/** Near-white RGB threshold for "this pixel is street fill". */
const WHITE = 236;
/** Moving-least-squares falloff, as a fraction of the page width. Chosen by leave-one-out. */
const SIGMA = 0.12;

type OsmWay = {
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
};
type LegacyShape = { name: string; imagePoints: [number, number][] };

const pngPath = process.argv[2];
if (!pngPath) {
  console.error('Usage: node tools/digitizer/derive-georef.mts "<path to the map PNG>"');
  process.exit(1);
}

// jimp-compact arrives with Expo's image tooling. It is only needed here, by hand, once a year
// at most, so it is not worth a direct dependency.
const require = createRequire(import.meta.url);
const Jimp = require('jimp-compact');

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

function ringCenter(ring: { lat: number; lng: number }[]) {
  let area = 0;
  let lat = 0;
  let lng = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j].lng * ring[i].lat - ring[i].lng * ring[j].lat;
    area += f;
    lng += (ring[j].lng + ring[i].lng) * f;
    lat += (ring[j].lat + ring[i].lat) * f;
  }
  return { lat: lat / (3 * area), lng: lng / (3 * area) };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

async function buildingPairs(): Promise<ControlPair[]> {
  const legacy = await readJson<{ buildings: LegacyShape[] }>(path.join(HERE, 'legacy-iteration1.json'));
  const osm = await readJson<{ elements: OsmWay[] }>(path.join(CACHE, 'buildings.json'));
  const { BUILDING_LABELS } = await import('../../src/data/map-labels.ts');

  const ringsByName = new Map<string, { lat: number; lng: number }[][]>();
  for (const way of osm.elements) {
    const name = way.tags?.name?.trim().toLowerCase();
    if (!name || !way.geometry) continue;
    const rings = ringsByName.get(name) ?? [];
    rings.push(way.geometry.map((p) => ({ lat: p.lat, lng: p.lon })));
    ringsByName.set(name, rings);
  }
  // The trace used UTA's display names ("Central Library"); map-labels.ts records the renames.
  const osmNameFor = new Map<string, string>();
  for (const [osmName, label] of Object.entries(BUILDING_LABELS)) {
    if (label.name) osmNameFor.set(label.name.toLowerCase(), osmName);
  }

  const traceCount = new Map<string, number>();
  for (const shape of legacy.buildings) {
    const key = shape.name.toLowerCase();
    traceCount.set(key, (traceCount.get(key) ?? 0) + 1);
  }

  const pairs: ControlPair[] = [];
  for (const shape of legacy.buildings) {
    const key = shape.name.toLowerCase();
    // Two traced wings under one name cannot be told apart, so skip them.
    if (traceCount.get(key) !== 1) continue;
    const rings = ringsByName.get(key) ?? ringsByName.get(osmNameFor.get(key) ?? '');
    if (!rings || rings.length !== 1) continue;
    // The trace's own centroid was a vertex average, and so is this. Its outlines repeat
    // points, which throws an area-weighted centroid well off.
    const u = shape.imagePoints.reduce((sum, [pu]) => sum + pu, 0) / shape.imagePoints.length;
    const v = shape.imagePoints.reduce((sum, [, pv]) => sum + pv, 0) / shape.imagePoints.length;
    pairs.push({ u, v, ...ringCenter(rings[0]) });
  }
  return pairs;
}

type StreetSample = { lat: number; lng: number };

async function streetSamples(): Promise<StreetSample[]> {
  const roads = await readJson<{ elements: OsmWay[] }>(path.join(CACHE, 'roads.json'));
  const samples: StreetSample[] = [];
  for (const way of roads.elements) {
    const g = way.geometry;
    if (!g) continue;
    for (let i = 1; i < g.length; i++) {
      // About every 4 m, which is a few pixels at the PNG's resolution.
      const steps = Math.max(1, Math.round(Math.hypot(g[i].lat - g[i - 1].lat, g[i].lon - g[i - 1].lon) / 0.00004));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        samples.push({
          lat: g[i - 1].lat + (g[i].lat - g[i - 1].lat) * t,
          lng: g[i - 1].lon + (g[i].lon - g[i - 1].lon) * t,
        });
      }
    }
  }
  return samples;
}

async function main() {
  const image = await Jimp.read(pngPath);
  const { width, height, data } = image.bitmap as { width: number; height: number; data: Buffer };
  const isWhite = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    isWhite[i] = data[i * 4] > WHITE && data[i * 4 + 1] > WHITE && data[i * 4 + 2] > WHITE ? 1 : 0;
  }
  const aspect = height / width;
  console.log(`Image ${width} x ${height} (aspect ${(width / height).toFixed(4)})`);

  const buildings = await buildingPairs();
  const affine = fitAffine(buildings);
  console.log(`Building landmarks: ${buildings.length}`);

  const samples = await streetSamples();

  function matchStreets(project: (s: StreetSample) => { u: number; v: number }, reach: number) {
    const cells = new Map<string, { x: number; y: number; s: StreetSample }[]>();
    for (const s of samples) {
      const { u, v } = project(s);
      const x = u * width;
      const y = v * height;
      if (x < 5 || y < 5 || x > width - 5 || y > height - 5) continue;
      const key = `${Math.floor(x / CELL_PX)},${Math.floor(y / CELL_PX)}`;
      const list = cells.get(key) ?? [];
      list.push({ x, y, s });
      cells.set(key, list);
    }

    const whiteShare = (list: { x: number; y: number }[], dx: number, dy: number) => {
      let hits = 0;
      for (const { x, y } of list) {
        const px = Math.round(x + dx);
        const py = Math.round(y + dy);
        if (px >= 0 && py >= 0 && px < width && py < height && isWhite[py * width + px]) hits++;
      }
      return hits / list.length;
    };

    const pairs: ControlPair[] = [];
    for (const list of cells.values()) {
      if (list.length < MIN_SAMPLES) continue;
      let best = { share: -1, dx: 0, dy: 0 };
      for (let dx = -reach; dx <= reach; dx += 2) {
        for (let dy = -reach; dy <= reach; dy += 2) {
          const share = whiteShare(list, dx, dy);
          if (share > best.share) best = { share, dx, dy };
        }
      }
      for (let dx = best.dx - 2; dx <= best.dx + 2; dx++) {
        for (let dy = best.dy - 2; dy <= best.dy + 2; dy++) {
          const share = whiteShare(list, dx, dy);
          if (share > best.share) best = { share, dx, dy };
        }
      }
      // A best shift pinned to the edge of the search means the real one lies outside it.
      const pinned = Math.abs(best.dx) >= reach - 1 || Math.abs(best.dy) >= reach - 1;
      if (best.share < MIN_WHITE_SHARE || pinned) continue;

      const mean = (f: (item: (typeof list)[number]) => number) =>
        list.reduce((sum, item) => sum + f(item), 0) / list.length;
      pairs.push({
        u: (mean((i) => i.x) + best.dx) / width,
        v: (mean((i) => i.y) + best.dy) / height,
        lat: mean((i) => i.s.lat),
        lng: mean((i) => i.s.lng),
      });
    }
    return pairs;
  }

  // Pass 1: wide search from the building-only affine.
  const firstStreets = matchStreets((s) => toImage(affine, s.lat, s.lng), 70);
  const first: LocalGeoref = {
    affine: fitAffine([...buildings, ...firstStreets]),
    controlPoints: [...buildings, ...firstStreets],
    sigma: SIGMA,
    aspect,
  };
  console.log(`Pass 1 street landmarks: ${firstStreets.length}`);

  // Pass 2: narrow search from the local fit. Streets only from here on (see the header).
  const streets = matchStreets((s) => localToImage(first, s.lat, s.lng), 24);
  const controlPoints = streets;
  const globalAffine = fitAffine(controlPoints);
  console.log(`Pass 2 street landmarks: ${streets.length}`);

  // Leave-one-out: predict each landmark from all the others. This is the honest accuracy
  // figure, since a fit always looks good on the points it was fitted to.
  const leaveOneOut = controlPoints.map((pair, i) =>
    distanceMeters(
      localToLatLng(
        { affine: globalAffine, controlPoints: controlPoints.filter((_, j) => j !== i), sigma: SIGMA, aspect },
        pair.u,
        pair.v
      ),
      pair
    )
  );
  const sorted = [...leaveOneOut].sort((a, b) => a - b);
  console.log(
    `Local fit, leave-one-out: median ${median(leaveOneOut).toFixed(1)} m, ` +
      `90th percentile ${sorted[Math.floor(sorted.length * 0.9)].toFixed(1)} m`
  );

  const globalResiduals = residualsMeters(globalAffine, controlPoints);
  console.log(
    `Single affine over all landmarks: median ${median(globalResiduals).toFixed(1)} m, ` +
      `max ${Math.max(...globalResiduals).toFixed(1)} m (the local fit exists because of this)`
  );

  const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;
  const result = {
    about:
      'Built-in georeference for the PATS Visitor Parking Map 2026-27 page, generated by ' +
      'tools/digitizer/derive-georef.mts. Image positions are fractions of the page (u = x / width, ' +
      'v = y / height). Apply with localToLatLng / localToImage from tools/digitizer/georef.ts.',
    generatedAt: new Date().toISOString(),
    image: { width, height },
    sigma: SIGMA,
    aspect: round(aspect, 6),
    affine: globalAffine,
    controlPoints: controlPoints.map((p) => ({
      u: round(p.u, 6),
      v: round(p.v, 6),
      lat: round(p.lat, 7),
      lng: round(p.lng, 7),
    })),
  };
  await writeFile(path.join(HERE, 'georef-default.json'), `${JSON.stringify(result, null, 1)}\n`);
  console.log(`Wrote tools/digitizer/georef-default.json (${controlPoints.length} landmarks)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
