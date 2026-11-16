import { PARKING_LOT_IDS } from '@/constants/parking-permits';

export type ParkingCrowding = 'low' | 'moderate' | 'heavy';
export type ParkingCrowdingWindow = {
  lotId: string;
  days: number[];
  startMinute: number;
  endMinute: number;
  level: ParkingCrowding;
};

// Prototype schedules informed by university studies, not measured UTA occupancy:
// https://www.etsu.edu/facilities/documents/mp2010.pdf (pp. 9–10)
// https://www.csus.edu/parking-transportation/visitor-information/event-parking.html
// Exact windows and uniform weekday defaults are approved assumptions. Team observations
// identify these ordinary lots as busy around 10 AM; peak durations are adopted approximations.
// West Campus Garage and Lot 45 were also confirmed by the team after reviewing student
// reports; Park South is a provisional assumption from weaker anecdotal reports.
// https://www.reddit.com/r/utarlington/comments/1mu05q9/
// https://www.reddit.com/r/utarlington/comments/1ma81lj/
// https://www.reddit.com/r/utarlington/comments/1mtpwcz/
// These reports do not establish measured occupancy or exact recurring peak hours.
// Separate upgrade sections do not inherit that peak. Weekends are low all day (lots are nearly
// empty, per Anthony, 2026-11-15).
// All peaks start at 9 AM; end hours are exclusive and can differ by lot.
const HEAVY_END_HOURS: Partial<Record<string, number>> = {
  [PARKING_LOT_IDS.lot36]: 12,
  [PARKING_LOT_IDS.lot34]: 12,
  [PARKING_LOT_IDS.lot49]: 12,
  [PARKING_LOT_IDS.lot52]: 12,
  [PARKING_LOT_IDS.westCampusGarage]: 11,
  [PARKING_LOT_IDS.lot45]: 13,
  [PARKING_LOT_IDS.parkSouth]: 11,
};

export const PARKING_CROWDING_WINDOWS: ParkingCrowdingWindow[] = Object.values(PARKING_LOT_IDS).flatMap((lotId) => {
  const days = [1, 2, 3, 4, 5];
  const heavyEndHour = HEAVY_END_HOURS[lotId];
  const window = (startHour: number, endHour: number, level: ParkingCrowdingWindow['level']): ParkingCrowdingWindow => ({
    lotId, days, startMinute: startHour * 60, endMinute: endHour * 60, level,
  });
  return [
    { lotId, days: [0, 6], startMinute: 0, endMinute: 24 * 60, level: 'low' },
    window(0, 8, 'low'),
    ...(heavyEndHour !== undefined
      ? [window(8, 9, 'moderate'), window(9, heavyEndHour, 'heavy'), window(heavyEndHour, 17, 'moderate')]
      : [window(8, 17, 'moderate')]),
    window(17, 24, 'low'),
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
