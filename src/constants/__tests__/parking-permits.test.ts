import {
  formatHour,
  getParkingPermission,
  hasParkingRule,
  lotsOpeningAt,
  lotStatus,
  normalizePermitChoice,
  NO_PERMIT,
  PARKING_COLORS,
  PARKING_LOT_IDS,
  PARKING_PERMIT_CHOICES,
  PARKING_PERMIT_GROUPS,
  PARKING_PERMITS,
  permitFromChoice,
  type ParkingPermit,
  type ParkingPermission,
} from '@/constants/parking-permits';
import { CAMPUS_LOTS } from '@/data/campus-lots';

// 2026-09-21 is a Monday, 2026-09-20 a Sunday, 2026-09-19 a Saturday.
const WEEKDAY_MORNING = new Date(2026, 8, 21, 9, 0);
const WEEKDAY_NOON = new Date(2026, 8, 21, 12, 30);
const WEEKDAY_AFTERNOON = new Date(2026, 8, 21, 15, 0);
const WEEKDAY_EVENING = new Date(2026, 8, 21, 20, 0);
const WEEKDAY_BEFORE_DAWN = new Date(2026, 8, 21, 3, 0);
const SATURDAY = new Date(2026, 8, 19, 12, 0);
const SUNDAY = new Date(2026, 8, 20, 12, 0);

const L = PARKING_LOT_IDS;
// West Campus Garage takes the West Commuter permit, so it follows the west zone's rules.
const WEST_LOTS = [L.lot35, L.lot34, L.lot30, L.lotAO, L.lotUV, L.westCampusGarage];
const EAST_LOTS = [L.lot36, L.parkNorth, L.parkCentral, L.parkSouth];
// Lot 50 is drawn as two halves on the PATS map, 50N and 50S; both carry Lot 50's rules.
const SOUTH_LOTS = [L.lot45, L.lot53, L.lot52, L.lot49, L.lot50, L.lot50North, L.lot50South, L.lot51];
const COMMUTER_LOTS = [...WEST_LOTS, ...EAST_LOTS, ...SOUTH_LOTS];
const COLLEGE_PARK_GARAGES = [L.parkNorth, L.parkCentral, L.parkSouth];
const REDUCED_RATE_LOTS = [L.lotGR, L.lot29];
const REMOTE_LOTS = [L.lot25, L.lot26, L.lot27];
const UPGRADE_LOTS = [L.lot36Upgrade, L.lot49Upgrade, L.maverickGarage];
const STAFF_LOTS = [L.lotF14, L.lotF15, L.lotF12, L.lotF11, L.lotF38, L.lotF13, L.lotF10, L.lot24, L.lot28, L.lot39];
const RESIDENT_WEST_LOTS = [L.lotMR, L.lotWC];
const RESIDENT_EAST_LOTS = [L.lotCN, L.lotCS];
const RESIDENT_SOUTH_LOTS = [L.centennialCourt];
const RESIDENT_LOTS = [...RESIDENT_WEST_LOTS, ...RESIDENT_EAST_LOTS, ...RESIDENT_SOUTH_LOTS];
// Closed after hours to anyone without their own pass.
const CLOSED_AFTER_HOURS = [L.maverickGarage, L.centennialCourt];
const ALL_LOTS = Object.values(L);
const OPEN_AFTER_HOURS = ALL_LOTS.filter((lotId) => !CLOSED_AFTER_HOURS.includes(lotId as never));

// The distinct permissions a permit gets across a set of lots at one moment.
function permissionsFor(permit: ParkingPermit | null, lots: readonly string[], now: Date): ParkingPermission[] {
  return [...new Set(lots.map((lotId) => getParkingPermission(permit, lotId, now)))];
}

function without(lots: readonly string[], removed: readonly string[]): string[] {
  return lots.filter((lotId) => !removed.includes(lotId));
}

describe('parking permit choices', () => {
  it('offers None first, then every pass in group order', () => {
    expect(PARKING_PERMIT_CHOICES).toEqual([NO_PERMIT, ...PARKING_PERMITS]);
    expect(PARKING_PERMITS).toEqual(PARKING_PERMIT_GROUPS.flatMap((group) => group.permits));
  });

  it('groups the passes by type', () => {
    expect(PARKING_PERMIT_GROUPS.map((group) => [group.title, group.permits])).toEqual([
      ['Student commuter', ['West Commuter', 'East Commuter', 'South Commuter']],
      ['Student upgrade', ['Student Upgrade Lot 36', 'Student Upgrade Lot 49', 'Preferred Garage']],
      ['Reduced rate and remote', ['Reduced Rate', 'Remote Park & Ride']],
      ['Resident', ['Resident West', 'Resident East', 'Resident South', 'Resident Dual']],
      ['Short-term and visitor', ['Student Short-Term', 'Visitor', 'Visitor Garage']],
      ['Employee', ['Faculty/Staff']],
    ]);
  });

  it('maps None to no permit and passes real permits through', () => {
    expect(permitFromChoice(NO_PERMIT)).toBeNull();
    expect(permitFromChoice('East Commuter')).toBe('East Commuter');
  });

  it('loads the old reduced-rate passes as Reduced Rate, and anything unknown as None', () => {
    expect(normalizePermitChoice('Reduced Rate Greek Row Lot')).toBe('Reduced Rate');
    expect(normalizePermitChoice('Reduced Rate Lot 29')).toBe('Reduced Rate');
    expect(normalizePermitChoice('Resident West')).toBe('Resident West');
    expect(normalizePermitChoice('Not a pass')).toBe(NO_PERMIT);
    expect(permitFromChoice('Reduced Rate Lot 29' as never)).toBe('Reduced Rate');
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
    expect(getParkingPermission('Preferred Garage', 'lot-not-in-the-rules', SUNDAY)).toBe('restricted');
  });

  it('knows a rule for every id in PARKING_LOT_IDS', () => {
    for (const lotId of ALL_LOTS) {
      expect({ lotId, known: hasParkingRule(lotId) }).toEqual({ lotId, known: true });
    }
  });

  // The map draws every parking polygon OSM has; some are not identified. The Parking tab asks
  // hasParkingRule first so those stay neutral instead of being painted "not allowed".
  it('admits it has no rule for a lot that has not been identified', () => {
    const unidentified = CAMPUS_LOTS.filter((lot) => !hasParkingRule(lot.id));
    expect(unidentified.length).toBeGreaterThan(0);
    expect(hasParkingRule('lot-osm-999999')).toBe(false);
  });
});

describe('getParkingPermission: what each permit covers during the day', () => {
  it('Preferred Garage: Maverick Garage, both upgrade lots, and every commuter/reduced/remote lot', () => {
    const covered = [...UPGRADE_LOTS, ...COMMUTER_LOTS, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS];
    expect(permissionsFor('Preferred Garage', covered, WEEKDAY_MORNING)).toEqual(['allowed']);
    expect(permissionsFor('Preferred Garage', STAFF_LOTS, WEEKDAY_MORNING)).toEqual(['restricted']);
  });

  it.each([
    ['Student Upgrade Lot 36', L.lot36Upgrade],
    ['Student Upgrade Lot 49', L.lot49Upgrade],
  ] as const)('%s: its upgrade lot plus every commuter, reduced-rate and remote lot', (permit, own) => {
    const covered = [own, ...COMMUTER_LOTS, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS];
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor(permit, covered, now)).toEqual(['allowed']);
      expect(permissionsFor(permit, [L.maverickGarage, ...STAFF_LOTS], now)).toEqual(['restricted']);
    }
  });

  it.each([
    ['Student Upgrade Lot 36', L.lot49Upgrade],
    ['Student Upgrade Lot 49', L.lot36Upgrade],
  ] as const)('%s: the other upgrade lot opens at 12 PM on weekdays', (permit, other) => {
    expect(getParkingPermission(permit, other, WEEKDAY_MORNING)).toBe('timeRestricted');
    expect(getParkingPermission(permit, other, new Date(2026, 8, 21, 11, 59))).toBe('timeRestricted');
    expect(getParkingPermission(permit, other, new Date(2026, 8, 21, 12, 0))).toBe('allowed');
    expect(getParkingPermission(permit, other, WEEKDAY_NOON)).toBe('allowed');
  });

  it('Faculty/Staff: the F and staff lots, the College Park garages, reduced-rate and remote lots', () => {
    const covered = [...STAFF_LOTS, ...COLLEGE_PARK_GARAGES, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS];
    expect(permissionsFor('Faculty/Staff', covered, WEEKDAY_MORNING)).toEqual(['allowed']);
  });

  it('Faculty/Staff: no student commuter lots, upgrade lots or resident lots during the day', () => {
    // AO and UV are also Resident West, but Faculty/Staff gets neither half.
    const closed = [...without(COMMUTER_LOTS, COLLEGE_PARK_GARAGES), ...UPGRADE_LOTS, ...RESIDENT_LOTS];
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor('Faculty/Staff', closed, now)).toEqual(['restricted']);
    }
  });

  it('gives every drawn F lot the faculty rule', () => {
    const drawn = CAMPUS_LOTS.filter((lot) => /^lot-f\d+$/.test(lot.id)).map((lot) => lot.id);
    expect(drawn.length).toBeGreaterThan(10);
    expect(permissionsFor('Faculty/Staff', drawn, WEEKDAY_MORNING)).toEqual(['allowed']);
    expect(permissionsFor('West Commuter', drawn, WEEKDAY_MORNING)).toEqual(['restricted']);
  });

  it('keeps every other pass out of the staff lots during the day', () => {
    for (const permit of PARKING_PERMITS.filter((p) => p !== 'Faculty/Staff')) {
      expect([permit, permissionsFor(permit, STAFF_LOTS, WEEKDAY_AFTERNOON)]).toEqual([permit, ['restricted']]);
    }
  });

  it('Reduced Rate: Lot 29 and Greek Row Lot only', () => {
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor('Reduced Rate', REDUCED_RATE_LOTS, now)).toEqual(['allowed']);
      const others = [...REMOTE_LOTS, ...COMMUTER_LOTS, ...UPGRADE_LOTS, ...STAFF_LOTS];
      expect(permissionsFor('Reduced Rate', others, now)).toEqual(['restricted']);
    }
  });

  it('Remote Park & Ride: Lots 25, 26 and 27 only', () => {
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor('Remote Park & Ride', REMOTE_LOTS, now)).toEqual(['allowed']);
      const others = [...REDUCED_RATE_LOTS, ...COMMUTER_LOTS, ...UPGRADE_LOTS, ...STAFF_LOTS];
      expect(permissionsFor('Remote Park & Ride', others, now)).toEqual(['restricted']);
    }
  });
});

describe('getParkingPermission: resident passes', () => {
  const residents = [
    ['Resident West', [...RESIDENT_WEST_LOTS, L.lotAO, L.lotUV]],
    ['Resident East', [...RESIDENT_EAST_LOTS, L.parkCentral, L.parkSouth]],
    ['Resident South', RESIDENT_SOUTH_LOTS],
  ] as const;

  it.each(residents)('%s: its own zone, reduced-rate and remote lots', (permit, own) => {
    expect(permissionsFor(permit, [...own, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS], WEEKDAY_MORNING)).toEqual([
      'allowed',
    ]);
  });

  it.each(residents)('%s: no other resident zone and no commuter lot during the day', (permit, own) => {
    const others = without([...RESIDENT_LOTS, ...SOUTH_LOTS, L.lot30, L.lot36, ...UPGRADE_LOTS, ...STAFF_LOTS], own);
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor(permit, others, now)).toEqual(['restricted']);
    }
  });

  it('Resident Dual: every resident zone plus every commuter, reduced-rate and remote lot', () => {
    const covered = [...RESIDENT_LOTS, ...COMMUTER_LOTS, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS];
    expect(permissionsFor('Resident Dual', covered, WEEKDAY_MORNING)).toEqual(['allowed']);
    expect(permissionsFor('Resident Dual', [...UPGRADE_LOTS, ...STAFF_LOTS], WEEKDAY_MORNING)).toEqual([
      'restricted',
    ]);
  });
});

describe('getParkingPermission: short-term and visitor passes', () => {
  it.each(['Student Short-Term', 'Visitor'] as const)('%s: every student commuter lot all day', (permit) => {
    expect(permissionsFor(permit, COMMUTER_LOTS, WEEKDAY_MORNING)).toEqual(['allowed']);
    expect(
      permissionsFor(permit, [...UPGRADE_LOTS, ...STAFF_LOTS, ...REDUCED_RATE_LOTS], WEEKDAY_MORNING)
    ).toEqual(['restricted']);
  });

  it('Visitor: any lot from 5 PM on weekdays; Student Short-Term waits until 7 PM', () => {
    const fivePm = new Date(2026, 8, 21, 17, 0);
    expect(getParkingPermission('Visitor', L.lotF14, new Date(2026, 8, 21, 16, 59))).toBe('restricted');
    expect(getParkingPermission('Visitor', L.lotF14, fivePm)).toBe('allowed');
    expect(getParkingPermission('Student Short-Term', L.lotF14, fivePm)).toBe('restricted');
    expect(lotStatus('Visitor', L.lotF14, WEEKDAY_MORNING)).toBe('Not with your pass until 5 PM.');
  });

  it('Visitor Garage: West Campus, Maverick and College Park South garages only', () => {
    const garages = [L.westCampusGarage, L.maverickGarage, L.parkSouth];
    expect(permissionsFor('Visitor Garage', garages, WEEKDAY_MORNING)).toEqual(['allowed']);
    expect(permissionsFor('Visitor Garage', without(COMMUTER_LOTS, garages), WEEKDAY_MORNING)).toEqual([
      'restricted',
    ]);
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
    expect(permissionsFor(permit, without(COMMUTER_LOTS, own), WEEKDAY_MORNING)).toEqual(['timeRestricted']);
  });

  it.each(zones)('%s: every commuter lot, College Park garages included, opens after 1 PM', (permit) => {
    expect(
      permissionsFor(permit, [...COMMUTER_LOTS, ...REDUCED_RATE_LOTS, ...REMOTE_LOTS], WEEKDAY_AFTERNOON)
    ).toEqual(['allowed']);
  });

  it.each(zones)('%s: never upgrade lots, Maverick Garage, staff or resident lots in the day', (permit) => {
    for (const now of [WEEKDAY_MORNING, WEEKDAY_AFTERNOON]) {
      expect(permissionsFor(permit, [...UPGRADE_LOTS, ...STAFF_LOTS, ...RESIDENT_LOTS], now)).toEqual([
        'restricted',
      ]);
    }
  });

  it('switches at exactly 1 PM', () => {
    expect(getParkingPermission('West Commuter', L.lot36, new Date(2026, 8, 21, 12, 59))).toBe('timeRestricted');
    expect(getParkingPermission('West Commuter', L.lot36, new Date(2026, 8, 21, 13, 0))).toBe('allowed');
  });

  it('applies the zone rule every weekday, not only in the first weeks of a semester', () => {
    const midSemester = new Date(2026, 10, 9, 9, 0); // Monday 2026-11-09
    expect(getParkingPermission('South Commuter', L.lot36, midSemester)).toBe('timeRestricted');
    expect(getParkingPermission('South Commuter', L.lot45, midSemester)).toBe('allowed');
  });
});

describe('getParkingPermission: after hours', () => {
  it.each(PARKING_PERMITS)('%s may park in every lot but Maverick Garage and Centennial Court after 7 PM', (permit) => {
    expect(permissionsFor(permit, OPEN_AFTER_HOURS, WEEKDAY_EVENING)).toEqual(['allowed']);
  });

  it.each(PARKING_PERMITS)('%s may park in those lots on weekends too', (permit) => {
    expect(permissionsFor(permit, OPEN_AFTER_HOURS, SATURDAY)).toEqual(['allowed']);
    expect(permissionsFor(permit, OPEN_AFTER_HOURS, SUNDAY)).toEqual(['allowed']);
  });

  it('keeps Maverick Garage and Centennial Court closed to passes without them', () => {
    expect(permissionsFor('West Commuter', CLOSED_AFTER_HOURS, SUNDAY)).toEqual(['restricted']);
    expect(getParkingPermission('Preferred Garage', L.maverickGarage, SUNDAY)).toBe('allowed');
    expect(getParkingPermission('Resident South', L.centennialCourt, SUNDAY)).toBe('allowed');
    expect(lotStatus('West Commuter', L.maverickGarage, SUNDAY)).toBe("Your pass can't park here.");
  });

  it('treats weekday hours before 7 AM as after hours too', () => {
    expect(permissionsFor('Remote Park & Ride', OPEN_AFTER_HOURS, WEEKDAY_BEFORE_DAWN)).toEqual(['allowed']);
    expect(getParkingPermission('Remote Park & Ride', L.lotF14, new Date(2026, 8, 21, 6, 59))).toBe('allowed');
    expect(getParkingPermission('Remote Park & Ride', L.lotF14, new Date(2026, 8, 21, 7, 0))).toBe('restricted');
  });

  it('opens up at exactly 7 PM', () => {
    expect(getParkingPermission('West Commuter', L.lotF14, new Date(2026, 8, 21, 18, 59))).toBe('restricted');
    expect(getParkingPermission('West Commuter', L.lotF14, new Date(2026, 8, 21, 19, 0))).toBe('allowed');
  });
});

describe('lotStatus: the lot card on the Parking tab', () => {
  it('says what the pass may do there now, or when it may', () => {
    expect(lotStatus('West Commuter', L.lot35, WEEKDAY_MORNING)).toBe('Your pass can park here now.');
    expect(lotStatus('West Commuter', L.lot36, WEEKDAY_MORNING)).toBe('Your pass can park here from 1 PM.');
    expect(lotStatus('Student Upgrade Lot 36', L.lot49Upgrade, WEEKDAY_MORNING)).toBe(
      'Your pass can park here from 12 PM.'
    );
    expect(lotStatus('West Commuter', L.lotF14, WEEKDAY_MORNING)).toBe('Not with your pass until 7 PM.');
    expect(lotStatus('West Commuter', L.lotF14, WEEKDAY_EVENING)).toBe('Your pass can park here now.');
  });

  it('asks for a pass, and owns up to lots it has no rule for', () => {
    expect(lotStatus(null, L.lot35, WEEKDAY_MORNING)).toBe('Choose your pass to see if you can park here.');
    expect(lotStatus('West Commuter', 'lot-osm-123', WEEKDAY_MORNING)).toBe("This lot's rules aren't known yet.");
  });

  it('formats whole hours the way the cards say them', () => {
    expect([0, 7, 12, 13, 17, 19].map(formatHour)).toEqual(['12 AM', '7 AM', '12 PM', '1 PM', '5 PM', '7 PM']);
  });
});

describe('lotsOpeningAt: when the Parking tab says yellow lots open', () => {
  const lotIds = CAMPUS_LOTS.map((lot) => lot.id);

  it('is 1 PM for a commuter pass and 12 PM for an upgrade pass on a weekday morning', () => {
    expect(lotsOpeningAt('West Commuter', lotIds, WEEKDAY_MORNING)).toBe(13);
    expect(lotsOpeningAt('Student Upgrade Lot 49', lotIds, WEEKDAY_MORNING)).toBe(12);
  });

  it('is null once they are open, after hours, and on weekends', () => {
    expect(lotsOpeningAt('West Commuter', lotIds, WEEKDAY_AFTERNOON)).toBeNull();
    expect(lotsOpeningAt('Student Upgrade Lot 49', lotIds, WEEKDAY_NOON)).toBeNull();
    expect(lotsOpeningAt('West Commuter', lotIds, WEEKDAY_EVENING)).toBeNull();
    expect(lotsOpeningAt('West Commuter', lotIds, SATURDAY)).toBeNull();
  });

  it('is null with no pass, or a pass with nothing opening later', () => {
    expect(lotsOpeningAt(null, lotIds, WEEKDAY_MORNING)).toBeNull();
    expect(lotsOpeningAt('Preferred Garage', lotIds, WEEKDAY_MORNING)).toBeNull();
  });
});
