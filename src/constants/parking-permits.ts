// Passes, grouped the way the pickers show them. Rules come from the PATS parking maps (2026-2027),
// MavPark's permit descriptions and UTA's Parking Finder (Modii), checked 2026-11-15.
export const PARKING_PERMIT_GROUPS = [
  { title: 'Student commuter', permits: ['West Commuter', 'East Commuter', 'South Commuter'] },
  { title: 'Student upgrade', permits: ['Student Upgrade Lot 36', 'Student Upgrade Lot 49', 'Preferred Garage'] },
  { title: 'Reduced rate and remote', permits: ['Reduced Rate', 'Remote Park & Ride'] },
  { title: 'Resident', permits: ['Resident West', 'Resident East', 'Resident South', 'Resident Dual'] },
  { title: 'Short-term and visitor', permits: ['Student Short-Term', 'Visitor', 'Visitor Garage'] },
  { title: 'Employee', permits: ['Faculty/Staff'] },
] as const;

export type ParkingPermit = (typeof PARKING_PERMIT_GROUPS)[number]['permits'][number];

export const PARKING_PERMITS: readonly ParkingPermit[] = PARKING_PERMIT_GROUPS.flatMap((group) => group.permits);

// Second line under a pass in the pickers, where the name alone doesn't say who it is for.
export const PARKING_PERMIT_DESCRIPTIONS: Partial<Record<ParkingPermit, string>> = {
  'Reduced Rate': 'Lot 29 and Greek Row Lot',
  'Remote Park & Ride': 'Lots 25, 26 and 27',
  'Resident West': 'Arbor Oaks, Timber Brook, Meadow Run, University Village, West Hall, Maverick Hall',
  'Resident East': 'Arlington Hall, Vandergriff Hall, KC Hall, The Lofts',
  'Resident South': 'Heights on Pecan, Centennial Court',
  'Resident Dual': 'Every resident zone plus the student commuter lots',
  'Student Short-Term': '1-, 7- or 30-day student lot permit',
  Visitor: 'Student lots: 1-day, 7-day, 30-day, semester or annual',
  'Visitor Garage': 'One day in West Campus, Maverick or College Park South Garage',
};

// "None" = the user has no permit; getParkingPermission treats that as null.
export const NO_PERMIT = 'None';
export type ParkingPermitChoice = ParkingPermit | typeof NO_PERMIT;
export const PARKING_PERMIT_CHOICES: readonly ParkingPermitChoice[] = [NO_PERMIT, ...PARKING_PERMITS];

// Saved choices from before the two reduced-rate passes were merged (2026-11-15).
const RENAMED_PERMITS: Record<string, ParkingPermit> = {
  'Reduced Rate Greek Row Lot': 'Reduced Rate',
  'Reduced Rate Lot 29': 'Reduced Rate',
};

/** A saved choice as a current one: renamed passes follow their new name, anything unknown is None. */
export function normalizePermitChoice(choice: string): ParkingPermitChoice {
  if (RENAMED_PERMITS[choice]) return RENAMED_PERMITS[choice];
  return (PARKING_PERMIT_CHOICES as readonly string[]).includes(choice) ? (choice as ParkingPermitChoice) : NO_PERMIT;
}

export function permitFromChoice(choice: ParkingPermitChoice): ParkingPermit | null {
  const normalized = normalizePermitChoice(choice);
  return normalized === NO_PERMIT ? null : normalized;
}

// Shown wherever the app says where a pass may park: the rules are our reading of PATS's maps, not official.
export const PARKING_DISCLAIMER =
  "These rules are our best reading of UTA's parking maps and may be out of date. Check UTA Parking & Transportation's official rules and the signs at the lot before you park.";

export const PARKING_COLORS = {
  allowed: '#22C55E',
  restricted: '#E5484D',
  timeRestricted: '#FACC15',
} as const;

// Ids match CAMPUS_LOTS where the lot is traced. The rest have rules but no footprint yet, so
// they paint nothing until someone traces them into src/data/campus-lots.ts with the same id.
export const PARKING_LOT_IDS = {
  lotF14: 'lot-f14',
  lot36: 'lot-36',
  lot36Upgrade: 'lot-36-upgrade',
  lot49Upgrade: 'lot-49-upgrade',
  lotF15: 'lot-f15',
  lotF12: 'lot-f12',
  lotF11: 'lot-f11',
  lotF38: 'lot-f38',
  parkNorth: 'lot-park-north',
  parkCentral: 'lot-park-central',
  parkSouth: 'lot-park-south',
  maverickGarage: 'lot-maverick-garage',
  lotF13: 'lot-f13',
  lotCN: 'lot-cn',
  lotCS: 'lot-cs',
  lotF10: 'lot-f10',
  // F lots and the numbered lots the employee map colors faculty/staff. F1, F4-F9 and F17 have no
  // PATS rule of their own; they get the same faculty rule as the others.
  lotF1: 'lot-f1',
  lotF4: 'lot-f4',
  lotF5: 'lot-f5',
  lotF6: 'lot-f6',
  lotF7: 'lot-f7',
  lotF8: 'lot-f8',
  lotF9: 'lot-f9',
  lotF17: 'lot-f17',
  lot24: 'lot-24',
  lot28: 'lot-28',
  lot39: 'lot-39',
  lot45: 'lot-45',
  // West commuter
  lot35: 'lot-35',
  lot34: 'lot-34',
  lot30: 'lot-30',
  lotAO: 'lot-ao',
  lotUV: 'lot-uv',
  westCampusGarage: 'lot-west-campus-garage',
  // South commuter (Lot 49 is the commuter lot, not Upgrade Lot 49)
  lot53: 'lot-53',
  lot52: 'lot-52',
  lot49: 'lot-49',
  lot50: 'lot-50',
  // The PATS map draws Lot 50 as two halves. Both carry Lot 50's rules; lot50 itself has no
  // outline, like the other untraced lots.
  lot50North: 'lot-50-north',
  lot50South: 'lot-50-south',
  lot51: 'lot-51',
  // Reduced rate
  lotGR: 'lot-gr',
  lot29: 'lot-29',
  // Remote park & ride
  lot25: 'lot-25',
  lot26: 'lot-26',
  lot27: 'lot-27',
  // Resident-only lots (resident parking map)
  lotMR: 'lot-meadow-run',
  lotWC: 'lot-west-campus',
  centennialCourt: 'lot-centennial-court',
  heightsOnPecan: 'lot-heights-on-pecan',
  kcResidentStrip: 'lot-kc-resident-strip',
} as const;

export type ParkingPermission = 'allowed' | 'restricted' | 'timeRestricted';

type LotKind =
  | 'westCommuter'
  | 'eastCommuter'
  | 'southCommuter'
  | 'upgrade36'
  | 'upgrade49'
  | 'maverickGarage'
  | 'reducedRate'
  | 'remote'
  | 'faculty'
  | 'residentWest'
  | 'residentEast'
  | 'residentSouth'
  // The three garages the one-day visitor garage permit names.
  | 'visitorGarage';

const L = PARKING_LOT_IDS;

// A lot can serve several passes: the College Park garages are East Commuter, faculty and (Central,
// South) resident east all at once.
const LOT_KINDS: Record<string, readonly LotKind[]> = {
  [L.lot35]: ['westCommuter'],
  [L.lot34]: ['westCommuter'],
  [L.lot30]: ['westCommuter'],
  // Mostly Resident West; only a strip along the south edge is commuter (see ITERATION_4_TODO).
  [L.lotAO]: ['westCommuter', 'residentWest'],
  [L.lotUV]: ['westCommuter', 'residentWest'],
  [L.westCampusGarage]: ['westCommuter', 'visitorGarage'],
  [L.lot36]: ['eastCommuter'],
  [L.parkNorth]: ['eastCommuter', 'faculty'],
  [L.parkCentral]: ['eastCommuter', 'faculty', 'residentEast'],
  [L.parkSouth]: ['eastCommuter', 'faculty', 'residentEast', 'visitorGarage'],
  [L.lot45]: ['southCommuter'],
  [L.lot53]: ['southCommuter'],
  [L.lot52]: ['southCommuter'],
  [L.lot49]: ['southCommuter'],
  [L.lot50]: ['southCommuter'],
  [L.lot50North]: ['southCommuter'],
  [L.lot50South]: ['southCommuter'],
  [L.lot51]: ['southCommuter'],
  [L.lot36Upgrade]: ['upgrade36'],
  [L.lot49Upgrade]: ['upgrade49'],
  [L.maverickGarage]: ['maverickGarage', 'visitorGarage'],
  [L.lotGR]: ['reducedRate'],
  [L.lot29]: ['reducedRate'],
  [L.lot25]: ['remote'],
  [L.lot26]: ['remote'],
  [L.lot27]: ['remote'],
  [L.lotF14]: ['faculty'],
  [L.lotF15]: ['faculty'],
  [L.lotF12]: ['faculty'],
  [L.lotF11]: ['faculty'],
  [L.lotF38]: ['faculty'],
  [L.lotF13]: ['faculty'],
  [L.lotF10]: ['faculty'],
  [L.lotF1]: ['faculty'],
  [L.lotF4]: ['faculty'],
  [L.lotF5]: ['faculty'],
  [L.lotF6]: ['faculty'],
  [L.lotF7]: ['faculty'],
  [L.lotF8]: ['faculty'],
  [L.lotF9]: ['faculty'],
  [L.lotF17]: ['faculty'],
  [L.lot24]: ['faculty'],
  [L.lot28]: ['faculty'],
  [L.lot39]: ['faculty'],
  [L.lotCN]: ['residentEast'],
  [L.lotCS]: ['residentEast'],
  [L.lotMR]: ['residentWest'],
  [L.lotWC]: ['residentWest'],
  [L.centennialCourt]: ['residentSouth'],
  [L.heightsOnPecan]: ['residentSouth'],
  [L.kcResidentStrip]: ['residentEast'],
};

const COMMUTER_KINDS: readonly LotKind[] = ['westCommuter', 'eastCommuter', 'southCommuter'];
const RESIDENT_KINDS: readonly LotKind[] = ['residentWest', 'residentEast', 'residentSouth'];

// What each pass may use all day.
const PERMIT_KINDS: Record<ParkingPermit, readonly LotKind[]> = {
  'West Commuter': ['westCommuter', 'reducedRate', 'remote'],
  'East Commuter': ['eastCommuter', 'reducedRate', 'remote'],
  'South Commuter': ['southCommuter', 'reducedRate', 'remote'],
  'Student Upgrade Lot 36': ['upgrade36', ...COMMUTER_KINDS, 'reducedRate', 'remote'],
  'Student Upgrade Lot 49': ['upgrade49', ...COMMUTER_KINDS, 'reducedRate', 'remote'],
  'Preferred Garage': ['maverickGarage', 'upgrade36', 'upgrade49', ...COMMUTER_KINDS, 'reducedRate', 'remote'],
  // MavPark ("29 and GR only") and Modii agree; the commuter map's legend also lists the remote lots.
  'Reduced Rate': ['reducedRate'],
  'Remote Park & Ride': ['remote'],
  'Resident West': ['residentWest', 'reducedRate', 'remote'],
  'Resident East': ['residentEast', 'reducedRate', 'remote'],
  'Resident South': ['residentSouth', 'reducedRate', 'remote'],
  'Resident Dual': [...RESIDENT_KINDS, ...COMMUTER_KINDS, 'reducedRate', 'remote'],
  'Student Short-Term': [...COMMUTER_KINDS],
  Visitor: [...COMMUTER_KINDS],
  'Visitor Garage': ['visitorGarage'],
  'Faculty/Staff': ['faculty', 'reducedRate', 'remote'],
};

// Weekday daytime only: lots a pass gets later in the day, and from what hour.
const OPENS_LATER: Partial<Record<ParkingPermit, { kinds: readonly LotKind[]; hour: number }>> = {
  'West Commuter': { kinds: COMMUTER_KINDS, hour: 13 },
  'East Commuter': { kinds: COMMUTER_KINDS, hour: 13 },
  'South Commuter': { kinds: COMMUTER_KINDS, hour: 13 },
  'Student Upgrade Lot 36': { kinds: ['upgrade49'], hour: 12 },
  'Student Upgrade Lot 49': { kinds: ['upgrade36'], hour: 12 },
};

// Lots that stay closed after hours to anyone without their own pass: Maverick Garage's preferred
// floors, and the apartment lots of Resident South (gray in the Parking Finder even on Sundays).
// A lot closes only if all its kinds are here, so the commuter garages that also take the visitor
// garage permit stay open.
const NEVER_AFTER_HOURS: readonly LotKind[] = ['maverickGarage', 'visitorGarage', 'residentSouth'];

const DAY_STARTS_AT_HOUR = 7;
const AFTER_HOURS_START_HOUR = 19;
// Visitor student-lot permits may use any surface lot from 5 PM.
const VISITOR_AFTER_HOURS_START_HOUR = 17;

function afterHoursStart(permit: ParkingPermit): number {
  return permit === 'Visitor' ? VISITOR_AFTER_HOURS_START_HOUR : AFTER_HOURS_START_HOUR;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Weekends, and weekdays before 7 AM and from 7 PM (5 PM for visitors).
function isAfterHours(permit: ParkingPermit, date: Date): boolean {
  const hour = date.getHours();
  return isWeekend(date) || hour < DAY_STARTS_AT_HOUR || hour >= afterHoursStart(permit);
}

function overlaps(a: readonly LotKind[], b: readonly LotKind[]): boolean {
  return a.some((kind) => b.includes(kind));
}

function closedAfterHours(kinds: readonly LotKind[]): boolean {
  return kinds.every((kind) => NEVER_AFTER_HOURS.includes(kind));
}

/** The hour a pass gets this lot later on a weekday, or null when it never does during the day. */
function opensLaterAt(permit: ParkingPermit, kinds: readonly LotKind[]): number | null {
  const later = OPENS_LATER[permit];
  return later && overlaps(kinds, later.kinds) ? later.hour : null;
}

/**
 * Whether the permit rules know this lot at all. A lot no pass covers (ADA, visitor pay lots,
 * apartments, unidentified OSM lots) is restricted for every pass, at every hour.
 */
export function hasParkingRule(lotId: string): boolean {
  return Object.prototype.hasOwnProperty.call(LOT_KINDS, lotId);
}

/**
 * How the given permit may use a lot right now, which is the color the Parking tab paints it.
 * Lots this doesn't know about come back 'restricted'; `null` (the "None" choice) restricts
 * everything. `timeRestricted` means the pass will be allowed there later today (1 PM for
 * commuters in other zones, 12 PM for the other upgrade lot). `now` defaults to the real clock.
 */
export function getParkingPermission(
  permit: ParkingPermit | null,
  lotId: string,
  now: Date = new Date()
): ParkingPermission {
  if (!permit) return 'restricted';

  const kinds = LOT_KINDS[lotId];
  if (!kinds) return 'restricted';

  if (overlaps(kinds, PERMIT_KINDS[permit])) return 'allowed';
  if (isAfterHours(permit, now)) return closedAfterHours(kinds) ? 'restricted' : 'allowed';

  const hour = opensLaterAt(permit, kinds);
  if (hour === null) return 'restricted';
  return now.getHours() >= hour ? 'allowed' : 'timeRestricted';
}

/** The hour yellow lots open to this pass today, or null if none of these lots is yellow now. */
export function lotsOpeningAt(permit: ParkingPermit | null, lotIds: string[], now: Date = new Date()): number | null {
  if (!permit) return null;
  const opening = lotIds.find((lotId) => getParkingPermission(permit, lotId, now) === 'timeRestricted');
  return opening ? opensLaterAt(permit, LOT_KINDS[opening]) : null;
}

/** "1 PM", "12 PM", "7 PM" for a whole hour of the day. */
export function formatHour(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}

/** One line for a lot's card: may this pass park here now, and if not, from when. */
export function lotStatus(permit: ParkingPermit | null, lotId: string, now: Date = new Date()): string {
  if (!permit) return 'Choose your pass to see if you can park here.';
  if (!hasParkingRule(lotId)) return 'None of the passes we know of can park here.';
  const permission = getParkingPermission(permit, lotId, now);
  if (permission === 'allowed') return 'Your pass can park here now.';
  if (permission === 'timeRestricted') {
    return `Your pass can park here from ${formatHour(opensLaterAt(permit, LOT_KINDS[lotId]) ?? 0)}.`;
  }
  if (closedAfterHours(LOT_KINDS[lotId])) return "Your pass can't park here.";
  return `Not with your pass until ${formatHour(afterHoursStart(permit))}.`;
}
