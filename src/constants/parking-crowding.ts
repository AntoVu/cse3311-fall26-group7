import { PARKING_LOT_IDS } from '@/constants/parking-permits';

export type ParkingCrowding = 'low' | 'moderate' | 'heavy';
export type ParkingCrowdingWindow = {
  lotId: string;
  days: number[];
  startMinute: number;
  endMinute: number;
  level: ParkingCrowding;
};

// A weekday as steps: each [hour, level] holds from that hour until the next step (or midnight).
type DaySteps = readonly (readonly [hour: number, level: ParkingCrowding])[];

const L = PARKING_LOT_IDS;

// Anthony's own observations, weekdays (2026-11-15). "Filling up" or "less crowded" is moderate,
// "almost full" or "full" is heavy, "empties" is low.
// Fills from 8, almost full by 9 until about 2, empties around 4.
const LOT_49_PATTERN: DaySteps = [[0, 'low'], [8, 'moderate'], [9, 'heavy'], [14, 'moderate'], [16, 'low']];
// Empty until 9, full by 10 until about 1, empties around 3.
const LOT_52_PATTERN: DaySteps = [[0, 'low'], [9, 'moderate'], [10, 'heavy'], [13, 'moderate'], [15, 'low']];
// Starts filling around 10 but never reaches its limit; plenty of space from about 2.
const NEVER_FULL_PATTERN: DaySteps = [[0, 'low'], [10, 'moderate'], [14, 'low']];
// Far from most buildings: a little crowded 11 to 12 at most (Anthony hasn't watched AO or UV).
const FAR_LOT_PATTERN: DaySteps = [[0, 'low'], [11, 'moderate'], [12, 'low']];

const OBSERVED: Partial<Record<string, DaySteps>> = {
  // South commuter
  [L.lot49]: LOT_49_PATTERN,
  [L.lot52]: LOT_52_PATTERN,
  [L.lot53]: LOT_52_PATTERN,
  [L.lot50]: NEVER_FULL_PATTERN,
  [L.lot50North]: NEVER_FULL_PATTERN,
  [L.lot50South]: NEVER_FULL_PATTERN,
  [L.lot51]: NEVER_FULL_PATTERN,
  [L.lot45]: NEVER_FULL_PATTERN,
  // Never full; a little crowded 10 to 12.
  [L.lot49Upgrade]: [[0, 'low'], [10, 'moderate'], [12, 'low']],
  // West commuter: Lot 34 is the west zone's Lot 49, and Lot 35 sits by the same buildings.
  [L.lot34]: LOT_49_PATTERN,
  [L.lot35]: LOT_49_PATTERN,
  [L.westCampusGarage]: LOT_52_PATTERN,
  [L.lot30]: FAR_LOT_PATTERN,
  [L.lotAO]: FAR_LOT_PATTERN,
  [L.lotUV]: FAR_LOT_PATTERN,
  // East commuter: Lot 36 is the east zone's Lot 49 but stays full until about 3, roomy from 5.
  [L.lot36]: [[0, 'low'], [8, 'moderate'], [9, 'heavy'], [15, 'moderate'], [17, 'low']],
  [L.parkNorth]: NEVER_FULL_PATTERN,
  [L.parkCentral]: NEVER_FULL_PATTERN,
  [L.parkSouth]: NEVER_FULL_PATTERN,
  // Never full; a little crowded 1 to 3.
  [L.lot36Upgrade]: [[0, 'low'], [13, 'moderate'], [15, 'low']],
};

// Lots nobody has watched (staff, resident, reduced-rate, remote, Maverick Garage) keep the baseline
// from Josue's prototype (issue #41, from university parking studies): some crowding 8 to 5.
const UNOBSERVED_PATTERN: DaySteps = [[0, 'low'], [8, 'moderate'], [17, 'low']];

/** A lot's weekday steps: observed if Anthony has watched it, else the baseline. */
export function weekdaySteps(lotId: string): DaySteps {
  return OBSERVED[lotId] ?? UNOBSERVED_PATTERN;
}

// Weekends are low all day (lots are nearly empty, per Anthony).
export const PARKING_CROWDING_WINDOWS: ParkingCrowdingWindow[] = Object.values(PARKING_LOT_IDS).flatMap((lotId) => {
  const steps = weekdaySteps(lotId);
  return [
    { lotId, days: [0, 6], startMinute: 0, endMinute: 24 * 60, level: 'low' as const },
    ...steps.map(([hour, level], k) => ({
      lotId,
      days: [1, 2, 3, 4, 5],
      startMinute: hour * 60,
      endMinute: (k + 1 < steps.length ? steps[k + 1][0] : 24) * 60,
      level,
    })),
  ];
});

// Labels for a recommended lot's row and the drawer's warning.
export const PARKING_CROWDING_LABELS: Record<ParkingCrowding, string> = {
  low: 'Plenty of space',
  moderate: 'Some space',
  heavy: 'Likely full',
};

// Minutes a driver can expect to spend finding a space, added to the walk when ranking lots.
// ponytail: a guess, not measured; tune it with the lot-by-lot crowd times.
export const CROWDING_SEARCH_MINUTES: Record<ParkingCrowding, number> = { low: 0, moderate: 2, heavy: 10 };

export const PARKING_ESTIMATE_COLORS = {
  low: '#3B82F6',
  moderate: '#22C55E',
  heavy: '#FACC15',
  restricted: '#E5484D',
} as const;
