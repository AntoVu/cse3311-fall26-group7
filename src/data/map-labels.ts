import type { PoiCategory } from '@/types/map';

/**
 * The hand-maintained half of the campus map: everything OpenStreetMap does not know.
 *
 * `tools/osm/import.mts` regenerates campus-pois / campus-lots / campus-streets /
 * campus-walkways from OSM on every run and **never writes this file**, so re-importing can
 * never lose the work below. Anything you want to keep belongs here, not in a generated file.
 *
 * OSM supplies geometry and, for about a third of campus, a name. It does not supply UTA
 * abbreviations (NH, ERB), the building-index codes, or lot identities -- it names only a
 * handful of the ~70 parking polygons. Those all come from the official campus map and the
 * PATS permit PDF, by hand.
 *
 * Run `npm run import:osm` and read its report: it lists every unnamed lot and every building
 * missing an abbreviation, with coordinates and OSM way ids, so filling this in is a checklist
 * rather than a hunt.
 */

export type BuildingLabel = {
  /** Replaces the OSM name, where UTA calls the building something else. */
  name?: string;
  /** Short form students see on a schedule or door sign, e.g. "NH". */
  abbreviation?: string;
  /** Numeric code from the campus map's building index. */
  buildingCode?: string;
  /** Overrides what the OSM building tag implies. */
  category?: PoiCategory;
};

/**
 * Keyed by the OSM building name, lowercased and trimmed. Seeded from the 2026-09-18
 * hand-traced data, whose geometry is gone but whose labels were correct.
 */
export const BUILDING_LABELS: Record<string, BuildingLabel> = {
  'nedderman hall': { abbreviation: 'NH', buildingCode: '677' },
  'engineering research building': { abbreviation: 'ERB', buildingCode: '510' },
  'engineering lab building': { abbreviation: 'ELB', buildingCode: '648' },
  'earth & environmental sciences building': {
    name: 'Earth and Environmental Sciences',
    abbreviation: 'EES',
    buildingCode: '513',
  },
  'woolf hall': { abbreviation: 'WH', buildingCode: '597' },
  'general academic classroom building': { abbreviation: 'GACB', buildingCode: '625' },
  'eh hereford university center': {
    name: 'University Center',
    abbreviation: 'UC',
    buildingCode: 'UC',
  },
  'science hall': { abbreviation: 'SH', buildingCode: '518' },
  'preston hall': { abbreviation: 'PH', buildingCode: '502' },
  'ransom hall': { abbreviation: 'RH', buildingCode: '501' },
  'carlisle hall': { abbreviation: 'CAH', buildingCode: '626' },
  'college hall': { abbreviation: 'CH', buildingCode: '505' },
  'chemistry research building': { abbreviation: 'CRB', buildingCode: '519' },
  'chemistry & physics building': { abbreviation: 'CPB', buildingCode: '520' },
  'uta university library': {
    name: 'Central Library',
    abbreviation: 'LIBR',
    buildingCode: '603',
  },
  'university hall': { abbreviation: 'UH', buildingCode: '629' },
  'trimble hall': { abbreviation: 'TH', buildingCode: '619' },
  'hammond hall': { abbreviation: 'HH', buildingCode: '620' },
  'pickard hall': { abbreviation: 'PKH', buildingCode: '660' },
  'life science building': { abbreviation: 'LS', buildingCode: '627' },
  'health center': { buildingCode: '609' },
  'thermal energy plant': { buildingCode: '665' },
  'business building': { abbreviation: 'COBA', buildingCode: '649' },
  'uta bookstore': { buildingCode: 'BS' },
  'fine arts building': { abbreviation: 'FA', buildingCode: '501' },
  'texas hall': { abbreviation: 'TXH' },
  'university administration building': { abbreviation: 'UAB' },
  'maverick activities center': { abbreviation: 'MAC' },
  'cappa building': { abbreviation: 'CAPPA' },
  'nanotech building': { abbreviation: 'NANO' },
  'physical education': { name: 'Physical Education Building', abbreviation: 'PE' },
  'aerodynamics research building': { abbreviation: 'ARB' },
  'continuing education/workforce development': { abbreviation: 'CEWD' },

  // Residence halls and campus apartments -- the US-04 start points.
  'arlington hall': { category: 'residence', buildingCode: '701' },
  'kalpana chawla hall': { category: 'residence', abbreviation: 'KC', buildingCode: '697' },
  'vandergriff hall': { category: 'residence' },
  'trinity hall': { category: 'residence' },
  'university village': { category: 'apartment' },
  'timber brook': { category: 'apartment' },
  'richlyn apartments': { category: 'apartment' },
};

/**
 * OSM buildings inside the campus boundary that are not UTA facilities. Lowercased names.
 * Parking garages are excluded separately -- they come in through the lot layer instead, so
 * they are not duplicated as tappable buildings.
 */
export const EXCLUDED_BUILDING_NAMES: readonly string[] = [
  'uta police department',
  'baptist student ministry',
  'christian campus center',
  'the wesley foundation',
];

/** OSM parking areas it does name, mapped onto the lot ids the permit rules already use. */
export const LOT_LABELS_BY_NAME: Record<string, { id: string; label: string }> = {
  'park north': { id: 'lot-park-north', label: 'Park North' },
  'park central': { id: 'lot-park-central', label: 'Park Central' },
  'park south': { id: 'lot-park-south', label: 'Park South' },
  'maverick parking garage': { id: 'lot-maverick-garage', label: 'Maverick Garage' },
  'west campus parking garage': { id: 'lot-west-campus-garage', label: 'West Campus Garage' },
};

/**
 * The rest of the lots, keyed by OSM way id, because OSM leaves them unnamed. Fill these in
 * from the import report against the PATS "Where May I Park With My Permit?" map. The `id`
 * must match a value in `PARKING_LOT_IDS` (src/constants/parking-permits.ts), or no permit
 * rule will apply to it.
 *
 * A lot that is not listed here still draws on the map, but `hasParkingRule` reports false
 * for it and the Parking tab leaves it neutral gray rather than claiming you may not park
 * there.
 *
 * Still to identify: Lots 25, 26, 27, 29, 30, 34, 35, 36, 45, 49, 50, 51, 52, 53, AO, GR, UV,
 * Upgrade 36 and Upgrade 49.
 *
 * Also open: West Campus Garage is named by OSM and mapped above, but PARKING_LOT_IDS has no
 * entry for it, so no permit rule covers it. The inception document's appendix lists it
 * alongside Lots 36 and 49 as a lot upgrade -- confirm with PATS, then add it to
 * PARKING_LOT_IDS and LOT_KIND.
 */
export const LOT_LABELS_BY_WAY: Record<number, { id: string; label: string }> = {
  // Example of the shape to add, once you have matched a way id from the report:
  // 123456789: { id: 'lot-lot-36', label: 'Lot 36' },
};
