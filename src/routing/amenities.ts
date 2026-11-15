import { findBuilding } from '@/data/buildings';
import { INDOOR_BUILDINGS } from '@/data/campus-indoor';
import { distanceMeters } from '@/routing/geo';
import { findRoute, type RouteOptions } from '@/routing/route';
import type { WalkGraph } from '@/routing/graph';
import type { Coordinate, MapNode } from '@/types/map';

/**
 * Things to find the nearest of. Each matches some of the import's object kinds (OBJECT_KINDS), and
 * restroom also matches restroom nodes (`MapNode.restroom`). `words` are what the search recognizes;
 * `glyph` is the badge on the campus map, as on the floor plan's dots (indoor-layer.tsx).
 */
export const AMENITIES = [
  { id: 'restroom', label: 'Restroom', plural: 'restrooms', glyph: 'WC', words: ['restroom', 'bathroom', 'toilet', 'washroom'], kinds: ['restroom-men', 'restroom-women', 'restroom-all'] },
  { id: 'vending', label: 'Vending machine', plural: 'vending machines', glyph: 'V', words: ['vending', 'snack'], kinds: ['vending'] },
  { id: 'microwave', label: 'Microwave', plural: 'microwaves', glyph: 'MW', words: ['microwave'], kinds: ['microwave'] },
  { id: 'water', label: 'Water fountain', plural: 'water fountains', glyph: 'WF', words: ['water', 'fountain', 'refill', 'bottle'], kinds: ['water', 'refill', 'water-refill'] },
  { id: 'study', label: 'Study space', plural: 'study spaces', glyph: 'St', words: ['study'], kinds: ['study'] },
  { id: 'printer', label: 'Printer', plural: 'printers', glyph: 'P', words: ['printer', 'print'], kinds: ['printer'] },
  { id: 'atm', label: 'ATM', plural: 'ATMs', glyph: '$', words: ['atm', 'cash'], kinds: ['atm'] },
  { id: 'aed', label: 'AED', plural: 'AEDs', glyph: '+', words: ['aed', 'defibrillator'], kinds: ['aed'] },
] as const;

export type AmenityId = (typeof AMENITIES)[number]['id'];
type Amenity = (typeof AMENITIES)[number];

export const amenityById = (id: string): Amenity | undefined => AMENITIES.find((a) => a.id === id);

/** What a route to the nearest amenity calls where it ends: "Vending machine · Fine Arts Building · Room 148". */
export function amenityPlace(id: AmenityId, building?: { name: string }, room?: string): string {
  return [amenityById(id)!.label, building?.name, room && `Room ${room}`].filter(Boolean).join(' · ');
}

/** Whether a route to this node finds the amenity. */
export function hasAmenity(node: MapNode, id: AmenityId): boolean {
  if (id === 'restroom' && node.restroom) return true;
  const kinds: readonly string[] = amenityById(id)!.kinds;
  return !!node.amenities?.some((kind) => kinds.includes(kind));
}

/** Buildings whose indoor data has one (the generated index says so without loading them). */
export function buildingsWith(id: AmenityId, index: Record<string, { amenities?: string[] }> = INDOOR_BUILDINGS): string[] {
  const kinds: readonly string[] = [...amenityById(id)!.kinds, ...(id === 'restroom' ? ['restroom'] : [])];
  return Object.keys(index).filter((poiId) => index[poiId].amenities?.some((kind) => kinds.includes(kind)));
}

/** How many buildings "nearest" downloads and searches: the closest ones that have the amenity. */
export const NEAREST_BUILDINGS = 5;

/**
 * The buildings with the amenity closest to `from` in a straight line, so "nearest" downloads a few
 * buildings instead of every one that has it. ponytail: a straight-line shortlist; the nearest by
 * walking is almost always in it, but a building across a long detour could be missed.
 */
export function closestBuildingsWith(id: AmenityId, from: Coordinate, limit = NEAREST_BUILDINGS): string[] {
  const away = (poiId: string) => {
    const poi = findBuilding(poiId);
    return poi ? distanceMeters(from, poi.coordinate) : Infinity;
  };
  return buildingsWith(id)
    .map((poiId) => ({ poiId, meters: away(poiId) }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit)
    .map(({ poiId }) => poiId);
}

/**
 * Amenities a search means: a word of theirs starts with what was typed ("vend", "bath"), or what
 * was typed contains one ("water fountain"). Two letters at least, so "a" doesn't list them all.
 */
export function matchAmenities(query: string): Amenity[] {
  const typed = query.trim().toLowerCase();
  if (typed.length < 2) return [];
  return AMENITIES.filter((amenity) =>
    [...amenity.words, amenity.label.toLowerCase()].some((word) => word.startsWith(typed) || typed.includes(word))
  );
}

/** Amenities some building has, in AMENITIES order: what search offers. */
export function availableAmenities(index: Record<string, { amenities?: string[] }> = INDOOR_BUILDINGS): Amenity[] {
  return AMENITIES.filter((amenity) => buildingsWith(amenity.id, index).length > 0);
}

/**
 * The nearest node with the amenity, by walking from `from`: one search to all of them. Only buildings
 * already in `graph` count, so load `buildingsWith(id)` first. Null when none can be reached.
 */
export function nearestAmenity(
  graph: WalkGraph,
  from: Coordinate,
  id: AmenityId,
  options: Pick<RouteOptions, 'fromNodeId' | 'fromPoiId' | 'allowRestricted'> = {}
): MapNode | null {
  const targets = [...graph.nodeById.values()].filter((node) => hasAmenity(node, id)).map((node) => node.id);
  const route = findRoute(graph, from, from, { ...options, toNodeIds: targets });
  return route ? graph.nodeById.get(route.nodeIds[route.nodeIds.length - 1])! : null;
}
