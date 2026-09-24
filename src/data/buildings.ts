import { CAMPUS_POIS } from '@/data/campus-pois';
import type { PointOfInterest } from '@/types/map';

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
  /** The abbreviation, where the building has one. */
  abbreviation?: string;
};

/**
 * Buildings a class can be in, for the Add Class picker: the academic ones, by name.
 *
 * Residence halls and apartments are left out -- classes are not held in them, and including
 * them would make the list twice as long to scroll.
 */
export function classroomBuildingOptions(): BuildingOption[] {
  return CAMPUS_POIS.filter((poi) => poi.category === 'academic')
    .map((poi) => ({ id: poi.id, name: poi.name, abbreviation: poi.abbreviation }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
