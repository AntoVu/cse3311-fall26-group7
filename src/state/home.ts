import { createStore, useStore } from '@/state/create-store';

/** Where the user lives (Settings > Your Profile > On-Campus Residence): a residence or apartment POI id. */
export const homeStore = createStore<string | null>(null);

export function useHome(): string | null {
  return useStore(homeStore);
}
