import * as Location from 'expo-location';
import { useEffect } from 'react';

import { locationPermissionStore, setGpsLocation } from '@/state/user-location';

/**
 * Asks for foreground location once and then follows the device, writing fixes into
 * `userLocationStore`.
 *
 * Mounted once at the root rather than per screen, so permission is requested a single time
 * and every screen reads the same position. Every failure path ends in a permission state the
 * UI can explain -- a denied prompt, a device with location switched off, or a browser that
 * refuses geolocation outside HTTPS all land on 'denied'/'unavailable' rather than leaving
 * the app waiting for a fix that is never coming.
 *
 * To test without walking to campus: Android emulator > Extended controls > Location, or iOS
 * Simulator > Features > Location > Custom Location. On a real phone off campus, long-press
 * the map instead to drop a pin (see userLocationStore).
 */
export function useDeviceLocation() {
  useEffect(() => {
    // Jest has no location services, and asking would only produce noise in test output.
    if (process.env.NODE_ENV === 'test') return;

    let subscription: Location.LocationSubscription | null = null;
    let canceled = false;

    async function follow() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (canceled) return;

        if (status !== 'granted') {
          locationPermissionStore.set('denied');
          return;
        }
        locationPermissionStore.set('granted');

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            // Campus-scale: a new fix every 10 m is plenty, and polling harder costs battery.
            distanceInterval: 10,
            timeInterval: 5_000,
          },
          (position) => {
            setGpsLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
        );
      } catch {
        // Location services off, unsupported platform, or a browser blocking geolocation.
        if (!canceled) locationPermissionStore.set('unavailable');
      }
    }

    follow();

    return () => {
      canceled = true;
      subscription?.remove();
    };
  }, []);
}
