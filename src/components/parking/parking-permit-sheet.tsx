import { StyleSheet } from 'react-native';

import { ParkingPermitOptions } from '@/components/parking/parking-permit-options';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Spacing } from '@/constants/theme';

type ParkingPermitSheetProps = {
  visible: boolean;
  onClose: () => void;
};

// Lets the Parking tab change the permit in place, the way the Schedule tab adds a class,
// instead of sending the user off to Settings. Same store either way, so the two stay in sync.
export function ParkingPermitSheet({ visible, onClose }: ParkingPermitSheetProps) {
  return (
    <BottomSheet visible={visible} title="Parking Permit" onClose={onClose}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
        Pick the permit you have, or None if you don&apos;t have one. The map colors lots by
        where it lets you park.
      </ThemedText>
      <ParkingPermitOptions />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  description: {
    marginBottom: Spacing.three,
  },
});
