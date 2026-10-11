import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { overlaySurface } from '@/components/map/map-legend';
import { ThemedText } from '@/components/themed-text';
import { ROUTE_COLORS } from '@/constants/routing';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FloorPickerProps = {
  /** Bottom to top, as buildingLevels returns them. */
  levels: string[];
  selected: string;
  onSelect: (level: string) => void;
  /** Where it sits; by default the top right corner. */
  style?: StyleProp<ViewStyle>;
};

/**
 * A column of floor buttons floating at the map's right edge, top floor first like an elevator
 * panel. Place it inside a positioned parent over the map.
 */
export function FloorPicker({ levels, selected, onSelect, style }: FloorPickerProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Floor"
      style={[styles.column, overlaySurface(theme.backgroundElement), style]}>
      {[...levels].reverse().map((level) => {
        const isSelected = level === selected;
        return (
          <Pressable
            key={level}
            accessibilityRole="radio"
            accessibilityLabel={level === 'B' ? 'Basement' : `Floor ${level}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(level)}
            style={[styles.button, isSelected && { backgroundColor: ROUTE_COLORS.line }]}>
            <ThemedText type="smallBold" style={isSelected ? styles.selectedText : undefined}>
              {level}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    borderRadius: 20,
    padding: 2,
    gap: 2,
  },
  button: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  selectedText: { color: '#fff' },
});
