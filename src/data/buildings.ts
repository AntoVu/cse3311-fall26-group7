import { POI_CATEGORY_NAMES, POI_CATEGORY_ORDER } from '@/constants/poi-categories';
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
