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

/**
 * What kind of place a point of interest represents. `administration` is offices and services
 * (UAB, PATS); `greek` is a fraternity or sorority house; `misc` is everything else that is not a
 * classroom or a home (a plant, a store).
 */
export type PoiCategory = 'academic' | 'administration' | 'misc' | 'greek' | 'residence' | 'apartment';

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
   * The building's outlines. Usually one, but a building UTA treats as one place can be drawn
   * as several: the Aerodynamics Research Building is two structures side by side, and an
   * apartment complex is a cluster of blocks. The import groups outlines that share a name
   * into one POI. Empty means the POI is drawn as a dot. `coordinate` is the area-weighted
   * center of all of them.
   */
  footprints: Coordinate[][];
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
  /**
   * One or more outlines. The permit rules key on `id`, so every outline given the same lot
   * id is part of this one lot and shares its rule.
   */
  footprints: Coordinate[][];
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
  /**
   * The floor an indoor node is on, as people say it ("B", "1", "2"...). Absent outdoors. Stairs
   * stack floors at one lat/lng, so this is what tells them apart.
   */
  level?: string;
  /** Set on an indoor door node: the room it opens into, e.g. "105A". */
  room?: string;
  /** Set on a node inside a room you can walk through (a lecture hall, the library): that room. */
  inside?: string;
  /** Set on a stair or elevator node, one per floor it serves. Text directions name it. */
  connector?: 'stairs' | 'elevator';
  /** Set on a building's outdoor entrance node: the POI id of the building it opens into. */
  entranceOf?: string;
}

/** A walkable connection between two nodes. */
export interface MapEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  /**
   * What the search pays to use this edge, when that is not its length: walking through a room
   * costs more than its meters, so routes go round unless the room saves a lot. Distance and
   * ETA still use `distanceMeters`.
   */
  costMeters?: number;
  walkable: boolean;
  /**
   * Every point along the edge, both ends included. Only junctions become nodes, so a
   * sidewalk's bends live here instead -- that keeps the graph small while a drawn route
   * still follows the real path rather than cutting corners. Optional because a
   * hand-authored indoor edge (Iteration 2) is a straight line between two nodes.
   */
  path?: Coordinate[];
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
