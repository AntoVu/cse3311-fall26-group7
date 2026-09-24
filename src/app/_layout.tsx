import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ScheduleProvider } from '@/context/schedule-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDeviceLocation } from '@/hooks/use-device-location';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
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
