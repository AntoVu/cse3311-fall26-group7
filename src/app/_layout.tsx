import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ScheduleProvider } from '@/context/schedule-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { startPointStore } from '@/state/start-point';
import { themePreferenceStore } from '@/state/theme-preference';
import { parkingPermitStore } from '@/state/parking-permit';
import { distanceUnitStore } from '@/state/distance-unit';
import { persist } from '@/state/persist';
import { timeFormatStore } from '@/state/time-format';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const hasHydrated = useHasHydrated();

  useEffect(() => {
    if (!hasHydrated) return;

    const cleanupParkingPermit = persist(parkingPermitStore, 'parkingPermit');
    const cleanupTheme = persist(themePreferenceStore, 'themePreference');
    const cleanupStartPoint = persist(startPointStore, 'startPoint');
    const cleanupDistanceUnit = persist(distanceUnitStore, 'distanceUnit');
    const cleanupTimeFormat = persist(timeFormatStore, 'timeFormat');

    return () => {
      cleanupParkingPermit();
      cleanupTheme();
      cleanupStartPoint();
      cleanupDistanceUnit();
      cleanupTimeFormat();
    };
  }, [hasHydrated]);
  // Mounted once here so permission is asked for a single time and every screen shares the fix.
  useDeviceLocation();
  return (
    // Required by react-native-gesture-handler (used by the Map tab's pan/zoom)
    // on Android and web; harmless everywhere else.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ScheduleProvider>
          <AnimatedSplashOverlay />
          <AppTabs />
        </ScheduleProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
