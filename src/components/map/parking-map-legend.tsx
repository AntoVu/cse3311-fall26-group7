import { StyleSheet, Text, View } from 'react-native';

import { PARKING_COLORS } from '@/constants/parking-permits';
import { useTheme } from '@/hooks/use-theme';

export function ParkingMapLegend() {
  const theme = useTheme();

  const items = [
    { color: PARKING_COLORS.allowed, label: 'Allowed' },
    { color: PARKING_COLORS.restricted, label: 'Not allowed' },
    { color: PARKING_COLORS.timeRestricted, label: 'Time-restricted' },
    { color: PARKING_COLORS.checkSigns, label: 'Check signs' },
    { color: theme.textSecondary, label: 'Building' },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElement },
      ]}
    >
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <View
            style={[
              styles.dot,
              { backgroundColor: item.color },
            ]}
          />
          <Text style={[styles.label, { color: theme.text }]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
    borderRadius: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  label: {
    fontSize: 11,
  },
});