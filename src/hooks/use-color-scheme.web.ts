import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemePreference } from '@/state/theme-preference';

// Nothing to subscribe to: hydration happens once, so this never changes afterwards.
const subscribe = () => () => {};

/**
 * Web version: static rendering has no scheme to read, so fall back to light until the client
 * has hydrated (useSyncExternalStore returns the server snapshot, false, until then).
 * Otherwise the same as the native hook: the Settings > Theme override wins over the device.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const systemScheme = useRNColorScheme();
  const preference = useThemePreference();

  if (hasHydrated) {
    return preference === 'system' ? systemScheme : preference;
  }

  return 'light';
}
