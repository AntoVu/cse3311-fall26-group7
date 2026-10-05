import { createStore, useStore } from '@/state/create-store';
import type { Coordinate } from '@/types/map';

/**
 * The user's position, from the device or dropped by hand.
 *
 * `pinned` exists because the team cannot always be on campus to test: long-pressing the map
 * sets a position the same way a GPS fix would, so the snapping and routing paths get
 * exercised from a desk. (An emulator's custom-location control does the same for real GPS.)
 * A pin wins until it is cleared, so a device fix cannot yank the map away mid-test.
 */
export type UserLocationSource = 'gps' | 'pinned';

export type UserLocation = {
  coordinate: Coordinate;
  source: UserLocationSource;
};

export type LocationPermission = 'unknown' | 'granted' | 'denied' | 'unavailable';

export const userLocationStore = createStore<UserLocation | null>(null);
export const locationPermissionStore = createStore<LocationPermission>('unknown');

export function useUserLocation(): UserLocation | null {
  return useStore(userLocationStore);
}

export function useLocationPermission(): LocationPermission {
  return useStore(locationPermissionStore);
}

/** Records a fix from the device, unless a hand-dropped pin is standing in for one. */
export function setGpsLocation(coordinate: Coordinate) {
  if (userLocationStore.get()?.source === 'pinned') return;
  userLocationStore.set({ coordinate, source: 'gps' });
}

export function setPinnedLocation(coordinate: Coordinate) {
  userLocationStore.set({ coordinate, source: 'pinned' });
}

export function clearPinnedLocation() {
  if (userLocationStore.get()?.source !== 'pinned') return;
  userLocationStore.set(null);
}
