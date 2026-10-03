import { useColorScheme as useRNColorScheme } from 'react-native';

import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { useThemePreference } from '@/state/theme-preference';

/**
 * Web version: static rendering has no scheme to read, so fall back to light until the client
 * has hydrated. Otherwise the same as the native hook: the Settings > Theme override wins over
 * the device.
 */
export function useColorScheme() {
  const hasHydrated = useHasHydrated();
  const systemScheme = useRNColorScheme();
  const preference = useThemePreference();

  if (hasHydrated) {
    return preference === 'system' ? systemScheme : preference;
  }

  return 'light';
}
