import { createStore, useStore } from '@/state/create-store';
import { NO_PERMIT, type ParkingPermitChoice } from '@/constants/parking-permits';

// The permit picked in Settings > Your Profile > Parking Permit. The Parking tab reads it.
export const parkingPermitStore = createStore<ParkingPermitChoice>(NO_PERMIT);

export function useSelectedParkingPermit(): ParkingPermitChoice {
  return useStore(parkingPermitStore);
}
