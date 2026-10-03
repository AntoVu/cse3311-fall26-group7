import { useSyncExternalStore } from 'react';

// Nothing to subscribe to: hydration happens once, so this never changes afterwards.
const subscribe = () => () => {};

/**
 * False while the web build's pre-rendered HTML is being rendered or hydrated, true after.
 * Always true on native, which has no pre-rendering. Anything that depends on the device (its
 * color scheme, the clock) must render the same as the build did until this turns true, or
 * React throws the page away with a hydration mismatch.
 */
export function useHasHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
