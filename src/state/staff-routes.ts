import { createStore, useStore } from '@/state/create-store';

/** Staff with a keycard: routes may use doors marked staff-only (never ones marked no one). Off by default. */
export const staffRoutesStore = createStore<boolean>(false);

export function useStaffRoutes(): boolean {
  return useStore(staffRoutesStore);
}
