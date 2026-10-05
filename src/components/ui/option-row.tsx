import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type OptionRowProps = {
  label: string;
  /** Second line under the label, e.g. "Example: 2:30 PM". */
  description?: string;
  selected: boolean;
  onPress: () => void;
};

// One pick-one-of-many row: highlighted and check-marked when selected. Shared by every
// settings list (Theme, Time Standard, Measurement Units, Parking Permit) and the Parking
// tab's permit sheet, so they all look and behave the same.
export function OptionRow({ label, description, selected, onPress }: OptionRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}>
      <ThemedView
        type={selected ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.option}>
        <View style={styles.row}>
          <View style={styles.labels}>
            <ThemedText type="smallBold">{label}</ThemedText>
            {description ? (
              <ThemedText type="small" themeColor="textSecondary">
                {description}
              </ThemedText>
            ) : null}
          </View>
          {selected ? <ThemedText style={styles.checkmark}>✓</ThemedText> : null}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  labels: {
    flex: 1,
  },
  checkmark: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});
