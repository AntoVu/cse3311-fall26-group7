export const PARKING_PERMITS = [
  'Preferred Garage',
  'Student Upgrade Lot 36',
  'Student Upgrade Lot 49',
  'West Commuter',
  'East Commuter',
  'South Commuter',
  'Reduced Rate Greek Row Lot',
  'Reduced Rate Lot 29',
  'Remote Park & Ride',
] as const;

export type ParkingPermit = (typeof PARKING_PERMITS)[number];

// "None" = the user has no permit; getParkingPermission treats that as null.
export const NO_PERMIT = 'None';
export type ParkingPermitChoice = ParkingPermit | typeof NO_PERMIT;
export const PARKING_PERMIT_CHOICES: readonly ParkingPermitChoice[] = [NO_PERMIT, ...PARKING_PERMITS];

export function permitFromChoice(choice: ParkingPermitChoice): ParkingPermit | null {
  return choice === NO_PERMIT ? null : choice;
}

export const PARKING_COLORS = {
  allowed: '#22C55E',
  restricted: '#E5484D',
  timeRestricted: '#FACC15',
} as const;

// Ids match CAMPUS_LOTS where the lot is traced. The rest have rules but no footprint yet, so
// they paint nothing until someone traces them into src/data/campus-lots.ts with the same id.
export const PARKING_LOT_IDS = {
  lotF14: 'lot-f14',
  lot36: 'lot-lot-36',
  lot36Upgrade: 'lot-lot-36-upgrade',
  lot49Upgrade: 'lot-lot-49-upgrade',
  lotF15: 'lot-f15',
  lotF12: 'lot-f12',
  lotF11: 'lot-f11',
  lotF38: 'lot-f38',
  parkNorth: 'lot-park-north',
  parkCentral: 'lot-park-central',
  parkSouth: 'lot-park-south',
  maverickGarage: 'lot-maverick-garage',
  lotF13: 'lot-lot-f13',
  lotCN: 'lot-lot-cn',
  lotCS: 'lot-lot-cs',
  lotF10: 'lot-lot-f10',
  lot45: 'lot-lot-45',
  // West commuter
  lot35: 'lot-lot-35',
  lot34: 'lot-lot-34',
  lot30: 'lot-lot-30',
  lotAO: 'lot-lot-ao',
  lotUV: 'lot-lot-uv',
  // South commuter (Lot 49 is the commuter lot, not Upgrade Lot 49)
  lot53: 'lot-lot-53',
  lot52: 'lot-lot-52',
  lot49: 'lot-lot-49',
  lot50: 'lot-lot-50',
  lot51: 'lot-lot-51',
  // Reduced rate
  lotGR: 'lot-lot-gr',
  lot29: 'lot-lot-29',
  // Remote park & ride
  lot25: 'lot-lot-25',
  lot26: 'lot-lot-26',
  lot27: 'lot-lot-27',
} as const;

export type ParkingPermission = 'allowed' | 'restricted' | 'timeRestricted';

type LotKind =
  | 'westCommuter'
  | 'eastCommuter'
  | 'southCommuter'
  | 'upgrade36'
  | 'upgrade49'
  | 'maverickGarage'
  | 'greekRow'
  | 'lot29'
  | 'remote'
  // Faculty (F) lots and Lots CN/CS: no student permit covers them during the day.
  | 'other';

const L = PARKING_LOT_IDS;

const LOT_KIND: Record<string, LotKind> = {
  [L.lot35]: 'westCommuter',
  [L.lot34]: 'westCommuter',
  [L.lot30]: 'westCommuter',
  [L.lotAO]: 'westCommuter',
  [L.lotUV]: 'westCommuter',
  [L.lot36]: 'eastCommuter',
  [L.parkNorth]: 'eastCommuter',
  [L.parkCentral]: 'eastCommuter',
  [L.parkSouth]: 'eastCommuter',
  [L.lot45]: 'southCommuter',
  [L.lot53]: 'southCommuter',
  [L.lot52]: 'southCommuter',
  [L.lot49]: 'southCommuter',
  [L.lot50]: 'southCommuter',
  [L.lot51]: 'southCommuter',
  [L.lot36Upgrade]: 'upgrade36',
  [L.lot49Upgrade]: 'upgrade49',
  [L.maverickGarage]: 'maverickGarage',
  [L.lotGR]: 'greekRow',
  [L.lot29]: 'lot29',
  [L.lot25]: 'remote',
  [L.lot26]: 'remote',
  [L.lot27]: 'remote',
  [L.lotF14]: 'other',
  [L.lotF15]: 'other',
  [L.lotF12]: 'other',
  [L.lotF11]: 'other',
  [L.lotF38]: 'other',
  [L.lotF13]: 'other',
  [L.lotF10]: 'other',
  [L.lotCN]: 'other',
  [L.lotCS]: 'other',
};

const COMMUTER_KINDS: readonly LotKind[] = ['westCommuter', 'eastCommuter', 'southCommuter'];
const REDUCED_RATE_KINDS: readonly LotKind[] = ['greekRow', 'lot29'];

// The lowest tiers: what a commuter permit may use from 1 PM on weekdays, and what every
// higher permit covers all day.
const STUDENT_TIER_KINDS: readonly LotKind[] = [...COMMUTER_KINDS, ...REDUCED_RATE_KINDS, 'remote'];

const PERMIT_KINDS: Record<ParkingPermit, readonly LotKind[]> = {
  'Preferred Garage': ['maverickGarage', 'upgrade36', 'upgrade49', ...STUDENT_TIER_KINDS],
  'Student Upgrade Lot 36': ['upgrade36', ...STUDENT_TIER_KINDS],
  'Student Upgrade Lot 49': ['upgrade49', ...STUDENT_TIER_KINDS],
  'West Commuter': ['westCommuter', ...REDUCED_RATE_KINDS, 'remote'],
  'East Commuter': ['eastCommuter', ...REDUCED_RATE_KINDS, 'remote'],
  'South Commuter': ['southCommuter', ...REDUCED_RATE_KINDS, 'remote'],
  'Reduced Rate Greek Row Lot': ['greekRow', 'remote'],
  'Reduced Rate Lot 29': ['lot29', 'remote'],
  'Remote Park & Ride': ['remote'],
};

const COMMUTER_PERMITS: readonly ParkingPermit[] = ['West Commuter', 'East Commuter', 'South Commuter'];

const DAY_STARTS_AT_HOUR = 7;
const COMMUTER_TIER_OPENS_AT_HOUR = 13;
const AFTER_HOURS_START_HOUR = 19;

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Every permit may use every lot on weekends and on weekdays before 7 AM and from 7 PM.
function isAfterHours(date: Date): boolean {
  const hour = date.getHours();
  return isWeekend(date) || hour < DAY_STARTS_AT_HOUR || hour >= AFTER_HOURS_START_HOUR;
}

/**
 * How the given permit may use a lot right now, which is the color the Parking tab paints it.
 * Lots this doesn't know about come back 'restricted'; `null` (the "None" choice) restricts
 * everything. `timeRestricted` means a commuter permit that will be allowed there at 1 PM today.
 * `now` defaults to the real clock; tests pass it explicitly.
 */
export function getParkingPermission(
  permit: ParkingPermit | null,
  lotId: string,
  now: Date = new Date()
): ParkingPermission {
  if (!permit) return 'restricted';

  const kind = LOT_KIND[lotId];
  if (!kind) return 'restricted';

  if (isAfterHours(now)) return 'allowed';
  if (PERMIT_KINDS[permit].includes(kind)) return 'allowed';

  // Weekday daytime: commuters are held to their own zone until 1 PM, then may use any
  // student commuter tier or below (never upgrade lots or the Maverick Garage).
  if (COMMUTER_PERMITS.includes(permit) && STUDENT_TIER_KINDS.includes(kind)) {
    return now.getHours() >= COMMUTER_TIER_OPENS_AT_HOUR ? 'allowed' : 'timeRestricted';
  }

  return 'restricted';
}
