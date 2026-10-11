import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from '@/context/schedule-context';
import { Spacing } from '@/constants/theme';

/** Sunday to Saturday as chips. `selected` holds weekday numbers (0 = Sunday). */
export function DayPicker({
  selected,
  onToggle,
  label,
}: {
  selected: number[];
  onToggle: (day: number) => void;
  label: string;
}) {
  return (
    <View accessibilityLabel={label} style={styles.row}>
      {WEEKDAY_SHORT.map((short, day) => (
        <Chip
          key={day}
          label={short}
          accessibilityLabel={WEEKDAY_NAMES[day]}
          selected={selected.includes(day)}
          onPress={() => onToggle(day)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
});
