import {
  getParkingPermission,
  isAssignedZoneHours,
  NO_PERMIT,
  PARKING_COLORS,
  PARKING_LOT_IDS,
  PARKING_PERMIT_CHOICES,
  PARKING_PERMITS,
  permitFromChoice,
} from '@/constants/parking-permits';

// Inside the fall peak weeks (see isAssignedZoneHours): Monday 2026-09-21, 9 AM vs 3 PM.
const PEAK_MORNING = new Date(2026, 8, 21, 9, 0);
const PEAK_AFTERNOON = new Date(2026, 8, 21, 15, 0);
// Outside the peak weeks entirely.
const OFF_PEAK = new Date(2026, 9, 21, 9, 0);

describe('parking permit choices', () => {
  it('offers None first, then every real permit', () => {
    expect(PARKING_PERMIT_CHOICES).toEqual([NO_PERMIT, ...PARKING_PERMITS]);
  });

  it('maps None to no permit and passes real permits through', () => {
    expect(permitFromChoice(NO_PERMIT)).toBeNull();
    expect(permitFromChoice('East Commuter')).toBe('East Commuter');
  });

  it('has a color for every permission a lot can have', () => {
    for (const lotId of Object.values(PARKING_LOT_IDS)) {
      for (const choice of PARKING_PERMIT_CHOICES) {
        const permission = getParkingPermission(permitFromChoice(choice), lotId, OFF_PEAK);
        expect(PARKING_COLORS[permission]).toBeDefined();
      }
    }
  });
});

describe('isAssignedZoneHours', () => {
  it('is true on a weekday morning inside the peak weeks', () => {
    expect(isAssignedZoneHours(PEAK_MORNING)).toBe(true);
  });

  it('is false after 1 PM, on weekends, and outside the peak weeks', () => {
    expect(isAssignedZoneHours(PEAK_AFTERNOON)).toBe(false);
    expect(isAssignedZoneHours(new Date(2026, 8, 20, 9, 0))).toBe(false); // Sunday
    expect(isAssignedZoneHours(OFF_PEAK)).toBe(false);
    expect(isAssignedZoneHours(new Date(2026, 8, 21, 6, 59))).toBe(false); // before 7 AM
  });
});

describe('getParkingPermission', () => {
  it('restricts every lot when the user has no permit', () => {
    for (const lotId of Object.values(PARKING_LOT_IDS)) {
      expect(getParkingPermission(null, lotId, OFF_PEAK)).toBe('restricted');
    }
  });

  it('says to check the signs at the mixed-use lots, whatever the permit', () => {
    const mixedUse = [
      PARKING_LOT_IDS.parkNorth,
      PARKING_LOT_IDS.parkCentral,
      PARKING_LOT_IDS.parkSouth,
      PARKING_LOT_IDS.maverickGarage,
    ];
    for (const lotId of mixedUse) {
      for (const permit of PARKING_PERMITS) {
        expect(getParkingPermission(permit, lotId, OFF_PEAK)).toBe('checkSigns');
      }
    }
  });

  it('opens Lot 36 Upgrade only to the upgrade permits', () => {
    const lot = PARKING_LOT_IDS.lot36Upgrade;
    expect(getParkingPermission('Upgrade', lot, OFF_PEAK)).toBe('allowed');
    expect(getParkingPermission('Preferred Garage', lot, OFF_PEAK)).toBe('allowed');
    expect(getParkingPermission('East Commuter', lot, OFF_PEAK)).toBe('restricted');
    expect(getParkingPermission('West Commuter', lot, OFF_PEAK)).toBe('restricted');
  });

  it('lets any commuter permit use any commuter lot outside assigned-zone hours', () => {
    for (const lotId of [PARKING_LOT_IDS.lot36, PARKING_LOT_IDS.lot45]) {
      expect(getParkingPermission('East Commuter', lotId, OFF_PEAK)).toBe('allowed');
      expect(getParkingPermission('West Commuter', lotId, OFF_PEAK)).toBe('allowed');
      expect(getParkingPermission('South Commuter', lotId, OFF_PEAK)).toBe('allowed');
      expect(getParkingPermission('East Commuter', lotId, PEAK_AFTERNOON)).toBe('allowed');
    }
  });

  it('holds commuters to their own zone during assigned-zone hours', () => {
    expect(getParkingPermission('East Commuter', PARKING_LOT_IDS.lot36, PEAK_MORNING)).toBe(
      'allowed'
    );
    expect(getParkingPermission('South Commuter', PARKING_LOT_IDS.lot36, PEAK_MORNING)).toBe(
      'restricted'
    );
    expect(getParkingPermission('South Commuter', PARKING_LOT_IDS.lot45, PEAK_MORNING)).toBe(
      'allowed'
    );
    expect(getParkingPermission('West Commuter', PARKING_LOT_IDS.lot45, PEAK_MORNING)).toBe(
      'restricted'
    );
  });

  it('lets the upgrade permits ignore assigned-zone hours', () => {
    expect(getParkingPermission('Upgrade', PARKING_LOT_IDS.lot45, PEAK_MORNING)).toBe('allowed');
    expect(getParkingPermission('Preferred Garage', PARKING_LOT_IDS.lot36, PEAK_MORNING)).toBe(
      'allowed'
    );
  });

  it('restricts lots it has no rule for', () => {
    expect(getParkingPermission('Upgrade', 'lot-not-in-the-rules', OFF_PEAK)).toBe('restricted');
    expect(getParkingPermission('East Commuter', PARKING_LOT_IDS.lotF14, OFF_PEAK)).toBe(
      'restricted'
    );
  });
});
