import { createStore, useStore } from '@/state/create-store';

/** "Avoid crowds" (UC-04): routes detour around busy places at busy times. Off by default. */
export const avoidCrowdsStore = createStore<boolean>(false);

export function useAvoidCrowds(): boolean {
  return useStore(avoidCrowdsStore);
}
