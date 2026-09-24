import type { CampusLot, Coordinate, PointOfInterest } from '@/types/map';

/**
 * Where a route begins (US-04: residence halls and campus apartments as start points, plus
 * the user's own position).
 *
 * Stored as a reference rather than a coordinate so the choice survives a map re-import:
 * "Arlington Hall" still means Arlington Hall after its footprint moves a few feet. A dropped
 * pin is the exception -- it is a coordinate and nothing else.
 */
export type StartPoint =
  | { kind: 'currentLocation' }
  | { kind: 'building'; poiId: string }
  | { kind: 'lot'; lotId: string }
  | { kind: 'pin'; coordinate: Coordinate };

export type ResolvedStartPoint = {
  label: string;
  coordinate: Coordinate;
};

export type StartPointContext = {
  pois: PointOfInterest[];
  lots: CampusLot[];
  /** Null when GPS has not been granted, is still fixing, or is unavailable. */
  userLocation: Coordinate | null;
};

export const CURRENT_LOCATION_LABEL = 'Current Location';
export const DROPPED_PIN_LABEL = 'Dropped Pin';

/** Which places may be a start point. Classrooms are destinations, not origins. */
type HomeCategory = 'residence' | 'apartment';

/**
 * Turns a stored start point into something routable, or null when it cannot be resolved --
 * the location is unknown, or the place has gone from the data since it was chosen. Callers
 * treat null as "ask the user to pick again" rather than an error.
 */
export function resolveStartPoint(
  start: StartPoint,
  context: StartPointContext
): ResolvedStartPoint | null {
  switch (start.kind) {
    case 'currentLocation':
      return context.userLocation
        ? { label: CURRENT_LOCATION_LABEL, coordinate: context.userLocation }
        : null;

    case 'pin':
      return { label: DROPPED_PIN_LABEL, coordinate: start.coordinate };

    case 'building': {
      const poi = context.pois.find((candidate) => candidate.id === start.poiId);
      return poi ? { label: poi.name, coordinate: poi.coordinate } : null;
    }

    case 'lot': {
      const lot = context.lots.find((candidate) => candidate.id === start.lotId);
      return lot ? { label: lot.label, coordinate: lot.coordinate } : null;
    }
  }
}

export type StartPointOption = {
  key: string;
  label: string;
  /** Section heading in the picker. */
  group: string;
  startPoint: StartPoint;
};

/**
 * The list the start-point picker shows: your own position, then somewhere you might live,
 * then somewhere you might have parked.
 *
 * Lots with no label are left out -- those are parking polygons nobody has matched to a lot
 * id yet (see src/data/map-labels.ts), and a blank row would be unpickable.
 */
export function startPointOptions(
  pois: PointOfInterest[],
  lots: CampusLot[]
): StartPointOption[] {
  const byLabel = (a: StartPointOption, b: StartPointOption) => a.label.localeCompare(b.label);

  const homes = (category: HomeCategory, group: string) =>
    pois
      .filter((poi) => poi.category === category)
      .map((poi) => ({
        key: `poi:${poi.id}`,
        label: poi.name,
        group,
        startPoint: { kind: 'building', poiId: poi.id } as StartPoint,
      }))
      .sort(byLabel);

  const parking = lots
    .filter((lot) => lot.label.trim() !== '')
    .map((lot) => ({
      key: `lot:${lot.id}`,
      label: lot.label,
      group: 'Parking',
      startPoint: { kind: 'lot', lotId: lot.id } as StartPoint,
    }))
    .sort(byLabel);

  return [
    {
      key: 'current',
      label: CURRENT_LOCATION_LABEL,
      group: 'You',
      startPoint: { kind: 'currentLocation' },
    },
    ...homes('residence', 'Residence Halls'),
    ...homes('apartment', 'Apartments'),
    ...parking,
  ];
}
