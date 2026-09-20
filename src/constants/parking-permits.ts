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

export function isAssignedZoneHours(date: Date = new Date()): boolean {
  const day = date.getDay();
  const hour = date.getHours();

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dateOfMonth = date.getDate();

  const fallPeak =
    year === 2026 &&
    ((month === 8 && dateOfMonth >= 17) ||
      month === 9);

  const springPeak =
    year === 2027 &&
    ((month === 1 && dateOfMonth >= 12) ||
      (month === 2 && dateOfMonth <= 15));

  return (
    (fallPeak || springPeak) &&
    day >= 1 &&
    day <= 5 &&
    hour >= 7 &&
    hour < 13
  );
}

export function getParkingPermission(
  permit: ParkingPermit | null,
  lotId: string
): ParkingPermission {
  if (!permit) {
    return 'restricted';
  }

  if (
  lotId === PARKING_LOT_IDS.parkNorth ||
  lotId === PARKING_LOT_IDS.parkCentral ||
  lotId === PARKING_LOT_IDS.parkSouth ||
  lotId === PARKING_LOT_IDS.maverickGarage
) {
  return 'checkSigns';
}

  // Lot 36 Upgrade requires the appropriate Upgrade permit.
  if (lotId === PARKING_LOT_IDS.lot36Upgrade) {
  return permit === 'Upgrade' || permit === 'Preferred Garage'
    ? 'allowed'
    : 'restricted';
}

  // Student Commuter parking areas
if (
  lotId === PARKING_LOT_IDS.lot36 ||
  lotId === PARKING_LOT_IDS.lot45
) {
  if (
    permit === 'Upgrade' ||
    permit === 'Preferred Garage'
  ) {
    return 'allowed';
  }

  if (
    permit === 'East Commuter' ||
    permit === 'West Commuter' ||
    permit === 'South Commuter'
  ) {
    if (!isAssignedZoneHours()) {
      return 'allowed';
    }

    if (
      lotId === PARKING_LOT_IDS.lot36 &&
      permit === 'East Commuter'
    ) {
      return 'allowed';
    }

    if (
      lotId === PARKING_LOT_IDS.lot45 &&
      permit === 'South Commuter'
    ) {
      return 'allowed';
    }

    return 'restricted';
  }

  return 'restricted';
}
  return 'restricted';
}