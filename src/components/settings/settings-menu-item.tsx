import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { RIPPLE } from '@/components/ui/ripple';

type SettingsMenuItemProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Red text, for a row that deletes something. */
  danger?: boolean;
};

// disabled=true renders a dimmed, non-interactive row rather than faking a
// destination screen — the wireframe names these but nothing behind them is
// built yet (Iteration 2+), and a dead-end "coming soon" page isn't clearer
// than an honestly-disabled row.
export function SettingsMenuItem({ label, onPress, disabled, danger }: SettingsMenuItemProps) {
  return (
    <Pressable {...RIPPLE} accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.button, disabled && styles.disabled]}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText themeColor={disabled ? 'textSecondary' : danger ? 'danger' : 'text'}>{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The row's rounding, so the press ripple has the same corners.
  button: { borderRadius: Spacing.two },
  row: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  disabled: {
    opacity: 0.6,
  },
});
