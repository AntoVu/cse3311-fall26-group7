import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OptionRow } from '@/components/ui/option-row';
import {
  NO_PERMIT,
  PARKING_DISCLAIMER,
  PARKING_PERMIT_DESCRIPTIONS,
  PARKING_PERMIT_GROUPS,
} from '@/constants/parking-permits';
import { Spacing } from '@/constants/theme';
import { parkingPermitStore, useSelectedParkingPermit } from '@/state/parking-permit';

// The permit list, grouped by pass type and bound straight to parkingPermitStore. Shown both in
// Settings > Your Profile > Parking Permit and in the Parking tab's sheet; because both
// render this, a pick in one place is already the pick in the other.
export function ParkingPermitOptions() {
  const selectedPermit = useSelectedParkingPermit();

  return (
    <>
      <OptionRow
        label={NO_PERMIT}
        selected={selectedPermit === NO_PERMIT}
        onPress={() => parkingPermitStore.set(NO_PERMIT)}
      />
      {PARKING_PERMIT_GROUPS.map((group) => (
        <PermitGroup key={group.title} title={group.title}>
          {group.permits.map((permit) => (
            <OptionRow
              key={permit}
              label={permit}
              description={PARKING_PERMIT_DESCRIPTIONS[permit]}
              selected={selectedPermit === permit}
              onPress={() => parkingPermitStore.set(permit)}
            />
          ))}
        </PermitGroup>
      ))}
      <ThemedText type="small" themeColor="textSecondary" style={styles.heading}>
        {PARKING_DISCLAIMER}
      </ThemedText>
    </>
  );
}

function PermitGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.heading}>
        {title}
      </ThemedText>
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: Spacing.three,
  },
});
