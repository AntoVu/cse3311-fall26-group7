import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ParkingLotStatus } from '@/mocks/parking';

// Same color language as the wireframe's parking legend.
export const PARKING_STATUS_COLORS: Record<ParkingLotStatus, string> = {
  available: '#3C87F7',
  scattered: '#2FB380',
  almostFull: '#E0B400',
  notAllowed: '#E0524D',
};

export const PARKING_STATUS_LABELS: Record<ParkingLotStatus, string> = {
  available: 'Lots of parking available',
  scattered: 'Scattered parking',
  almostFull: 'Almost certainly full',
  notAllowed: 'Not allowed for permit',
};

type LotStatusBadgeProps = {
  status: ParkingLotStatus;
};

export function LotStatusBadge({ status }: LotStatusBadgeProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: PARKING_STATUS_COLORS[status] }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {PARKING_STATUS_LABELS[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
