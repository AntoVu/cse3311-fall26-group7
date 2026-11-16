import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A small outlined pill button, filled when selected: days, report kinds, Avoid crowds, Go around/Keep,
 * Settings > Developer. Same look as the building card's buttons.
 */
export function Chip({
  label,
  selected = false,
  disabled = false,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: theme.text, backgroundColor: selected ? theme.text : 'transparent' },
        disabled && styles.dimmed,
      ]}>
      <ThemedText type="smallBold" style={selected && { color: theme.background }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1.5, paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.one + 1, borderRadius: 16 },
  dimmed: { opacity: 0.5 },
});
