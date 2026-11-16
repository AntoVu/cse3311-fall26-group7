import { fridaySteps, PARKING_CROWDING_WINDOWS, PARKING_ESTIMATE_COLORS, type ParkingCrowdingWindow } from '@/constants/parking-crowding';
import { PARKING_LOT_IDS as L } from '@/constants/parking-permits';
import { estimatedParkingCrowding, parkingLotColor } from '@/routing/parking-crowding';

const monday = (hour: number, minute = 0) => new Date(2026, 10, 16, hour, minute);

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const WEEKDAYS = [16, 17, 18, 19, 20];

// Hour -> level across a weekday, sampled on the half hour so a step's start is always inside it.
function weekday(id: string) {
  return Object.fromEntries(Array.from({ length: 24 }, (_, h) => [h, estimatedParkingCrowding(id, at(16, h, 30))]));
}
function expectSteps(id: string, steps: [number, string][]) {
  const day = weekday(id);
  for (let h = 0; h < 24; h++) {
    const level = [...steps].reverse().find(([start]) => h >= start)![1];
    expect([id, h, day[h]]).toEqual([id, h, level]);
  }
}

describe("parking crowding estimates: Anthony's observations", () => {
  it.each([L.lot49, L.lot34, L.lot35])('%s: fills from 8, full 9 to 2, empties around 4', (id) => {
    expectSteps(id, [[0, 'low'], [8, 'moderate'], [9, 'heavy'], [14, 'moderate'], [16, 'low']]);
  });

  it.each([L.lot52, L.lot53, L.westCampusGarage])('%s: empty until 9, full 10 to 1, empties around 3', (id) => {
    expectSteps(id, [[0, 'low'], [9, 'moderate'], [10, 'heavy'], [13, 'moderate'], [15, 'low']]);
  });

  it('Lot 36: full 9 to 3, roomy from 5', () => {
    expectSteps(L.lot36, [[0, 'low'], [8, 'moderate'], [9, 'heavy'], [15, 'moderate'], [17, 'low']]);
  });

  it('Lot 36 Upgrade: a little crowded 1 to 3 only', () => {
    expectSteps(L.lot36Upgrade, [[0, 'low'], [13, 'moderate'], [15, 'low']]);
  });

  it.each([L.lot50, L.lot50North, L.lot50South, L.lot51, L.lot45, L.parkNorth, L.parkCentral, L.parkSouth])('%s: fills from 10, never full, roomy from 2', (id) => {
    expectSteps(id, [[0, 'low'], [10, 'moderate'], [14, 'low']]);
  });

  it.each([L.lot30, L.lotAO, L.lotUV, L.lotGR, L.lot29, L.lot25, L.lot26, L.lot27])('%s: far out, a little crowded 11 to 12 only', (id) => {
    expectSteps(id, [[0, 'low'], [11, 'moderate'], [12, 'low']]);
  });

  it('Lot 49 Upgrade: a little crowded 10 to 12 only', () => {
    expectSteps(L.lot49Upgrade, [[0, 'low'], [10, 'moderate'], [12, 'low']]);
  });

  it('applies on every weekday, and weekends are quiet', () => {
    for (const day of WEEKDAYS) expect(estimatedParkingCrowding(L.lot49, at(day, 11))).toBe('heavy');
    for (const day of [21, 22]) expect(estimatedParkingCrowding(L.lot49, at(day, 11))).toBe('low');
  });
});

describe('parking crowding estimates: lots nobody has watched', () => {
  it.each([L.lotF1, L.lotF10, L.lotF38, L.lot24, L.lot28, L.lot39])('staff lot %s: never full, some crowding 9 to 3', (id) => {
    expectSteps(id, [[0, 'low'], [9, 'moderate'], [15, 'low']]);
  });

  it.each([L.maverickGarage, L.lotCN, L.lotMR, L.centennialCourt, L.heightsOnPecan])('%s: empty until 9, full 11 to 1, roomy from 3', (id) => {
    expectSteps(id, [[0, 'low'], [9, 'moderate'], [11, 'heavy'], [13, 'moderate'], [15, 'low']]);
  });

  it.each(Object.values(L))('%s covers every minute of the week without gaps or overlaps', (id) => {
    const windows = PARKING_CROWDING_WINDOWS.filter((window) => window.lotId === id && window.days.includes(1));
    expect(windows[0].startMinute).toBe(0);
    expect(windows[windows.length - 1].endMinute).toBe(1440);
    windows.forEach((window, index) => {
      expect(window.endMinute).toBeGreaterThan(window.startMinute);
      if (index > 0) expect(window.startMinute).toBe(windows[index - 1].endMinute);
    });
    expect(estimatedParkingCrowding(id, at(21, 10))).toBe('low');
  });
});

describe('parking crowding estimates: lookups', () => {
  it('treats lots with no schedule as quiet', () => {
    expect(estimatedParkingCrowding('unidentified', monday(10))).toBe('low');
  });

  it.each(['low', 'moderate', 'heavy'] as const)('supports a %s observation', (level) => {
    const windows: ParkingCrowdingWindow[] = [{ lotId: L.lot35, days: [1], startMinute: 600, endMinute: 660, level }];
    expect(estimatedParkingCrowding(L.lot35, monday(10), windows)).toBe(level);
  });

  it('shows estimates only for permitted lots, with red taking priority', () => {
    expect(parkingLotColor('East Commuter', L.lot36, monday(10))).toBe(PARKING_ESTIMATE_COLORS.heavy);
    expect(parkingLotColor('West Commuter', L.lot36, monday(10))).toBe(PARKING_ESTIMATE_COLORS.restricted);
    expect(parkingLotColor('Remote Park & Ride', L.lot36, monday(10))).toBe(PARKING_ESTIMATE_COLORS.restricted);
    expect(parkingLotColor(null, L.lot36, monday(10))).toBe(PARKING_ESTIMATE_COLORS.restricted);
    expect(parkingLotColor('West Commuter', L.lot35, monday(10))).toBe(PARKING_ESTIMATE_COLORS.heavy);
    expect(parkingLotColor('West Commuter', L.lot30, monday(10))).toBe(PARKING_ESTIMATE_COLORS.low);
    expect(parkingLotColor('West Commuter', L.westCampusGarage, monday(10))).toBe(PARKING_ESTIMATE_COLORS.heavy);
    expect(parkingLotColor('South Commuter', L.lot45, monday(10))).toBe(PARKING_ESTIMATE_COLORS.moderate);
    expect(parkingLotColor('South Commuter', L.lot52, monday(11))).toBe(PARKING_ESTIMATE_COLORS.heavy);
    expect(parkingLotColor('East Commuter', L.parkSouth, monday(10))).toBe(PARKING_ESTIMATE_COLORS.moderate);
    expect(parkingLotColor('East Commuter', L.parkSouth, monday(9))).toBe(PARKING_ESTIMATE_COLORS.low);
    expect(parkingLotColor('West Commuter', L.parkSouth, monday(10))).toBe(PARKING_ESTIMATE_COLORS.restricted);
    expect(parkingLotColor('West Commuter', L.lot35, monday(7))).toBe(PARKING_ESTIMATE_COLORS.low);
    expect(parkingLotColor('West Commuter', L.lot35, new Date(2026, 10, 21, 10))).toBe(PARKING_ESTIMATE_COLORS.low);
    expect(parkingLotColor('West Commuter', 'unidentified', monday(10))).toBe(PARKING_ESTIMATE_COLORS.restricted);
  });
});

describe('parking crowding estimates: Fridays fill 30 minutes later and empty 30 minutes earlier', () => {
  const FRIDAY = 20; // 2026-11-20
  const level = (id: string, hour: number, minute = 0) => estimatedParkingCrowding(id, at(FRIDAY, hour, minute));

  it('shifts each change: Lot 49 fills at 8:30, is full 9:30 to 1:30, roomy from 3:30', () => {
    expect(fridaySteps([[0, 'low'], [8, 'moderate'], [9, 'heavy'], [14, 'moderate'], [16, 'low']])).toEqual([
      [0, 'low'], [510, 'moderate'], [570, 'heavy'], [810, 'moderate'], [930, 'low'],
    ]);
    expect([level(L.lot49, 8, 29), level(L.lot49, 8, 30), level(L.lot49, 9, 30), level(L.lot49, 13, 29), level(L.lot49, 13, 30), level(L.lot49, 15, 30)])
      .toEqual(['low', 'moderate', 'heavy', 'heavy', 'moderate', 'low']);
  });

  it('drops a phase squeezed to nothing: 30, AO and UV stay quiet all Friday', () => {
    expect(fridaySteps([[0, 'low'], [11, 'moderate'], [12, 'low']])).toEqual([[0, 'low']]);
    for (const id of [L.lot30, L.lotAO, L.lotUV]) {
      for (let h = 0; h < 24; h++) expect([id, h, level(id, h, 30)]).toEqual([id, h, 'low']);
    }
  });

  it('meets halfway when a squeezed phase sits between two different levels', () => {
    expect(fridaySteps([[0, 'low'], [11, 'heavy'], [12, 'moderate'], [15, 'low']])).toEqual([
      [0, 'low'], [690, 'moderate'], [870, 'low'],
    ]);
  });

  it('keeps a short phase that still has room: Upgrade 49 is crowded 10:30 to 11:30', () => {
    expect([level(L.lot49Upgrade, 10, 29), level(L.lot49Upgrade, 10, 30), level(L.lot49Upgrade, 11, 29), level(L.lot49Upgrade, 11, 30)])
      .toEqual(['low', 'moderate', 'moderate', 'low']);
  });

  it('leaves Monday to Thursday alone', () => {
    for (const day of [16, 17, 18, 19]) expect(estimatedParkingCrowding(L.lot49, at(day, 8, 15))).toBe('moderate');
    expect(level(L.lot49, 8, 15)).toBe('low');
  });
});
