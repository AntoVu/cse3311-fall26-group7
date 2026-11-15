import { buildingMatch } from '@/data/buildings';
import type { CampusLot, Coordinate, MapNode, PoiCategory, PointOfInterest } from '@/types/map';

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
  | { kind: 'pin'; coordinate: Coordinate }
  /** Inside a traced building, at a room's door. Set from Settings > Developer only. */
  | { kind: 'room'; poiId: string; room: string };

export type ResolvedStartPoint = {
  label: string;
  coordinate: Coordinate;
  /** The graph node to leave from, when the start is indoors (snapping skips indoor nodes). */
  nodeId?: string;
  /** The building (POI id) or lot id it is, so maps can light it up. None for a location or pin. */
  placeId?: string;
};

export type StartPointContext = {
  pois: PointOfInterest[];
  lots: CampusLot[];
  /** Null when GPS has not been granted, is still fixing, or is unavailable. */
  userLocation: Coordinate | null;
  /** Looks up a room's door node; without it a room start cannot be resolved. */
  findRoom?: (poiId: string, room: string) => Pick<MapNode, 'id' | 'coordinate'> | null;
};

export const CURRENT_LOCATION_LABEL = 'Current Location';
export const DROPPED_PIN_LABEL = 'Dropped Pin';

/** Which places may be a start point. Classrooms are destinations, not origins. */
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
      return poi ? { label: poi.name, coordinate: poi.coordinate, placeId: poi.id } : null;
    }

    case 'lot': {
      const lot = context.lots.find((candidate) => candidate.id === start.lotId);
      return lot ? { label: lot.label, coordinate: lot.coordinate, placeId: lot.id } : null;
    }

    case 'room': {
      const poi = context.pois.find((candidate) => candidate.id === start.poiId);
      const door = poi ? context.findRoom?.(start.poiId, start.room) : null;
      return poi && door
        ? { label: `${poi.name} ${start.room}`, coordinate: door.coordinate, nodeId: door.id, placeId: poi.id }
        : null;
    }
  }
}

export type StartPointOption = {
  key: string;
  label: string;
  /** Section heading in the picker. */
  group: string;
  /** A building's short code ("NH"), which the search also matches. */
  abbreviation?: string;
  startPoint: StartPoint;
};

/**
 * The list the start-point picker shows: your own position, then somewhere you might live,
 * then somewhere you might have parked, then every other building (a walk from your last class).
 *
 * Lots with no label are left out -- those are parking polygons nobody has matched to a lot
 * id yet (see src/data/map-labels.ts), and a blank row would be unpickable.
 */
export function startPointOptions(
  pois: PointOfInterest[],
  lots: CampusLot[],
  /** The saved home (Settings > On-Campus Residence), listed right after Current Location. */
  homeId?: string | null
): StartPointOption[] {
  const byLabel = (a: StartPointOption, b: StartPointOption) => a.label.localeCompare(b.label);

  const buildings = (category: PoiCategory, group: string) =>
    pois
      .filter((poi) => poi.category === category)
      .map((poi): StartPointOption => ({
        key: `poi:${poi.id}`,
        label: poi.name,
        group,
        ...(poi.abbreviation && { abbreviation: poi.abbreviation }),
        startPoint: { kind: 'building', poiId: poi.id },
      }))
      .sort(byLabel);

  const parking = lots
    .filter((lot) => lot.label.trim() !== '')
    .map((lot): StartPointOption => ({
      key: `lot:${lot.id}`,
      label: lot.label,
      group: 'Parking',
      startPoint: { kind: 'lot', lotId: lot.id },
    }))
    .sort(byLabel);

  return [
    {
      key: 'current',
      label: CURRENT_LOCATION_LABEL,
      group: 'You',
      startPoint: { kind: 'currentLocation' },
    },
    ...pois
      .filter((poi) => poi.id === homeId)
      .map((poi): StartPointOption => ({
        key: 'home',
        label: `Home: ${poi.name}`,
        group: 'You',
        startPoint: { kind: 'building', poiId: poi.id },
      })),
    ...buildings('residence', 'Residence Halls'),
    ...buildings('apartment', 'Apartments'),
    ...parking,
    ...buildings('academic', 'Academic Buildings'),
    ...buildings('administration', 'Administration'),
    ...buildings('misc', 'Other Buildings'),
    ...buildings('outdoor', 'Athletics & Outdoor'),
    ...buildings('greek', 'Fraternities and Sororities'),
  ];
}

/**
 * The picker's search: options whose name or abbreviation contains the text, ignoring case.
 * Current Location and Home (group "You") always stay, so the usual pick is never filtered away.
 */
export function filterStartPointOptions(options: StartPointOption[], query: string): StartPointOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return options;
  return options.filter(
    (option) =>
      option.group === 'You' ||
      (option.startPoint.kind === 'building'
        ? buildingMatch({ id: option.startPoint.poiId, name: option.label, abbreviation: option.abbreviation }, query) > 0
        : option.label.toLowerCase().includes(needle))
  );
}
