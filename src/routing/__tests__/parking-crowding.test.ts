import { PARKING_CROWDING_WINDOWS, PARKING_ESTIMATE_COLORS, type ParkingCrowdingWindow } from '@/constants/parking-crowding';
import { PARKING_LOT_IDS as L } from '@/constants/parking-permits';
import { estimatedParkingCrowding, parkingLotColor } from '@/routing/parking-crowding';

const monday = (hour: number, minute = 0) => new Date(2026, 10, 16, hour, minute);

describe('parking crowding estimates', () => {
  it.each([
    [L.lot36, 12], [L.lot34, 12], [L.lot49, 12], [L.lot52, 12],
    [L.westCampusGarage, 11], [L.lot45, 13], [L.parkSouth, 11],
  ] as const)('uses the weekday peak for %s ending at %s:00', (id, endHour) => {
    for (const day of [16, 17, 18, 19, 20]) {
      expect(estimatedParkingCrowding(id, new Date(2026, 10, day, 8, 59))).toBe('moderate');
      expect(estimatedParkingCrowding(id, new Date(2026, 10, day, 9))).toBe('heavy');
      expect(estimatedParkingCrowding(id, new Date(2026, 10, day, 10, 59))).toBe('heavy');
      expect(estimatedParkingCrowding(id, new Date(2026, 10, day, endHour - 1, 59))).toBe('heavy');
      for (const hour of [11, 12, 13]) {
        expect(estimatedParkingCrowding(id, new Date(2026, 10, day, hour))).toBe(hour < endHour ? 'heavy' : 'moderate');
      }
      expect(estimatedParkingCrowding(id, new Date(2026, 10, day, 23))).toBe('low');
    }
    expect(estimatedParkingCrowding(id, new Date(2026, 10, 21, 10))).toBe('unknown');
  });

  it.each(Object.values(L))('covers the full weekday baseline for %s without overlaps', (id) => {
    for (const day of [16, 17, 18, 19, 20]) {
      for (const [hour, minute, expected] of [
        [0, 0, 'low'], [7, 59, 'low'], [8, 0, 'moderate'],
        [16, 59, 'moderate'], [17, 0, 'low'], [23, 59, 'low'],
      ] as const) {
        expect(estimatedParkingCrowding(id, new Date(2026, 10, day, hour, minute))).toBe(expected);
      }
    }
    const windows = PARKING_CROWDING_WINDOWS.filter((window) => window.lotId === id);
    expect(windows[0].startMinute).toBe(0);
    expect(windows[windows.length - 1].endMinute).toBe(1440);
    windows.forEach((window, index) => {
      expect(window.endMinute).toBeGreaterThan(window.startMinute);
      if (index > 0) expect(window.startMinute).toBe(windows[index - 1].endMinute);
    });
    for (const day of [21, 22]) {
      expect(estimatedParkingCrowding(id, new Date(2026, 10, day, 10))).toBe('unknown');
    }
  });

  it.each([L.lot36Upgrade, L.lot49Upgrade, L.lot50North, L.lot50South, L.lot35, L.parkNorth, L.parkCentral])('keeps %s on the baseline at 10 AM', (id) => {
    expect(estimatedParkingCrowding(id, monday(10))).toBe('moderate');
  });

  it('keeps unrecognized lots unknown', () => {
    expect(estimatedParkingCrowding('unidentified', monday(10))).toBe('unknown');
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
    expect(parkingLotColor('West Commuter', L.lot35, monday(10))).toBe(PARKING_ESTIMATE_COLORS.moderate);
    expect(parkingLotColor('West Commuter', L.westCampusGarage, monday(10))).toBe(PARKING_ESTIMATE_COLORS.heavy);
    expect(parkingLotColor('South Commuter', L.lot45, monday(10))).toBe(PARKING_ESTIMATE_COLORS.heavy);
    expect(parkingLotColor('East Commuter', L.parkSouth, monday(10))).toBe(PARKING_ESTIMATE_COLORS.heavy);
    expect(parkingLotColor('West Commuter', L.parkSouth, monday(10))).toBe(PARKING_ESTIMATE_COLORS.restricted);
    expect(parkingLotColor('West Commuter', L.lot35, monday(7))).toBe(PARKING_ESTIMATE_COLORS.low);
    expect(parkingLotColor('West Commuter', L.lot35, new Date(2026, 10, 21, 10))).toBe('#A855F7');
    expect(parkingLotColor('West Commuter', 'unidentified', monday(10))).toBe(PARKING_ESTIMATE_COLORS.restricted);
  });
});
