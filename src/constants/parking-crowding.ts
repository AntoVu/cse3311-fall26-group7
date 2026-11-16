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
  // Reduced-rate and remote lots are as far out as Lot 30 (Anthony agreed they'd follow it).
  [L.lotGR]: FAR_LOT_PATTERN,
  [L.lot29]: FAR_LOT_PATTERN,
  [L.lot25]: FAR_LOT_PATTERN,
  [L.lot26]: FAR_LOT_PATTERN,
  [L.lot27]: FAR_LOT_PATTERN,
  // East commuter: Lot 36 is the east zone's Lot 49 but stays full until about 3, roomy from 5.
  [L.lot36]: [[0, 'low'], [8, 'moderate'], [9, 'heavy'], [15, 'moderate'], [17, 'low']],
  [L.parkNorth]: NEVER_FULL_PATTERN,
  [L.parkCentral]: NEVER_FULL_PATTERN,
  [L.parkSouth]: NEVER_FULL_PATTERN,
  // Never full; a little crowded 1 to 3.
  [L.lot36Upgrade]: [[0, 'low'], [13, 'moderate'], [15, 'low']],
};

// Faculty/staff lots (the F lots and Lots 24, 28, 39) never fill: some crowding 9 to 3, per Anthony.
const STAFF_PATTERN: DaySteps = [[0, 'low'], [9, 'moderate'], [15, 'low']];
const STAFF_LOTS: readonly string[] = [
  ...Object.values(L).filter((id) => /^lot-f\d+$/.test(id)),
  L.lot24,
  L.lot28,
  L.lot39,
];

// Any other lot Anthony didn't list (resident lots, Maverick Garage): empty until 9,
// almost full by 11, some space again at 1, plenty at 3.
const STANDARD_PATTERN: DaySteps = [[0, 'low'], [9, 'moderate'], [11, 'heavy'], [13, 'moderate'], [15, 'low']];

/** A lot's Monday-Thursday steps: observed if Anthony has watched it, else the standard pattern. */
export function weekdaySteps(lotId: string): DaySteps {
  return OBSERVED[lotId] ?? (STAFF_LOTS.includes(lotId) ? STAFF_PATTERN : STANDARD_PATTERN);
}

type MinuteSteps = [minute: number, level: ParkingCrowding][];
const RANK: Record<ParkingCrowding, number> = { low: 0, moderate: 1, heavy: 2 };
const FRIDAY_SHIFT_MINUTES = 30;

/**
 * Fridays: every change toward fuller comes 30 minutes later and every change toward emptier 30
 * minutes earlier. A phase squeezed to nothing (11 to 12 becomes 11:30 to 11:30) is dropped; the
 * phases around it then meet halfway, or merge when they are the same level.
 */
export function fridaySteps(steps: DaySteps): MinuteSteps {
  const out: MinuteSteps = steps.map(([hour, level], k) => {
    if (k === 0) return [hour * 60, level];
    const fuller = RANK[level] > RANK[steps[k - 1][1]];
    return [hour * 60 + (fuller ? FRIDAY_SHIFT_MINUTES : -FRIDAY_SHIFT_MINUTES), level];
  });
  for (let k = 1; k < out.length; ) {
    const end = k + 1 < out.length ? out[k + 1][0] : 24 * 60;
    if (end <= out[k][0]) {
      if (k + 1 < out.length) out[k + 1] = [(out[k][0] + end) / 2, out[k + 1][1]];
      out.splice(k, 1);
      k = 1;
    } else if (out[k][1] === out[k - 1][1]) {
      out.splice(k, 1);
      k = 1;
    } else k++;
  }
  return out;
}

function windowsFrom(lotId: string, days: number[], steps: MinuteSteps): ParkingCrowdingWindow[] {
  return steps.map(([minute, level], k) => ({
    lotId,
    days,
    startMinute: minute,
    endMinute: k + 1 < steps.length ? steps[k + 1][0] : 24 * 60,
    level,
  }));
}

// Weekends are low all day (lots are nearly empty, per Anthony).
export const PARKING_CROWDING_WINDOWS: ParkingCrowdingWindow[] = Object.values(PARKING_LOT_IDS).flatMap((lotId) => {
  const steps = weekdaySteps(lotId);
  return [
    { lotId, days: [0, 6], startMinute: 0, endMinute: 24 * 60, level: 'low' as const },
    ...windowsFrom(lotId, [1, 2, 3, 4], steps.map(([hour, level]) => [hour * 60, level])),
    ...windowsFrom(lotId, [5], fridaySteps(steps)),
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
