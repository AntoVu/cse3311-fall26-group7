import { Appearance } from 'react-native';

import { createStore, useStore } from '@/state/create-store';

export type ThemePreference = 'system' | 'light' | 'dark';

// 'system' follows the device's light/dark mode; 'light'/'dark' override it.
export const themePreferenceStore = createStore<ThemePreference>('system');

export function useThemePreference(): ThemePreference {
  return useStore(themePreferenceStore);
}

export function setThemePreference(preference: ThemePreference) {
  themePreferenceStore.set(preference);

  // Also switch native chrome (keyboard, alerts, native tab bar). react-native-web has
  // no Appearance.setColorScheme; there the useColorScheme hook applies the override.
  if (typeof Appearance.setColorScheme === 'function') {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }
}
