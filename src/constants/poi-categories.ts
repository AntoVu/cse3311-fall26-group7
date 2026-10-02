import type { PoiCategory } from '@/types/map';

/**
 * The order building categories are listed in: the class picker, the map legend. Classrooms
 * first because that is what most lookups are for, homes last.
 */
export const POI_CATEGORY_ORDER: readonly PoiCategory[] = [
  'academic',
  'administration',
  'misc',
  'greek',
  'residence',
  'apartment',
];

/** Full names, for the map legend and a building's info sheet. */
export const POI_CATEGORY_LABELS: Record<PoiCategory, string> = {
  academic: 'Academic building',
  administration: 'Administration',
  misc: 'Other building',
  greek: 'Fraternity or sorority',
  residence: 'On-campus residence',
  apartment: 'Nearby apartment',
};

/** Short names, for a second line under a building's name. */
export const POI_CATEGORY_NAMES: Record<PoiCategory, string> = {
  academic: 'Academic',
  administration: 'Administration',
  misc: 'Misc',
  greek: 'Greek life',
  residence: 'Residence hall',
  apartment: 'Apartment',
};
