import {
  getParkingPermission,
  NO_PERMIT,
  PARKING_COLORS,
  PARKING_LOT_IDS,
  PARKING_PERMIT_CHOICES,
  PARKING_PERMITS,
  permitFromChoice,
  type ParkingPermission,
} from '@/constants/parking-permits';
import { CAMPUS_LOTS } from '@/data/campus-lots';

// 2026-09-21 is a Monday, 2026-09-20 a Sunday, 2026-09-19 a Saturday.
const WEEKDAY_MORNING = new Date(2026, 8, 21, 9, 0);
const WEEKDAY_AFTERNOON = new Date(2026, 8, 21, 15, 0);
const WEEKDAY_EVENING = new Date(2026, 8, 21, 20, 0);
const WEEKDAY_BEFORE_DAWN = new Date(2026, 8, 21, 3, 0);
const SATURDAY = new Date(2026, 8, 19, 12, 0);
const SUNDAY = new Date(2026, 8, 20, 12, 0);

const L = PARKING_LOT_IDS;
const WEST_LOTS = [L.lot35, L.lot34, L.lot30, L.lotAO, L.lotUV];
const EAST_LOTS = [L.lot36, L.parkNorth, L.parkCentral, L.parkSouth];
const SOUTH_LOTS = [L.lot45, L.lot53, L.lot52, L.lot49, L.lot50, L.lot51];
const COMMUTER_LOTS = [...WEST_LOTS, ...EAST_LOTS, ...SOUTH_LOTS];
const REDUCED_RATE_LOTS = [L.lotGR, L.lot29];
const REMOTE_LOTS = [L.lot25, L.lot26, L.lot27];
const UPGRADE_LOTS = [L.lot36Upgrade, L.lot49Upgrade, L.maverickGarage];
const STAFF_LOTS = [L.lotF14, L.lotF15, L.lotF12, L.lotF11, L.lotF38, L.lotF13, L.lotF10, L.lotCN, L.lotCS];
const ALL_LOTS = Object.values(L);

// The distinct permissions a permit gets across a set of lots at one moment.
function permissionsFor(
  permit: (typeof PARKING_PERMITS)[number] | null,
  lots: readonly string[],
  now: Date
): ParkingPermission[] {
  return [...new Set(lots.map((lotId) => getParkingPermission(permit, lotId, now)))];
}

describe('parking permit choices', () => {
  it('offers None first, then every real permit', () => {
    expect(PARKING_PERMIT_CHOICES).toEqual([NO_PERMIT, ...PARKING_PERMITS]);
  });

  it('offers exactly the nine purchasable permits', () => {
    expect(PARKING_PERMITS).toEqual([
      'Preferred Garage',
      'Student Upgrade Lot 36',
      'Student Upgrade Lot 49',
      'West Commuter',
      'East Commuter',
      'South Commuter',
      'Reduced Rate Greek Row Lot',
      'Reduced Rate Lot 29',
      'Remote Park & Ride',
    ]);
  });

  it('maps None to no permit and passes real permits through', () => {
    expect(permitFromChoice(NO_PERMIT)).toBeNull();
    expect(permitFromChoice('East Commuter')).toBe('East Commuter');
  });

  it('has a color for every permission a lot can have', () => {
    for (const lotId of ALL_LOTS) {
      for (const choice of PARKING_PERMIT_CHOICES) {
        for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON, SUNDAY]) {
          const permission = getParkingPermission(permitFromChoice(choice), lotId, now);
          expect(PARKING_COLORS[permission]).toBeDefined();
        }
      }
    }
  });
});

describe('getParkingPermission: no permit and unknown lots', () => {
  it('restricts every lot when the user has no permit, even after hours', () => {
    for (const now of [WEEKDAY_MORNING, WEEKDAY_EVENING, SUNDAY]) {
      expect(permissionsFor(null, ALL_LOTS, now)).toEqual(['restricted']);
    }
  });

  it('restricts a lot it has no rule for, even after hours', () => {
    expect(getParkingPermission('Preferred Garage', 'lot-not-in-the-rules', SUNDAY)).toBe(
      'restricted'
    );
  });

  it('has a rule for every lot drawn on the map', () => {
    // After hours every known lot opens to every permit, so "allowed" proves the lot is known.
    for (const lot of CAMPUS_LOTS) {
      expect([lot.id, getParkingPermission('Remote Park & Ride', lot.id, SUNDAY)]).toEqual([
        lot.id,
        'allowed',
      ]);
    }
  });
});

describe('getParkingPermission: what each permit covers during the day', () => {
  it('Preferred Garage: Maverick Garage, both upgrade lots, and every commuter/reduced/remote lot', () => {
    const covered = [...UPGRADE_LOTS, ...COMMUTER_LOTS, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS];
    expect(permissionsFor('Preferred Garage', covered, WEEKDAY_MORNING)).toEqual(['allowed']);
    expect(permissionsFor('Preferred Garage', STAFF_LOTS, WEEKDAY_MORNING)).toEqual(['restricted']);
  });

  it('Student Upgrade Lot 36: its upgrade lot plus commuter, reduced-rate and remote lots at any hour', () => {
    const permit = 'Student Upgrade Lot 36';
    const covered = [L.lot36Upgrade, ...COMMUTER_LOTS, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS];
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor(permit, covered, now)).toEqual(['allowed']);
      expect(permissionsFor(permit, [L.lot49Upgrade, L.maverickGarage], now)).toEqual(['restricted']);
      expect(permissionsFor(permit, STAFF_LOTS, now)).toEqual(['restricted']);
    }
  });

  it('Student Upgrade Lot 49: the same, but for Upgrade Lot 49', () => {
    const permit = 'Student Upgrade Lot 49';
    const covered = [L.lot49Upgrade, ...COMMUTER_LOTS, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS];
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor(permit, covered, now)).toEqual(['allowed']);
      expect(permissionsFor(permit, [L.lot36Upgrade, L.maverickGarage], now)).toEqual(['restricted']);
      expect(permissionsFor(permit, STAFF_LOTS, now)).toEqual(['restricted']);
    }
  });

  it('keeps CN and CS out of the commuter lots', () => {
    for (const permit of PARKING_PERMITS) {
      expect(permissionsFor(permit, [L.lotCN, L.lotCS], WEEKDAY_AFTERNOON)).toEqual(['restricted']);
    }
  });

  it('Reduced Rate Greek Row Lot: Lot GR and the remote lots only', () => {
    const permit = 'Reduced Rate Greek Row Lot';
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor(permit, [L.lotGR, ...REMOTE_LOTS], now)).toEqual(['allowed']);
      const others = [L.lot29, ...COMMUTER_LOTS, ...UPGRADE_LOTS, ...STAFF_LOTS];
      expect(permissionsFor(permit, others, now)).toEqual(['restricted']);
    }
  });

  it('Reduced Rate Lot 29: Lot 29 and the remote lots only', () => {
    const permit = 'Reduced Rate Lot 29';
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor(permit, [L.lot29, ...REMOTE_LOTS], now)).toEqual(['allowed']);
      const others = [L.lotGR, ...COMMUTER_LOTS, ...UPGRADE_LOTS, ...STAFF_LOTS];
      expect(permissionsFor(permit, others, now)).toEqual(['restricted']);
    }
  });

  it('Remote Park & Ride: Lots 25, 26 and 27 only', () => {
    const permit = 'Remote Park & Ride';
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor(permit, REMOTE_LOTS, now)).toEqual(['allowed']);
      const others = [...REDUCED_RATE_LOTS, ...COMMUTER_LOTS, ...UPGRADE_LOTS, ...STAFF_LOTS];
      expect(permissionsFor(permit, others, now)).toEqual(['restricted']);
    }
  });
});

describe('getParkingPermission: commuter zones and the 1 PM tier', () => {
  const zones = [
    ['West Commuter', WEST_LOTS],
    ['East Commuter', EAST_LOTS],
    ['South Commuter', SOUTH_LOTS],
  ] as const;

  it.each(zones)('%s: own zone, reduced-rate and remote lots are open on weekday mornings', (permit, own) => {
    expect(permissionsFor(permit, [...own, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS], WEEKDAY_MORNING)).toEqual([
      'allowed',
    ]);
  });

  it.each(zones)('%s: other commuter zones show time-restricted on weekday mornings', (permit, own) => {
    const otherZones = COMMUTER_LOTS.filter((lotId) => !own.includes(lotId as never));
    expect(permissionsFor(permit, otherZones, WEEKDAY_MORNING)).toEqual(['timeRestricted']);
  });

  it.each(zones)('%s: upgrade lots, Maverick Garage and staff lots stay restricted in the morning', (permit) => {
    expect(permissionsFor(permit, [...UPGRADE_LOTS, ...STAFF_LOTS], WEEKDAY_MORNING)).toEqual(['restricted']);
  });

  it.each(zones)('%s: every commuter lot opens after 1 PM on weekdays', (permit) => {
    expect(
      permissionsFor(permit, [...COMMUTER_LOTS, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS], WEEKDAY_AFTERNOON)
    ).toEqual(['allowed']);
  });

  it.each(zones)('%s: still no upgrade lots, Maverick Garage or staff lots at 3 PM', (permit) => {
    expect(permissionsFor(permit, [...UPGRADE_LOTS, ...STAFF_LOTS], WEEKDAY_AFTERNOON)).toEqual(['restricted']);
  });

  it('switches at exactly 1 PM', () => {
    const justBefore = new Date(2026, 8, 21, 12, 59);
    const oneOClock = new Date(2026, 8, 21, 13, 0);
    expect(getParkingPermission('West Commuter', L.lot36, justBefore)).toBe('timeRestricted');
    expect(getParkingPermission('West Commuter', L.lot36, oneOClock)).toBe('allowed');
  });

  it('applies the zone rule every weekday, not only in the first weeks of a semester', () => {
    const midSemester = new Date(2026, 10, 9, 9, 0); // Monday 2026-11-09
    expect(getParkingPermission('South Commuter', L.lot36, midSemester)).toBe('timeRestricted');
    expect(getParkingPermission('South Commuter', L.lot45, midSemester)).toBe('allowed');
  });
});

describe('getParkingPermission: after hours', () => {
  it.each(PARKING_PERMITS)('%s may park in every lot, staff lots included, after 7 PM', (permit) => {
    expect(permissionsFor(permit, ALL_LOTS, WEEKDAY_EVENING)).toEqual(['allowed']);
  });

  it.each(PARKING_PERMITS)('%s may park in every lot on weekends', (permit) => {
    expect(permissionsFor(permit, ALL_LOTS, SATURDAY)).toEqual(['allowed']);
    expect(permissionsFor(permit, ALL_LOTS, SUNDAY)).toEqual(['allowed']);
  });

  it('treats weekday hours before 7 AM as after hours too', () => {
    expect(permissionsFor('Remote Park & Ride', ALL_LOTS, WEEKDAY_BEFORE_DAWN)).toEqual(['allowed']);
    expect(getParkingPermission('Remote Park & Ride', L.lotF14, new Date(2026, 8, 21, 6, 59))).toBe(
      'allowed'
    );
    expect(getParkingPermission('Remote Park & Ride', L.lotF14, new Date(2026, 8, 21, 7, 0))).toBe(
      'restricted'
    );
  });

  it('opens up at exactly 7 PM', () => {
    const justBefore = new Date(2026, 8, 21, 18, 59);
    const sevenOClock = new Date(2026, 8, 21, 19, 0);
    expect(getParkingPermission('West Commuter', L.lotF14, justBefore)).toBe('restricted');
    expect(getParkingPermission('West Commuter', L.lotF14, sevenOClock)).toBe('allowed');
  });

  it('opens up on Friday evening', () => {
    expect(getParkingPermission('West Commuter', L.maverickGarage, new Date(2026, 8, 25, 20, 0))).toBe(
      'allowed'
    );
  });
});
