import {
  clearPinnedLocation,
  locationPermissionStore,
  setGpsLocation,
  setPinnedLocation,
  userLocationStore,
} from '@/state/user-location';

const HERE = { lat: 32.7324, lng: -97.1138 };
const THERE = { lat: 32.7296, lng: -97.1129 };

beforeEach(() => {
  userLocationStore.set(null);
  locationPermissionStore.set('unknown');
});

describe('userLocationStore', () => {
  it('starts with no position and no answer on permission', () => {
    expect(userLocationStore.get()).toBeNull();
    expect(locationPermissionStore.get()).toBe('unknown');
  });

  it('records a device fix', () => {
    setGpsLocation(HERE);
    expect(userLocationStore.get()).toEqual({ coordinate: HERE, source: 'gps' });
  });

  it('records a dropped pin', () => {
    setPinnedLocation(HERE);
    expect(userLocationStore.get()).toEqual({ coordinate: HERE, source: 'pinned' });
  });

  // Otherwise a device fix arriving mid-test would drag the map off the pin being tested.
  it('lets a dropped pin outrank later device fixes', () => {
    setPinnedLocation(HERE);
    setGpsLocation(THERE);
    expect(userLocationStore.get()).toEqual({ coordinate: HERE, source: 'pinned' });
  });

  it('goes back to the device once the pin is cleared', () => {
    setPinnedLocation(HERE);
    clearPinnedLocation();
    expect(userLocationStore.get()).toBeNull();
    setGpsLocation(THERE);
    expect(userLocationStore.get()).toEqual({ coordinate: THERE, source: 'gps' });
  });

  it('leaves a device fix alone when asked to clear a pin', () => {
    setGpsLocation(THERE);
    clearPinnedLocation();
    expect(userLocationStore.get()).toEqual({ coordinate: THERE, source: 'gps' });
  });
});
