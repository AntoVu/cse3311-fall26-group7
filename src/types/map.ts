/**
 * Core map data model for Mavigator.
 *
 * Node/Edge/Route naming intentionally mirrors the inception document's Technical
 * Design section, so Iteration 2's pathfinding work (Dijkstra or similar) can build
 * on this shape without a data-model rewrite. Iteration 1 only renders POIs on the
 * outdoor map: MapNode/MapEdge/Route are defined now but not yet wired into any
 * real pathfinding.
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

/** What kind of place a point of interest represents. */
export type PoiCategory = 'academic' | 'residence' | 'apartment';

export interface PointOfInterest {
  id: string;
  name: string;
  category: PoiCategory;
  coordinate: Coordinate;
  /**
   * Building code as used on the official UTA campus map, e.g. "677" for
   * Nedderman Hall. Numeric building codes come straight from the PDF's
   * building index; a few (like "BS") are only ever labeled with a short
   * code on the map itself, with no expansion given.
   */
  buildingCode?: string;
  /**
   * The building's short-form abbreviation as commonly used in room labels
   * and schedules, e.g. "NH" for Nedderman Hall, "ERB" for Engineering
   * Research Building. Distinct from `buildingCode` (the map's numeric
   * index) -- this is the letters students actually see printed on a
   * schedule or door sign. Optional because not every POI has been given
   * one yet.
   */
  abbreviation?: string;
  /**
   * Building footprint polygon (outline), digitized from the official UTA
   * campus map so the outdoor map can draw the building's real shape/position
   * instead of just a dot. Simplified (not every jag traced) but
   * proportionally accurate. Optional because not every POI has one yet.
   */
  footprint?: Coordinate[];
  description?: string;
}

/**
 * A parking lot or garage footprint. Not a PointOfInterest: lots aren't tappable
 * destinations with an info sheet the way buildings are; the Parking tab just colors them
 * by the user's permit.
 */
export interface CampusLot {
  id: string;
  /** The label as it appears on the official map, e.g. "Lot 47" or "Maverick Parking Garage". */
  label: string;
  coordinate: Coordinate;
  footprint: Coordinate[];
}

/**
 * A street centerline, drawn on the outdoor map so the campus grid reads
 * correctly under the buildings/lots. Visual only: not part of the
 * MapNode/MapEdge routing graph.
 */
export interface CampusStreet {
  id: string;
  name: string;
  path: Coordinate[];
}

/**
 * A single point in the outdoor/indoor path graph (a POI entrance, a hallway
 * junction, a parking lot entrance, etc). Not every node corresponds to a POI.
 */
export interface MapNode {
  id: string;
  coordinate: Coordinate;
  poiId?: string;
}

/** A walkable connection between two nodes. */
export interface MapEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  walkable: boolean;
}

/**
 * A calculated path through the node/edge graph. Nothing produces a real Route
 * yet: this shape exists so Iteration 2's pathfinding has somewhere to land.
 */
export interface Route {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  totalDistanceMeters: number;
  etaMinutes: number;
}
