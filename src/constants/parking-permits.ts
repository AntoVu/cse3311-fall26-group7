export const PARKING_PERMITS = [
  'West Commuter',
  'East Commuter',
  'South Commuter',
  'Upgrade',
  'Preferred Garage',
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
  checkSigns: '#8B5CF6',
} as const;

export const PARKING_LOT_IDS = {
  lotF14: 'lot-f14',
  lot36: 'lot-lot-36',
  lot36Upgrade: 'lot-lot-36-upgrade',
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
} as const;

export type ParkingPermission =
  | 'allowed'
  | 'restricted'
  | 'timeRestricted'
  | 'checkSigns';

/**
 * Whether commuters are held to their own zone right now: weekdays 7 AM - 1 PM during the
 * first weeks of a semester, when PATS enforces assigned zones. Outside those peak weeks any
 * commuter permit parks in any commuter lot.
 */
export function isAssignedZoneHours(date: Date = new Date()): boolean {
  const day = date.getDay();
  const hour = date.getHours();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();

  const fallPeak = year === 2026 && ((month === 8 && dayOfMonth >= 17) || month === 9);
  const springPeak =
    year === 2027 && ((month === 1 && dayOfMonth >= 12) || (month === 2 && dayOfMonth <= 15));

  return (fallPeak || springPeak) && day >= 1 && day <= 5 && hour >= 7 && hour < 13;
}

const MIXED_USE_LOTS: readonly string[] = [
  PARKING_LOT_IDS.parkNorth,
  PARKING_LOT_IDS.parkCentral,
  PARKING_LOT_IDS.parkSouth,
  PARKING_LOT_IDS.maverickGarage,
];

const COMMUTER_LOTS: readonly string[] = [PARKING_LOT_IDS.lot36, PARKING_LOT_IDS.lot45];

// Which commuter permit owns each commuter lot during assigned-zone hours.
const COMMUTER_LOT_ZONE: Record<string, ParkingPermit> = {
  [PARKING_LOT_IDS.lot36]: 'East Commuter',
  [PARKING_LOT_IDS.lot45]: 'South Commuter',
};

const COMMUTER_PERMITS: readonly ParkingPermit[] = [
  'East Commuter',
  'West Commuter',
  'South Commuter',
];

// Upgrade and Preferred Garage cover everything a commuter permit covers, and more.
const UPGRADE_PERMITS: readonly ParkingPermit[] = ['Upgrade', 'Preferred Garage'];

/**
 * How the given permit may use a lot, which is the color the Parking tab paints it. Lots this
 * doesn't know about come back 'restricted'; `null` (the "None" choice) restricts everything.
 * `now` only matters for commuter lots during assigned-zone hours; tests pass it explicitly.
 */
export function getParkingPermission(
  permit: ParkingPermit | null,
  lotId: string,
  now: Date = new Date()
): ParkingPermission {
  if (!permit) return 'restricted';

  // Part resident, part visitor, part permit: the signs are the only reliable source.
  if (MIXED_USE_LOTS.includes(lotId)) return 'checkSigns';

  if (lotId === PARKING_LOT_IDS.lot36Upgrade) {
    return UPGRADE_PERMITS.includes(permit) ? 'allowed' : 'restricted';
  }

  if (COMMUTER_LOTS.includes(lotId)) {
    if (UPGRADE_PERMITS.includes(permit)) return 'allowed';
    if (!COMMUTER_PERMITS.includes(permit)) return 'restricted';
    // Outside peak weeks any commuter lot works; during them, only your own zone.
    if (!isAssignedZoneHours(now)) return 'allowed';
    return COMMUTER_LOT_ZONE[lotId] === permit ? 'allowed' : 'restricted';
  }

  return 'restricted';
}