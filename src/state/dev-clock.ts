import { createStore, useStore } from '@/state/create-store';

/**
 * Settings > Developer's simulated clock: minutes added to the real time everywhere the app asks
 * ScheduleProvider for `currentTime`. Starts at 0 so the static build and hydration agree.
 */
export const clockOffsetStore = createStore(0);

export function useClockOffset(): number {
  return useStore(clockOffsetStore);
}

export function setClockOffset(minutes: number) {
  clockOffsetStore.set(minutes);
}
