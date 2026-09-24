import { CAMPUS_BOUNDS } from '@/constants/campus';
import { hasParkingRule } from '@/constants/parking-permits';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { CAMPUS_STREETS } from '@/data/campus-streets';
import { WALKWAY_EDGES, WALKWAY_NODES } from '@/data/campus-walkways';
import { distanceMeters } from '@/routing/geo';
import type { Coordinate } from '@/types/map';

// Data-integrity checks for the hand-traced campus data. A bad export from the
// Campus Digitizer (duplicate id, collapsed polygon, coordinates outside the
// calibrated box) otherwise only shows up as a subtly broken map on a phone.

const { minLat, maxLat, minLng, maxLng } = CAMPUS_BOUNDS;

/** Roughly 250 ft: far enough to cross a lawn or a lot, close enough to be a real walk-up. */
const MAX_SNAP_METERS = 80;

function isInsideBounds({ lat, lng }: Coordinate) {
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

function expectUnique(ids: string[]) {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('campus POIs', () => {
  it('has unique ids', () => {
    expectUnique(CAMPUS_POIS.map((poi) => poi.id));
  });

  it('has a non-empty name and a known category on every POI', () => {
    for (const poi of CAMPUS_POIS) {
      expect(poi.name.trim()).not.toBe('');
      expect(['academic', 'residence', 'apartment']).toContain(poi.category);
    }
  });

  it('places every POI coordinate inside the campus bounds', () => {
    for (const poi of CAMPUS_POIS) {
      expect({ id: poi.id, inside: isInsideBounds(poi.coordinate) }).toEqual({
        id: poi.id,
        inside: true,
      });
    }
  });

  it('gives every footprint at least 3 points, all inside the campus bounds', () => {
    for (const poi of CAMPUS_POIS) {
      if (!poi.footprint) continue;
      expect({ id: poi.id, enough: poi.footprint.length >= 3 }).toEqual({
        id: poi.id,
        enough: true,
      });
      expect({ id: poi.id, inside: poi.footprint.every(isInsideBounds) }).toEqual({
        id: poi.id,
        inside: true,
      });
    }
  });

  it('never gives two different buildings the same abbreviation', () => {
    // Vandergriff Hall is deliberately traced as two footprints under one name,
    // so compare (abbreviation, name) pairs rather than abbreviations alone.
    const byAbbreviation = new Map<string, Set<string>>();
    for (const poi of CAMPUS_POIS) {
      if (!poi.abbreviation) continue;
      const names = byAbbreviation.get(poi.abbreviation) ?? new Set<string>();
      names.add(poi.name);
      byAbbreviation.set(poi.abbreviation, names);
    }
    for (const [abbreviation, names] of byAbbreviation) {
      expect({ abbreviation, names: names.size }).toEqual({ abbreviation, names: 1 });
    }
  });
});

describe('campus lots', () => {
  it('has unique ids', () => {
    expectUnique(CAMPUS_LOTS.map((lot) => lot.id));
  });

  // A lot with no permit rule has not been matched to the PATS map yet, so it is drawn
  // without a label rather than captioned with a guess. Every lot that IS identified must
  // say which one it is.
  it('labels every lot the permit rules recognize', () => {
    for (const lot of CAMPUS_LOTS) {
      if (!hasParkingRule(lot.id)) continue;
      expect({ id: lot.id, labeled: lot.label.trim() !== '' }).toEqual({
        id: lot.id,
        labeled: true,
      });
    }
  });

  it('gives every footprint at least 3 points, all inside the campus bounds', () => {
    for (const lot of CAMPUS_LOTS) {
      expect({ id: lot.id, enough: lot.footprint.length >= 3 }).toEqual({
        id: lot.id,
        enough: true,
      });
      expect({ id: lot.id, inside: lot.footprint.every(isInsideBounds) }).toEqual({
        id: lot.id,
        inside: true,
      });
    }
  });
});

describe('campus streets', () => {
  it('has unique ids and at least 2 points per street', () => {
    expectUnique(CAMPUS_STREETS.map((street) => street.id));
    for (const street of CAMPUS_STREETS) {
      expect(street.path.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('walkway graph', () => {
  const nodeIds = new Set(WALKWAY_NODES.map((node) => node.id));

  it('has unique node ids and points every edge at nodes that exist', () => {
    expectUnique(WALKWAY_NODES.map((node) => node.id));
    expectUnique(WALKWAY_EDGES.map((edge) => edge.id));
    for (const edge of WALKWAY_EDGES) {
      expect({ id: edge.id, resolves: nodeIds.has(edge.fromNodeId) && nodeIds.has(edge.toNodeId) }).toEqual(
        { id: edge.id, resolves: true }
      );
    }
  });

  it('gives every edge a positive length and joins two different nodes', () => {
    for (const edge of WALKWAY_EDGES) {
      expect({ id: edge.id, ok: edge.distanceMeters > 0 && edge.fromNodeId !== edge.toNodeId }).toEqual({
        id: edge.id,
        ok: true,
      });
    }
  });

  it('keeps every node inside the campus bounds', () => {
    for (const node of WALKWAY_NODES) {
      expect({ id: node.id, inside: isInsideBounds(node.coordinate) }).toEqual({
        id: node.id,
        inside: true,
      });
    }
  });

  // The one that matters for routing: a second component means some start or destination can
  // never reach some other, and Dijkstra would simply return no route with no obvious cause.
  it('is a single connected network', () => {
    const neighbors = new Map<string, string[]>();
    for (const edge of WALKWAY_EDGES) {
      if (!neighbors.has(edge.fromNodeId)) neighbors.set(edge.fromNodeId, []);
      if (!neighbors.has(edge.toNodeId)) neighbors.set(edge.toNodeId, []);
      neighbors.get(edge.fromNodeId)!.push(edge.toNodeId);
      neighbors.get(edge.toNodeId)!.push(edge.fromNodeId);
    }

    const seen = new Set<string>([WALKWAY_NODES[0].id]);
    const stack = [WALKWAY_NODES[0].id];
    while (stack.length > 0) {
      for (const next of neighbors.get(stack.pop()!) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    expect(seen.size).toBe(WALKWAY_NODES.length);
  });

  // Routing snaps a start or destination to the nearest node, so anything the map offers as
  // one has to be within reach. The import widens the graph's reach to match whatever it
  // draws, which is what keeps this true.
  it('puts every building and lot within reach of a walkway', () => {
    const nearestMeters = (coordinate: Coordinate) =>
      WALKWAY_NODES.reduce(
        (best, node) => Math.min(best, distanceMeters(coordinate, node.coordinate)),
        Infinity
      );

    for (const poi of CAMPUS_POIS) {
      expect({ id: poi.id, reachable: nearestMeters(poi.coordinate) <= MAX_SNAP_METERS }).toEqual({
        id: poi.id,
        reachable: true,
      });
    }
    for (const lot of CAMPUS_LOTS) {
      expect({ id: lot.id, reachable: nearestMeters(lot.coordinate) <= MAX_SNAP_METERS }).toEqual({
        id: lot.id,
        reachable: true,
      });
    }
  });
});
