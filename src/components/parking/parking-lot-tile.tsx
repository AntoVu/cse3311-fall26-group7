import { Pressable, StyleSheet } from 'react-native';

import { PARKING_STATUS_COLORS } from '@/components/parking/lot-status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ParkingLot } from '@/mocks/parking';

type ParkingLotTileProps = {
  lot: ParkingLot;
  onPress: (lot: ParkingLot) => void;
};

export function ParkingLotTile({ lot, onPress }: ParkingLotTileProps) {
  return (
    <Pressable
      onPress={() => onPress(lot)}
      style={[styles.tile, { backgroundColor: PARKING_STATUS_COLORS[lot.status] }]}>
      <ThemedText type="smallBold" style={styles.label}>
        {lot.name}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '30%',
    minHeight: 72,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
  },
  // Tiles are colored backgrounds regardless of theme, so the label needs a
  // fixed, always-readable color rather than the theme's text color.
  label: {
    color: '#0B0B0C',
    textAlign: 'center',
  },
});
