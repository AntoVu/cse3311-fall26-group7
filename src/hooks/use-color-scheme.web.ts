import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Nothing to subscribe to: hydration happens once, so the value never changes
// after the first client render.
const subscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * useSyncExternalStore returns the server snapshot (false) during static render
 * and hydration, then the client snapshot (true) right after.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
