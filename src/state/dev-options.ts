import { createStore, useStore } from '@/state/create-store';

// Settings > Developer: temporary switches for trying things out on a real phone. Session-only
// on purpose, and the default is fixed so the static pre-render and the first client render agree.

/** Which arrangement of buttons, cards and legend floats over the Map and Parking tabs. */
export type OverlayLayout = 'current' | 'compact' | 'floating' | 'drawer' | 'buttons';

export const overlayLayoutStore = createStore<OverlayLayout>('current');

export function useOverlayLayout(): OverlayLayout {
  return useStore(overlayLayoutStore);
}

export function setOverlayLayout(layout: OverlayLayout) {
  overlayLayoutStore.set(layout);
}
