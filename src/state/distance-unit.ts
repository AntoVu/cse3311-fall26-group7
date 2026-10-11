import { createStore, useStore } from '@/state/create-store';

export type DistanceUnit = 'imperial' | 'metric';

export const distanceUnitStore = createStore<DistanceUnit>('imperial');

export function useDistanceUnit(): DistanceUnit {
  return useStore(distanceUnitStore);
}
