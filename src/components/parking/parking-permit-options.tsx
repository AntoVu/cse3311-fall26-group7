import { OptionRow } from '@/components/ui/option-row';
import { PARKING_PERMIT_CHOICES } from '@/constants/parking-permits';
import { parkingPermitStore, useSelectedParkingPermit } from '@/state/parking-permit';

// The permit list, bound straight to parkingPermitStore. Shown both in
// Settings > Your Profile > Parking Permit and in the Parking tab's sheet; because both
// render this, a pick in one place is already the pick in the other.
export function ParkingPermitOptions() {
  const selectedPermit = useSelectedParkingPermit();

  return (
    <>
      {PARKING_PERMIT_CHOICES.map((permit) => (
        <OptionRow
          key={permit}
          label={permit}
          selected={selectedPermit === permit}
          onPress={() => parkingPermitStore.set(permit)}
        />
      ))}
    </>
  );
}
