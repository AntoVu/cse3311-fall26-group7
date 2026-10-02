import { CAMPUS_BOUNDS } from '@/constants/campus';
import { hasParkingRule } from '@/constants/parking-permits';
import { POI_CATEGORY_ORDER } from '@/constants/poi-categories';
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
      expect(POI_CATEGORY_ORDER).toContain(poi.category);
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

  it('gives every outline at least 3 points, all inside the campus bounds', () => {
    for (const poi of CAMPUS_POIS) {
      for (const outline of poi.footprints) {
        expect({ id: poi.id, enough: outline.length >= 3 }).toEqual({ id: poi.id, enough: true });
        expect({ id: poi.id, inside: outline.every(isInsideBounds) }).toEqual({ id: poi.id, inside: true });
      }
    }
  });

  // Same name means same place: a building drawn as several outlines (the two halves of the
  // Aerodynamics Research Building, University Village's apartment blocks) is one POI with
  // several footprints, so a second POI with the same name would be a grouping bug.
  it('has one POI per building name', () => {
    expectUnique(CAMPUS_POIS.map((poi) => poi.name.trim().toLowerCase()));
  });

  // So an abbreviation on a schedule or a door sign always means exactly one place.
  it('gives each abbreviation to exactly one building', () => {
    expectUnique(CAMPUS_POIS.flatMap((poi) => (poi.abbreviation ? [poi.abbreviation] : [])));
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

  it('gives every lot at least one outline of 3 or more points, all inside the campus bounds', () => {
    for (const lot of CAMPUS_LOTS) {
      expect({ id: lot.id, outlines: lot.footprints.length > 0 }).toEqual({ id: lot.id, outlines: true });
      for (const outline of lot.footprints) {
        expect({ id: lot.id, enough: outline.length >= 3 }).toEqual({ id: lot.id, enough: true });
        expect({ id: lot.id, inside: outline.every(isInsideBounds) }).toEqual({ id: lot.id, inside: true });
      }
    }
  });

  // The permit rules key on the lot id, so an identified lot drawn as several outlines has to
  // stay one lot. A "-2" suffix on an id the rules know means an outline lost its rule.
  it('never splits an identified lot into suffixed copies', () => {
    for (const lot of CAMPUS_LOTS) {
      const base = lot.id.replace(/-\d+$/, '');
      if (base === lot.id || !hasParkingRule(base)) continue;
      expect({ id: lot.id, splitFrom: base }).toBeUndefined();
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
