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
const OBSERVED: Partial<Record<string, DaySteps>> = {
  // Fills from 8, almost full by 9 until about 2, empties around 4.
  [L.lot49]: [[0, 'low'], [8, 'moderate'], [9, 'heavy'], [14, 'moderate'], [16, 'low']],
  // Empty until 9, full by 10 until about 1, empties around 4. Lot 53 follows Lot 52.
  [L.lot52]: [[0, 'low'], [9, 'moderate'], [10, 'heavy'], [13, 'moderate'], [16, 'low']],
  [L.lot53]: [[0, 'low'], [9, 'moderate'], [10, 'heavy'], [13, 'moderate'], [16, 'low']],
  // Start filling around 10 but never reach their limit; plenty of space from about 3. Lot 45 too.
  [L.lot50]: [[0, 'low'], [10, 'moderate'], [15, 'low']],
  [L.lot50North]: [[0, 'low'], [10, 'moderate'], [15, 'low']],
  [L.lot50South]: [[0, 'low'], [10, 'moderate'], [15, 'low']],
  [L.lot51]: [[0, 'low'], [10, 'moderate'], [15, 'low']],
  [L.lot45]: [[0, 'low'], [10, 'moderate'], [15, 'low']],
  // Never full; a little crowded 10 to 12.
  [L.lot49Upgrade]: [[0, 'low'], [10, 'moderate'], [12, 'low']],
};

// Lots not observed yet keep Josue's prototype (issue #41): university parking studies and student
// reports, not measured UTA occupancy. A few lots peak from 9 AM; the rest are moderate 8 to 5.
// https://www.etsu.edu/facilities/documents/mp2010.pdf (pp. 9-10)
// https://www.reddit.com/r/utarlington/comments/1mu05q9/
// https://www.reddit.com/r/utarlington/comments/1ma81lj/
// https://www.reddit.com/r/utarlington/comments/1mtpwcz/
const PROTOTYPE_HEAVY_END_HOURS: Partial<Record<string, number>> = {
  [L.lot36]: 12,
  [L.lot34]: 12,
  [L.westCampusGarage]: 11,
  [L.parkSouth]: 11,
};

function prototypeSteps(lotId: string): DaySteps {
  const end = PROTOTYPE_HEAVY_END_HOURS[lotId];
  return end === undefined
    ? [[0, 'low'], [8, 'moderate'], [17, 'low']]
    : [[0, 'low'], [8, 'moderate'], [9, 'heavy'], [end, 'moderate'], [17, 'low']];
}

/** A lot's weekday steps: observed if Anthony has watched it, else the prototype. */
export function weekdaySteps(lotId: string): DaySteps {
  return OBSERVED[lotId] ?? prototypeSteps(lotId);
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
