import { POI_CATEGORY_NAMES, POI_CATEGORY_ORDER } from '@/constants/poi-categories';
import { BUILDING_ALIASES } from '@/data/building-aliases';
import { CAMPUS_POIS } from '@/data/campus-pois';
import type { PoiCategory, PointOfInterest } from '@/types/map';

/**
 * Looking up the buildings a class can be held in.
 *
 * Before Iteration 1.5 a class stored whatever the user typed in a free-text "Building" box,
 * so nothing connected a class to the map and "ERBB" was as acceptable as "ERB". A class now
 * stores a POI id instead, which is what lets the schedule route to it.
 */

const POI_BY_ID = new Map(CAMPUS_POIS.map((poi) => [poi.id, poi]));

export function findBuilding(buildingId: string): PointOfInterest | undefined {
  return POI_BY_ID.get(buildingId);
}

/** The short form to show on a card: "NH" where we know it, the full name otherwise. */
export function buildingLabel(buildingId: string): string {
  const poi = findBuilding(buildingId);
  if (!poi) return 'Unknown building';
  return poi.abbreviation ?? poi.name;
}

/** The full name, for screens with room to show it. */
export function buildingName(buildingId: string): string {
  return findBuilding(buildingId)?.name ?? 'Unknown building';
}

export type BuildingOption = {
  id: string;
  name: string;
  category: PoiCategory;
  /** The abbreviation, where the building has one. */
  abbreviation?: string;
  /** The picker's second line: the abbreviation, plus the kind of building when not academic. */
  description?: string;
};

/**
 * Buildings a class can be in, for the Add Class picker: every building on the map, academic
 * first, then administration, then misc, then residence halls and apartments, each by name.
 * Classes do meet outside classroom buildings, so nothing is left out; the order keeps the
 * likely answer at the top.
 */
export function classBuildingOptions(): BuildingOption[] {
  const rank = (category: PoiCategory) => POI_CATEGORY_ORDER.indexOf(category);
  return CAMPUS_POIS.map((poi) => {
    const parts = [poi.abbreviation, poi.category === 'academic' ? undefined : POI_CATEGORY_NAMES[poi.category]];
    const description = parts.filter(Boolean).join(' · ') || undefined;
    return { id: poi.id, name: poi.name, category: poi.category, abbreviation: poi.abbreviation, description };
  }).sort((a, b) => rank(a.category) - rank(b.category) || a.name.localeCompare(b.name));
}

/** What people call a building besides its name (shown on its card); see building-aliases.ts. */
export function buildingAliasNames(buildingId: string): string[] {
  return BUILDING_ALIASES[buildingId]?.names ?? [];
}

const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * How well a building matches what was typed: 3 exactly its name, a code or an alias; 2 one of them
 * starts with it; 1 a name or alias contains it; 0 no match. Spaces and punctuation are ignored.
 * The one building search: the Map tab, the class building picker, the start picker and MyMav import.
 */
export function buildingMatch(
  building: { id: string; name: string; abbreviation?: string },
  query: string
): number {
  const wanted = squash(query);
  if (!wanted) return 0;
  const aliases = BUILDING_ALIASES[building.id];
  const names = [building.name, ...(aliases?.names ?? [])].map(squash);
  const codes = [building.abbreviation ?? '', ...(aliases?.codes ?? [])].filter(Boolean).map(squash);
  if (names.includes(wanted) || codes.includes(wanted)) return 3;
  if ([...names, ...codes].some((text) => text.startsWith(wanted))) return 2;
  return names.some((text) => text.includes(wanted)) ? 1 : 0;
}

/** Buildings matching a search, best first (then in the class picker's order). */
export function searchBuildings(query: string, limit = 6): BuildingOption[] {
  return classBuildingOptions()
    .map((building) => ({ building, score: buildingMatch(building, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ building }) => building);
}

/** "NH 340", "erb228", "Nedderman Hall 100A": a building known exactly plus a room number, or null. */
export function parseRoomQuery(query: string): { building: BuildingOption; room: string } | null {
  // With a space the room may start with a letter (ERB B12); without one, the letters are the building's.
  const text = query.trim();
  const match = text.match(/^(.+?[a-z.])[\s-]+([a-z]?\d{2,4}[a-z]?)$/i) ?? text.match(/^(.*[a-z])(\d{2,4}[a-z]?)$/i);
  if (!match) return null;
  const building = classBuildingOptions().find((option) => buildingMatch(option, match[1]) === 3);
  return building ? { building, room: match[2].toUpperCase() } : null;
}
