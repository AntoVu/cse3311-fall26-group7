import {
  PARKING_CROWDING_WINDOWS,
  PARKING_ESTIMATE_COLORS,
  type ParkingCrowding,
  type ParkingCrowdingWindow,
} from '@/constants/parking-crowding';
import { getParkingPermission, type ParkingPermit } from '@/constants/parking-permits';

/** Weekday/time-window matching follows High Foot Traffic; end times are exclusive. */
export function estimatedParkingCrowding(
  lotId: string,
  now: Date,
  windows: readonly ParkingCrowdingWindow[] = PARKING_CROWDING_WINDOWS
): ParkingCrowding {
  const minute = now.getHours() * 60 + now.getMinutes();
  return windows.find((window) =>
    window.lotId === lotId && window.days.includes(now.getDay()) &&
    minute >= window.startMinute && minute < window.endMinute
  // Every known lot has a window for every minute of the week; anything else counts as quiet.
  )?.level ?? 'low';
}

export function parkingLotColor(permit: ParkingPermit | null, lotId: string, now: Date): string {
  // Restrictions, including a lot opening later today and lots no pass covers, override estimates.
  if (getParkingPermission(permit, lotId, now) !== 'allowed') return PARKING_ESTIMATE_COLORS.restricted;
  return PARKING_ESTIMATE_COLORS[estimatedParkingCrowding(lotId, now)];
}
