import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemePreference } from '@/state/theme-preference';

// The device's scheme, unless the user picked Light or Dark in Settings > Theme.
export function useColorScheme() {
  const system = useSystemColorScheme();
  const preference = useThemePreference();

  return preference === 'system' ? system : preference;
}
