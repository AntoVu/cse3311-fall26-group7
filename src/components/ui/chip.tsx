import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A small pill button, highlighted when selected (day picker, Settings > Developer). */
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
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? theme.text : theme.backgroundElement },
        (pressed || disabled) && styles.dimmed,
      ]}>
      <ThemedText type="smallBold" style={selected && { color: theme.background }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.one + 2, borderRadius: 14 },
  dimmed: { opacity: 0.5 },
});
