import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { createStore, useStore } from '@/state/create-store';
import { persist } from '@/state/persist';

/** The one-time tips, each shown where its feature is (see components/onboarding/tip.tsx). */
export type TipId = 'map' | 'route-start' | 'building-inside' | 'parking';

type Onboarding = { welcomed: boolean; tipsSeen: TipId[] };

/** First-run guidance: whether the welcome was finished or skipped, and which tips were dismissed. */
export const onboardingStore = createStore<Onboarding>({ welcomed: false, tipsSeen: [] });

// Loaded right away rather than after hydration like the other settings (_layout.tsx): nothing
// here shows until the app has hydrated, so the build's HTML can't differ, and loading late would
// flash the welcome at someone who has already seen it.
persist(onboardingStore, 'onboarding');

export function finishWelcome() {
  onboardingStore.set({ ...onboardingStore.get(), welcomed: true });
}

export function dismissTip(id: TipId) {
  const current = onboardingStore.get();
  if (!current.tipsSeen.includes(id)) onboardingStore.set({ ...current, tipsSeen: [...current.tipsSeen, id] });
}

/** Settings > How to use Mavigator: the welcome and every tip again. */
export function replayOnboarding() {
  onboardingStore.set({ welcomed: false, tipsSeen: [] });
}

/** Whether the welcome shows now: after hydration, until finished or skipped. */
export function useShowWelcome(): boolean {
  const hasHydrated = useHasHydrated();
  const { welcomed } = useStore(onboardingStore);
  return hasHydrated && !welcomed;
}

/** Whether a tip shows now: after the welcome, until dismissed. */
export function useShowTip(id: TipId): boolean {
  const hasHydrated = useHasHydrated();
  const { welcomed, tipsSeen } = useStore(onboardingStore);
  return hasHydrated && welcomed && !tipsSeen.includes(id);
}
